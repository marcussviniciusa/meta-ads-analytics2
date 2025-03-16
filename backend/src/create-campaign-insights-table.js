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

async function setupCampaignInsightsTable() {
  const client = await pool.connect();
  try {
    console.log('Conectado ao PostgreSQL. Verificando tabela campaign_insights...');

    // Verificar se a tabela existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'campaign_insights'
      );
    `);

    // Se a tabela não existir, criar
    if (!tableExists.rows[0].exists) {
      console.log('Criando tabela campaign_insights...');
      await client.query(`
        CREATE TABLE campaign_insights (
          id SERIAL PRIMARY KEY,
          campaign_db_id INTEGER NOT NULL,
          campaign_id VARCHAR(255) NOT NULL,
          date_start DATE NOT NULL,
          date_stop DATE NOT NULL,
          impressions INTEGER DEFAULT 0,
          clicks INTEGER DEFAULT 0,
          spend DECIMAL(10, 2) DEFAULT 0.00,
          conversions INTEGER DEFAULT 0,
          cpc DECIMAL(10, 2) DEFAULT 0.00,
          ctr DECIMAL(10, 4) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_campaign
            FOREIGN KEY(campaign_db_id) 
            REFERENCES campaigns(id)
            ON DELETE CASCADE
        );
      `);
      console.log('Tabela campaign_insights criada com sucesso!');
    } else {
      console.log('Tabela campaign_insights já existe. Verificando colunas...');

      // Verificar coluna campaign_db_id
      const campaignDbIdExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'campaign_insights' 
          AND column_name = 'campaign_db_id'
        );
      `);

      if (!campaignDbIdExists.rows[0].exists) {
        console.log('Adicionando coluna campaign_db_id à tabela campaign_insights...');
        await client.query(`
          ALTER TABLE campaign_insights 
          ADD COLUMN campaign_db_id INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('Coluna campaign_db_id adicionada com sucesso.');
      } else {
        console.log('Coluna campaign_db_id já existe.');
        
        // Verificar se há registros com campaign_db_id NULL
        const nullCheck = await client.query(`
          SELECT COUNT(*) FROM campaign_insights WHERE campaign_db_id IS NULL;
        `);
        
        if (parseInt(nullCheck.rows[0].count) > 0) {
          console.log(`Encontrados ${nullCheck.rows[0].count} registros com campaign_db_id NULL. Corrigindo...`);
          await client.query(`
            DELETE FROM campaign_insights WHERE campaign_db_id IS NULL;
          `);
          console.log('Registros com campaign_db_id NULL removidos.');
        } else {
          console.log('Não há registros com campaign_db_id NULL.');
        }
      }

      // Verificar outras colunas necessárias
      const columnsToCheck = [
        'campaign_id', 'date_start', 'date_stop', 'impressions', 'clicks', 
        'spend', 'conversions', 'cpc', 'ctr', 'created_at', 'updated_at'
      ];

      for (const column of columnsToCheck) {
        const columnExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'campaign_insights' 
            AND column_name = $1
          );
        `, [column]);

        if (!columnExists.rows[0].exists) {
          console.log(`Adicionando coluna ${column} à tabela campaign_insights...`);
          
          let dataType = 'VARCHAR(255)';
          if (column === 'date_start' || column === 'date_stop') {
            dataType = 'DATE';
          } else if (column === 'impressions' || column === 'clicks' || column === 'conversions') {
            dataType = 'INTEGER DEFAULT 0';
          } else if (column === 'spend' || column === 'cpc') {
            dataType = 'DECIMAL(10, 2) DEFAULT 0.00';
          } else if (column === 'ctr') {
            dataType = 'DECIMAL(10, 4) DEFAULT 0.00';
          } else if (column === 'created_at' || column === 'updated_at') {
            dataType = 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
          }
          
          await client.query(`
            ALTER TABLE campaign_insights 
            ADD COLUMN ${column} ${dataType};
          `);
          console.log(`Coluna ${column} adicionada com sucesso.`);
        } else {
          console.log(`Coluna ${column} já existe.`);
        }
      }

      // Verificar se existe a restrição de chave estrangeira
      const fkExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE table_schema = 'public' 
          AND table_name = 'campaign_insights' 
          AND constraint_type = 'FOREIGN KEY' 
          AND constraint_name = 'fk_campaign'
        );
      `);

      if (!fkExists.rows[0].exists) {
        console.log('Adicionando restrição de chave estrangeira para campaigns...');
        try {
          await client.query(`
            ALTER TABLE campaign_insights 
            ADD CONSTRAINT fk_campaign
            FOREIGN KEY(campaign_db_id) 
            REFERENCES campaigns(id)
            ON DELETE CASCADE;
          `);
          console.log('Restrição de chave estrangeira adicionada com sucesso.');
        } catch (err) {
          console.log('Erro ao adicionar restrição de chave estrangeira. Pode haver registros com referência inválida.');
          console.error(err.message);
        }
      } else {
        console.log('Restrição de chave estrangeira já existe.');
      }
    }

    console.log('Configuração da tabela campaign_insights concluída com sucesso!');
  } catch (err) {
    console.error('Erro durante a configuração da tabela campaign_insights:', err);
  } finally {
    client.release();
    pool.end();
  }
}

setupCampaignInsightsTable();
