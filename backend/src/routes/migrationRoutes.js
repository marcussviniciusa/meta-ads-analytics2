const express = require('express');
const router = express.Router();
const { runMigration } = require('../migrations/runMigration');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

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

  // Nova rota para adicionar tabelas de permissões
  migrationRouter.post('/add-permission-tables', async (req, res) => {
    try {
      const secretKey = req.headers['x-migration-key'];
      
      // Verificar chave de segurança
      if (secretKey !== process.env.MIGRATION_SECRET_KEY) {
        return res.status(401).json({ 
          success: false, 
          message: 'Chave de migração inválida' 
        });
      }
      
      // Configurar conexão com o banco de dados
      const pgConfig = {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD
      };
      
      // Obter o script SQL do corpo da requisição ou usar o arquivo padrão
      let sqlContent;
      
      if (req.body && req.body.migrationScript) {
        console.log('Usando script SQL fornecido na requisição');
        sqlContent = req.body.migrationScript;
      } else {
        // Caminho completo para o arquivo SQL padrão
        const sqlFilePath = path.join(__dirname, '../../../create_permission_tables.sql');
        console.log(`Usando arquivo SQL padrão: ${sqlFilePath}`);
        
        // Ler o conteúdo do arquivo SQL
        sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      }
      
      // Conectar ao banco de dados
      const pool = new Pool(pgConfig);
      const client = await pool.connect();
      
      try {
        console.log('Conectado ao banco de dados. Executando script de permissões...');
        
        // Iniciar transação
        await client.query('BEGIN');
        
        // Executar o script SQL
        await client.query(sqlContent);
        
        // Confirmar transação
        await client.query('COMMIT');
        
        console.log('Migração de permissões concluída com sucesso!');
        
        res.status(200).json({ 
          success: true, 
          message: 'Tabelas de permissões criadas com sucesso' 
        });
      } catch (error) {
        // Reverter em caso de erro
        await client.query('ROLLBACK');
        console.error('Erro durante a migração de permissões:', error);
        
        res.status(500).json({ 
          success: false, 
          message: 'Erro ao criar tabelas de permissões', 
          error: error.message 
        });
      } finally {
        // Liberar conexão
        client.release();
        await pool.end();
      }
    } catch (error) {
      console.error('Erro na migração de permissões:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao criar tabelas de permissões', 
        error: error.message 
      });
    }
  });

  return router;
};
