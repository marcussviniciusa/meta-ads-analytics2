const { Pool } = require('pg');

// Configuração da conexão do banco de dados
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Marcus1911!!Marcus',
  host: process.env.POSTGRES_HOST || '77.37.41.106',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'speedfunnels_v2'
});

async function addCredentialsColumn() {
  const client = await pool.connect();
  try {
    console.log('Conectado ao PostgreSQL. Adicionando coluna credentials...');
    
    // Adicionar a coluna se não existir
    await client.query(`
      ALTER TABLE user_integrations 
      ADD COLUMN IF NOT EXISTS credentials JSONB;
    `);
    console.log('Coluna credentials adicionada ou já existente.');
    
    // Criar índice para melhorar performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_integrations_credentials 
      ON user_integrations USING gin (credentials);
    `);
    console.log('Índice criado ou já existente.');
    
    // Adicionar comentário
    await client.query(`
      COMMENT ON COLUMN user_integrations.credentials 
      IS 'JSONB field to store API credentials and tokens';
    `);
    console.log('Comentário adicionado à coluna.');
    
    console.log('Operação concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao modificar a tabela:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar a função
addCredentialsColumn();
