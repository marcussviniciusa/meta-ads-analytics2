const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '77.37.41.106',
  port: process.env.POSTGRES_PORT || '5432',
  database: process.env.POSTGRES_DB || 'speedfunnels_v2',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Marcus1911!!Marcus'
});

async function createUserPermissionsTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Tabela para permissões de contas de anúncio do Meta
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_ad_account_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        account_id VARCHAR(255) NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_id_ad FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_created_by_ad FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT uk_user_ad_account UNIQUE(user_id, account_id)
      );
    `);
    
    // Tabela para permissões de propriedades do Google Analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_ga_property_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        property_id VARCHAR(100) NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_id_ga FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_created_by_ga FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT uk_user_ga_property UNIQUE(user_id, property_id)
      );
    `);

    // Índices para melhorar a performance das consultas
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_ad_account_permissions_user_id ON user_ad_account_permissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_ga_property_permissions_user_id ON user_ga_property_permissions(user_id);
    `);
    
    await client.query('COMMIT');
    console.log('Tabelas de permissões de usuário criadas com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar tabelas de permissões:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createUserPermissionsTables()
  .then(() => console.log('Migração concluída'))
  .catch(err => console.error('Erro na migração:', err));
