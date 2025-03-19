#!/usr/bin/env node
require('dotenv').config({ path: '../../../.env' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { runMigration } = require('./runMigration');

// Configuração do banco de dados
const pgConfig = {
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
};

// Script para inicializar o banco de dados completo
async function initDatabase() {
  console.log('Iniciando criação e inicialização do banco de dados...');
  
  try {
    // Conectar ao PostgreSQL
    const pool = new Pool({
      ...pgConfig,
      database: 'postgres' // Conecta ao banco postgres padrão primeiro
    });
    
    // Verificar se o banco de dados existe e criar se não existir
    const client = await pool.connect();
    try {
      const dbExists = await client.query(`
        SELECT 1 FROM pg_database WHERE datname = $1
      `, [process.env.POSTGRES_DB]);
      
      if (dbExists.rows.length === 0) {
        console.log(`Banco de dados '${process.env.POSTGRES_DB}' não encontrado. Criando...`);
        // Certifique-se de que não haverá outros clientes conectados
        await client.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
        `, [process.env.POSTGRES_DB]);
        
        // Criar o banco de dados
        await client.query(`CREATE DATABASE ${process.env.POSTGRES_DB}`);
        console.log(`Banco de dados '${process.env.POSTGRES_DB}' criado com sucesso!`);
      } else {
        console.log(`Banco de dados '${process.env.POSTGRES_DB}' já existe.`);
      }
    } finally {
      client.release();
      await pool.end();
    }
    
    // Conectar ao banco de dados específico
    const appPool = new Pool(pgConfig);
    const appClient = await appPool.connect();
    
    try {
      console.log('Iniciando transação...');
      await appClient.query('BEGIN');
      
      // Executar scripts de criação de tabelas na ordem correta
      const sqlScripts = [
        '00_create_users_table.sql',
        '01_create_ad_accounts_table.sql',
        '02_create_campaigns_table.sql',
        '03_create_campaign_insights_table.sql',
        '04_create_integration_tables.sql',
        '05_add_role_and_company_tables.sql',
        '06_create_user_permissions_tables.sql',
        '07_add_campaign_db_id_to_insights.sql'
      ];
      
      for (const script of sqlScripts) {
        console.log(`Executando script: ${script}...`);
        const sqlPath = path.join(__dirname, '../../sql', script);
        
        if (fs.existsSync(sqlPath)) {
          const sql = fs.readFileSync(sqlPath, 'utf8');
          await appClient.query(sql);
          console.log(`Script ${script} executado com sucesso!`);
        } else {
          console.warn(`AVISO: Script ${script} não encontrado.`);
        }
      }
      
      // Verificar se a tabela de migrações existe e criar se necessário
      const tableExists = await appClient.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'migrations'
      `);
      
      if (tableExists.rows.length === 0) {
        console.log('Criando tabela de controle de migrações...');
        await appClient.query(`
          CREATE TABLE migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
      }
      
      // Registrar todas as migrações como aplicadas
      for (const script of sqlScripts) {
        await appClient.query(`
          INSERT INTO migrations (name) 
          VALUES ($1) 
          ON CONFLICT (name) DO NOTHING
        `, [script]);
      }
      
      await appClient.query('COMMIT');
      console.log('Inicialização do banco de dados concluída com sucesso!');
    } catch (error) {
      await appClient.query('ROLLBACK');
      console.error('Erro durante a inicialização do banco de dados:', error);
      throw error;
    } finally {
      appClient.release();
      await appPool.end();
    }
  } catch (error) {
    console.error('Erro fatal durante a inicialização do banco de dados:', error);
    process.exit(1);
  }
}

// Executar a inicialização
if (require.main === module) {
  initDatabase().then(() => {
    console.log('Processo de inicialização do banco de dados concluído.');
    process.exit(0);
  }).catch(err => {
    console.error('Falha na inicialização do banco de dados:', err);
    process.exit(1);
  });
}

module.exports = { initDatabase };
