const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '77.37.41.106',
  port: process.env.POSTGRES_PORT || '5432',
  database: process.env.POSTGRES_DB || 'speedfunnels_v2',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Marcus1911!!Marcus'
});

async function createGoogleAnalyticsTables() {
  try {
    // Tabela para armazenar tokens do Google
    await pool.query(`
      CREATE TABLE IF NOT EXISTS google_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        refresh_token TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);
    
    // Tabela para propriedades do Google Analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ga_properties (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        property_id VARCHAR(100) NOT NULL,
        property_name VARCHAR(255) NOT NULL,
        account_id VARCHAR(100) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, property_id)
      );
    `);
    
    // Tabela para relatórios do Google Analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ga_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        property_id VARCHAR(100) NOT NULL,
        date_start DATE NOT NULL,
        date_end DATE NOT NULL,
        report_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Tabelas do Google Analytics criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabelas do Google Analytics:', error);
  } finally {
    await pool.end();
  }
}

createGoogleAnalyticsTables();
