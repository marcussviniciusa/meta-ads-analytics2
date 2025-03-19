-- Migração para adicionar coluna campaign_db_id à tabela campaign_insights
-- Data: 19 de março de 2025

-- Verificar se a coluna já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaign_insights' 
        AND column_name = 'campaign_db_id'
    ) THEN
        -- Adicionar a coluna campaign_db_id com referência à tabela campaigns
        ALTER TABLE campaign_insights ADD COLUMN campaign_db_id INTEGER REFERENCES campaigns(id);
        
        -- Atualizar os registros existentes para preencher campaign_db_id com base no account_id e campaign_id
        -- Isso tentará encontrar correspondências baseando-se no campaign_id da Meta que já existe nas duas tabelas
        UPDATE campaign_insights ci
        SET campaign_db_id = c.id
        FROM campaigns c
        WHERE ci.account_id = c.account_id 
        AND ci.campaign_id = c.campaign_id;
        
        -- Adicionar um índice para melhorar a performance das consultas
        CREATE INDEX idx_campaign_insights_campaign_db_id ON campaign_insights(campaign_db_id);
        
        RAISE NOTICE 'Coluna campaign_db_id adicionada com sucesso à tabela campaign_insights';
    ELSE
        RAISE NOTICE 'A coluna campaign_db_id já existe na tabela campaign_insights';
    END IF;
END
$$;
