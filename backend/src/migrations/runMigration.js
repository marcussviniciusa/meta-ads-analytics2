const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

/**
 * Função para executar scripts SQL de migração
 * @param {string} scriptFile - Nome do arquivo SQL
 */
async function runMigration(scriptFile) {
  console.log(`Executando migração: ${scriptFile}`);
  
  // Configurar conexão com o banco de dados
  const pgConfig = {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  };
  
  // Caminho completo para o arquivo SQL
  const sqlFilePath = path.join(__dirname, '../../sql', scriptFile);
  
  try {
    // Ler o conteúdo do arquivo SQL
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Conectar ao banco de dados
    const pool = new Pool(pgConfig);
    const client = await pool.connect();
    
    try {
      console.log('Conectado ao banco de dados. Executando script SQL...');
      
      // Iniciar transação
      await client.query('BEGIN');
      
      // Executar o script SQL
      await client.query(sqlContent);
      
      // Confirmar transação
      await client.query('COMMIT');
      
      console.log('Migração concluída com sucesso!');
    } catch (error) {
      // Reverter em caso de erro
      await client.query('ROLLBACK');
      console.error('Erro durante a migração:', error);
      throw error;
    } finally {
      // Liberar conexão
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    throw error;
  }
}

module.exports = { runMigration };
