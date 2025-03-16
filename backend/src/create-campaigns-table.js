const { Pool } = require('pg');
require('dotenv').config();

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

async function setupCampaignsTable() {
  const client = await pool.connect();
  try {
    console.log('Conectado ao PostgreSQL. Verificando tabela campaigns...');

    // Verificar se a tabela existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'campaigns'
      );
    `);

    // Se a tabela não existir, criar
    if (!tableExists.rows[0].exists) {
      console.log('Criando tabela campaigns...');
      await client.query(`
        CREATE TABLE campaigns (
          id SERIAL PRIMARY KEY,
          ad_account_id VARCHAR(255) NOT NULL,
          campaign_id VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          status VARCHAR(50),
          objective VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(ad_account_id, campaign_id)
        );
      `);
      console.log('Tabela campaigns criada com sucesso!');
    } else {
      console.log('Tabela campaigns já existe. Verificando colunas...');

      // Verificar coluna ad_account_id
      const adAccountIdExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'campaigns' 
          AND column_name = 'ad_account_id'
        );
      `);

      if (!adAccountIdExists.rows[0].exists) {
        console.log('Adicionando coluna ad_account_id à tabela campaigns...');
        await client.query(`
          ALTER TABLE campaigns 
          ADD COLUMN ad_account_id VARCHAR(255) NOT NULL DEFAULT '';
        `);
        console.log('Coluna ad_account_id adicionada com sucesso.');
      } else {
        console.log('Coluna ad_account_id já existe.');
        
        // Verificar se há registros com ad_account_id NULL
        const nullCheck = await client.query(`
          SELECT COUNT(*) FROM campaigns WHERE ad_account_id IS NULL;
        `);
        
        if (parseInt(nullCheck.rows[0].count) > 0) {
          console.log(`Encontrados ${nullCheck.rows[0].count} registros com ad_account_id NULL. Corrigindo...`);
          await client.query(`
            DELETE FROM campaigns WHERE ad_account_id IS NULL;
          `);
          console.log('Registros com ad_account_id NULL removidos.');
        } else {
          console.log('Não há registros com ad_account_id NULL.');
        }
      }

      // Verificar outras colunas necessárias
      const columnsToCheck = [
        'campaign_id', 'name', 'status', 'objective', 'created_at', 'updated_at'
      ];

      for (const column of columnsToCheck) {
        const columnExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'campaigns' 
            AND column_name = $1
          );
        `, [column]);

        if (!columnExists.rows[0].exists) {
          console.log(`Adicionando coluna ${column} à tabela campaigns...`);
          
          let dataType = 'VARCHAR(255)';
          if (column === 'created_at' || column === 'updated_at') {
            dataType = 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
          }
          
          await client.query(`
            ALTER TABLE campaigns 
            ADD COLUMN ${column} ${dataType};
          `);
          console.log(`Coluna ${column} adicionada com sucesso.`);
        } else {
          console.log(`Coluna ${column} já existe.`);
        }
      }

      // Adicionar restrição de unicidade se não existir
      const constraintExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE table_schema = 'public' 
          AND table_name = 'campaigns' 
          AND constraint_type = 'UNIQUE' 
          AND constraint_name = 'campaigns_ad_account_id_campaign_id_key'
        );
      `);

      if (!constraintExists.rows[0].exists) {
        console.log('Adicionando restrição de unicidade (ad_account_id, campaign_id)...');
        try {
          await client.query(`
            ALTER TABLE campaigns 
            ADD CONSTRAINT campaigns_ad_account_id_campaign_id_key 
            UNIQUE (ad_account_id, campaign_id);
          `);
          console.log('Restrição de unicidade adicionada com sucesso.');
        } catch (err) {
          console.log('Erro ao adicionar restrição de unicidade. Pode haver registros duplicados.');
          console.error(err.message);
        }
      } else {
        console.log('Restrição de unicidade já existe.');
      }
    }

    console.log('Configuração da tabela campaigns concluída com sucesso!');
  } catch (err) {
    console.error('Erro durante a configuração da tabela campaigns:', err);
  } finally {
    client.release();
    pool.end();
  }
}

setupCampaignsTable();
