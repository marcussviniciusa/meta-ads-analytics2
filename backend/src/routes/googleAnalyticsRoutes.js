const express = require('express');
const GoogleAnalyticsService = require('../services/googleAnalyticsService');
const { authMiddleware } = require('../middleware/authMiddleware');

module.exports = function(redisClient, pgPool) {
  const router = express.Router();
  const googleAnalyticsService = new GoogleAnalyticsService(pgPool, redisClient);

  // Obter URL de autenticação
  router.get('/auth-url', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId; 
      const userRole = req.user.role;
      const authUrl = googleAnalyticsService.getAuthUrl(userId, userRole);
      res.json({ url: authUrl });
    } catch (error) {
      console.error('Erro ao gerar URL de autenticação:', error);
      res.status(500).json({ error: 'Erro ao gerar URL de autenticação' });
    }
  });

  // Callback da autenticação Google
  router.get('/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ error: 'Parâmetros inválidos' });
      }
      
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      
      const result = await googleAnalyticsService.handleCallback(code, stateData);
      
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

  // Verificar status da conexão
  router.get('/status', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId; 
      const userRole = req.user.role;
      const status = await googleAnalyticsService.checkConnectionStatus(userId, userRole);
      res.json(status);
    } catch (error) {
      console.error('Erro ao verificar status da conexão:', error);
      res.status(500).json({ error: 'Erro ao verificar status da conexão' });
    }
  });

  // Obter propriedades do GA4
  router.get('/properties', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId; 
      const userRole = req.user.role;
      const properties = await googleAnalyticsService.getProperties(userId, userRole);
      res.json(properties);
    } catch (error) {
      console.error('Erro ao obter propriedades do GA4:', error);
      res.status(500).json({ error: 'Erro ao obter propriedades do GA4' });
    }
  });

  // Obter relatório do GA4
  router.post('/report', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { propertyId, reportConfig, startDate, endDate, dimensions, metrics, dimensionFilters } = req.body;
      
      // Suporte para formato simplificado enviado pelo frontend
      if (propertyId && (startDate || endDate || dimensions || metrics)) {
        // Construir o objeto reportConfig no formato que a API do GA4 espera
        const formattedReportConfig = {
          dateRanges: [
            {
              startDate: startDate || 'yesterday',
              endDate: endDate || 'today'
            }
          ],
          dimensions: dimensions ? dimensions.map(dim => ({ name: dim })) : [],
          metrics: metrics ? metrics.map(metric => ({ name: metric })) : []
        };
        
        // Adicionar filtros, se fornecidos
        if (dimensionFilters && Object.keys(dimensionFilters).length > 0) {
          formattedReportConfig.dimensionFilter = {
            andGroup: {
              expressions: Object.entries(dimensionFilters).map(([dimension, value]) => ({
                filter: {
                  fieldName: dimension,
                  stringFilter: {
                    matchType: 'EXACT',
                    value: value
                  }
                }
              }))
            }
          };
        }
        
        console.log('Solicitação de relatório reformatada:', JSON.stringify(formattedReportConfig, null, 2));
        const report = await googleAnalyticsService.getReport(userId, propertyId, formattedReportConfig, userRole);
        return res.json(report);
      } 
      // Formato original com reportConfig completo
      else if (propertyId && reportConfig) {
        const report = await googleAnalyticsService.getReport(userId, propertyId, reportConfig, userRole);
        return res.json(report);
      }
      else {
        return res.status(400).json({ error: 'Parâmetros inválidos: propertyId e reportConfig ou (startDate, endDate, dimensions, metrics) são obrigatórios' });
      }
    } catch (error) {
      console.error('Erro ao obter relatório do GA4:', error);
      
      // Verificar se é erro de permissão
      if (error.message && error.message.includes('não tem permissão')) {
        return res.status(403).json({ 
          error: 'permission_denied', 
          message: error.message 
        });
      }
      
      res.status(500).json({ error: 'Erro ao obter relatório do GA4' });
    }
  });

  // Desconectar Google Analytics
  router.post('/disconnect', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId; 
      const userRole = req.user.role;
      const result = await googleAnalyticsService.disconnect(userId, userRole);
      res.json(result);
    } catch (error) {
      console.error('Erro ao desconectar Google Analytics:', error);
      res.status(500).json({ error: 'Erro ao desconectar Google Analytics' });
    }
  });

  return router;
};
