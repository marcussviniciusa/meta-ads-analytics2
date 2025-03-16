const express = require('express');
const router = express.Router();
const { runMigration } = require('../migrations/runMigration');

/**
 * Rotas temporárias para execução de migrações
 * ATENÇÃO: Estas rotas devem ser removidas após as migrações serem executadas
 * @param {Object} app - Express app
 */
module.exports = function(app) {
  // Rota base para migrações
  const migrationRouter = express.Router();
  app.use('/api/migrations', migrationRouter);
  
  // Migração para adicionar tabelas de empresa e papéis de usuário
  migrationRouter.post('/add-company-and-roles', async (req, res) => {
    try {
      const secretKey = req.headers['x-migration-key'];
      
      // Verificar chave de segurança
      if (secretKey !== process.env.MIGRATION_SECRET_KEY) {
        return res.status(401).json({ 
          success: false, 
          message: 'Chave de migração inválida' 
        });
      }
      
      // Executar migração
      await runMigration('05_add_role_and_company_tables.sql');
      
      res.status(200).json({ 
        success: true, 
        message: 'Migração executada com sucesso' 
      });
    } catch (error) {
      console.error('Erro na migração:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao executar migração', 
        error: error.message 
      });
    }
  });

  // Nova rota para adicionar tabelas de integração
  migrationRouter.post('/add-integration-tables', async (req, res) => {
    try {
      const secretKey = req.headers['x-migration-key'];
      
      // Verificar chave de segurança
      if (secretKey !== process.env.MIGRATION_SECRET_KEY) {
        return res.status(401).json({ 
          success: false, 
          message: 'Chave de migração inválida' 
        });
      }
      
      // Executar migração
      await runMigration('04_create_integration_tables.sql');
      
      res.status(200).json({ 
        success: true, 
        message: 'Tabelas de integração criadas com sucesso' 
      });
    } catch (error) {
      console.error('Erro na migração de integração:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao criar tabelas de integração', 
        error: error.message 
      });
    }
  });

  return router;
};
