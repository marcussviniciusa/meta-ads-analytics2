const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const Redis = require('ioredis');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adAccountRoutes = require('./routes/adAccountRoutes');
const reportRoutes = require('./routes/reportRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const googleAnalyticsRoutes = require('./routes/googleAnalyticsRoutes');
const companyRoutes = require('./routes/companyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const permissionRoutes = require('./routes/permissionRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorMiddleware');
const { authMiddleware } = require('./middleware/authMiddleware');
const { ensureSuperAdminExists } = require('./middleware/ensureSuperAdmin');

// Import controllers
const CompanyController = require('./controllers/companyController');

// Import services
const PermissionService = require('./services/permissionService');

// Initialize database connections
const pgConfig = {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
};

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
};

// Create database connections
const pgPool = new Pool(pgConfig);
const redisClient = new Redis(redisConfig);

// Verify database connections
(async () => {
  try {
    // Test PostgreSQL connection
    const pgClient = await pgPool.connect();
    console.log('PostgreSQL connected');
    pgClient.release();

    // Test Redis connection
    await redisClient.ping();
    console.log('Redis connected');
    
    // Garantir que existe um super admin
    await ensureSuperAdminExists(pgPool);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
})();

// Initialize Express app
const app = express();

// Adicionar rota para favicon.ico para evitar erro 404
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// Aplicar CORS antes do Helmet para evitar sobrescrever os cabeçalhos CORS
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (como apps móveis ou curl)
    if (!origin) return callback(null, true);
    callback(null, origin); // Retornar a origem específica na resposta
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Migration-Key'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Aplicar Helmet após o CORS, com configurações que não interferem no CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: false // Desabilitar CSP para evitar conflitos
}));

app.use(express.json());

// Initialize controllers
const companyController = new CompanyController(pgPool);

// Routes
app.use('/api/auth', authRoutes(redisClient, pgPool));
app.use('/api/integrations', authMiddleware, integrationRoutes(redisClient, pgPool));
app.use('/api/integrations/google-analytics', authMiddleware, googleAnalyticsRoutes(redisClient, pgPool));

// Aplicar middleware de autenticação nas rotas de empresas
app.use('/api/companies', authMiddleware);

// Registrar rotas de empresas no app
companyRoutes(app, companyController);

// Registrar rotas de administração
adminRoutes(app, pgPool);

// Rota especial para o callback do Google Analytics sem autenticação
const GoogleAnalyticsService = require('./services/googleAnalyticsService');
const googleAnalyticsService = new GoogleAnalyticsService(pgPool, redisClient);

app.get('/api/google-analytics/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }
    
    console.log('Recebido callback do Google Analytics:', { code, state });
    
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    console.log('Dados do estado decodificado:', stateData);
    
    const result = await googleAnalyticsService.handleCallback(code, stateData.userId);
    
    if (result.success) {
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?integration=google-analytics&status=success`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?integration=google-analytics&status=error&message=${encodeURIComponent(result.error || 'Erro desconhecido')}`);
    }
  } catch (error) {
    console.error('Erro no callback do Google Analytics:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?integration=google-analytics&status=error&message=${encodeURIComponent(error.message)}`);
  }
});

app.use('/api/ad-accounts', authMiddleware, adAccountRoutes(redisClient, pgPool));
app.use('/api/reports', authMiddleware, reportRoutes(redisClient, pgPool));
app.use('/api/permissions', authMiddleware, permissionRoutes(pgPool));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Recurso não encontrado', path: req.path });
});

// Global error handler
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
