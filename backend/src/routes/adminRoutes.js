const express = require('express');
const router = express.Router();
const { ensureSuperAdminExists } = require('../middleware/ensureSuperAdmin');

/**
 * Rotas para administração do sistema
 * @param {Object} app - Express app
 * @param {Object} pgPool - Pool de conexão PostgreSQL
 */
module.exports = function(app, pgPool) {
  // Rota base para administração
  const adminRouter = express.Router();
  app.use('/api/admin', adminRouter);
  
  // Rota especial para forçar a criação do super admin (protegida por chave secreta)
  adminRouter.post('/ensure-super-admin', async (req, res) => {
    try {
      const secretKey = req.headers['x-admin-key'];
      const expectedKey = process.env.MIGRATION_SECRET_KEY || 'speedfunnels_migration_2025';
      
      console.log('Recebida chave de administração:', secretKey);
      console.log('Chave esperada:', expectedKey);
      
      // Verificar chave secreta
      if (secretKey !== expectedKey) {
        return res.status(401).json({ 
          success: false, 
          message: 'Chave de administração inválida',
          receivedKey: secretKey ? '[chave fornecida]' : '[sem chave]',
          keyMatch: false
        });
      }
      
      // Forçar a criação do super admin
      await ensureSuperAdminExists(pgPool);
      
      res.status(200).json({ 
        success: true, 
        message: 'Verificação/criação de super admin executada com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao verificar/criar super admin:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao executar verificação/criação de super admin', 
        error: error.message 
      });
    }
  });

  // Rota alternativa sem proteção de chave (apenas para desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    adminRouter.post('/dev-ensure-super-admin', async (req, res) => {
      try {
        console.log('Executando criação de super admin em modo desenvolvimento');
        await ensureSuperAdminExists(pgPool);
        
        res.status(200).json({ 
          success: true, 
          message: 'Verificação/criação de super admin executada com sucesso (modo dev)' 
        });
      } catch (error) {
        console.error('Erro ao verificar/criar super admin (modo dev):', error);
        res.status(500).json({ 
          success: false, 
          message: 'Erro ao executar verificação/criação de super admin', 
          error: error.message 
        });
      }
    });
  }

  return router;
};
