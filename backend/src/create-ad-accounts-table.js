const { Pool } = require('pg');

// Configuração da conexão do banco de dados
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Marcus1911!!Marcus',
  host: process.env.POSTGRES_HOST || '77.37.41.106',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'speedfunnels_v2'
});

async function createAdAccountsTable() {
  const client = await pool.connect();
  try {
    console.log('Conectado ao PostgreSQL. Verificando tabela ad_accounts...');
    
    // Verificar se a tabela existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_accounts'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Tabela ad_accounts não existe. Criando...');
      
      // Criar a tabela ad_accounts
      await client.query(`
        CREATE TABLE ad_accounts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          account_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          status INTEGER,
          business_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT uk_user_account UNIQUE(user_id, account_id)
        );
      `);
      console.log('Tabela ad_accounts criada com sucesso.');
    } else {
      console.log('Tabela ad_accounts já existe. Verificando colunas...');
      
      // Verificar e adicionar colunas que possam estar faltando
      const columns = ['name', 'status', 'business_name', 'account_id', 'user_id'];
      
      for (const column of columns) {
        const columnExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ad_accounts' 
            AND column_name = $1
          );
        `, [column]);
        
        if (!columnExists.rows[0].exists) {
          console.log(`Adicionando coluna ${column} à tabela ad_accounts...`);
          
          let dataType = 'VARCHAR(255)';
          if (column === 'status') dataType = 'INTEGER';
          if (column === 'user_id') dataType = 'INTEGER NOT NULL';
          
          await client.query(`
            ALTER TABLE ad_accounts
            ADD COLUMN ${column} ${dataType};
          `);
          console.log(`Coluna ${column} adicionada com sucesso.`);
        } else {
          console.log(`Coluna ${column} já existe.`);
        }
      }
    }
    
    // Verificar e adicionar a restrição de unicidade se necessário
    const constraintExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'ad_accounts' 
        AND constraint_name = 'uk_user_account'
      );
    `);
    
    if (!constraintExists.rows[0].exists) {
      console.log('Adicionando restrição de unicidade (user_id, account_id)...');
      
      await client.query(`
        ALTER TABLE ad_accounts
        ADD CONSTRAINT uk_user_account UNIQUE(user_id, account_id);
      `).catch(err => {
        // Se já existirem dados duplicados, precisamos lidar com isso
        console.log('Não foi possível adicionar a restrição de unicidade:', err.message);
      });
    } else {
      console.log('Restrição de unicidade já existe.');
    }
    
    console.log('Configuração da tabela ad_accounts concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao modificar a tabela:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar a função
createAdAccountsTable();
