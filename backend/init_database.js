require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuração de conexão com o banco de dados
// Usar diretamente as credenciais fornecidas
const pgPool = new Pool({
  host: '77.37.41.106',
  port: 5432,
  database: 'speedfunnels_v2',
  user: 'postgres',
  password: 'Marcus1911!!Marcus'
});

// Função para ler arquivos SQL em ordem e executá-los
async function initDatabase() {
  try {
    console.log('Conectando ao banco de dados...');
    await pgPool.connect();
    console.log('Conexão estabelecida com sucesso!');

    // Obter a lista de arquivos SQL ordenada
    const sqlFiles = fs.readdirSync(path.join(__dirname, 'sql'))
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Executar cada arquivo SQL na ordem
    for (const sqlFile of sqlFiles) {
      console.log(`Executando ${sqlFile}...`);
      const sqlContent = fs.readFileSync(path.join(__dirname, 'sql', sqlFile), 'utf8');
      
      // Executar o comando SQL
      await pgPool.query(sqlContent);
      console.log(`${sqlFile} executado com sucesso!`);
    }

    console.log('Inicialização do banco de dados concluída!');
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
  } finally {
    // Fechar a conexão com o banco de dados
    await pgPool.end();
  }
}

// Executar a inicialização
initDatabase();
