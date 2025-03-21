-- Migração para adicionar coluna campaign_db_id à tabela campaign_insights
-- Data: 19 de março de 2025

-- Verificar se a coluna já existe
DO $$
BEGIN
    -- 1. Verificar se a coluna já existe (ajustado para evitar erro)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaign_insights' 
        AND column_name = 'campaign_db_id'
    ) THEN
        -- 2. Adicionar a coluna campaign_db_id com referência à tabela campaigns
        ALTER TABLE campaign_insights ADD COLUMN campaign_db_id BIGINT REFERENCES campaigns(id);
        RAISE NOTICE 'Coluna campaign_db_id adicionada com sucesso à tabela campaign_insights';
        
        -- 3. Verificar se account_id existe na tabela campaign_insights
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'campaign_insights' 
            AND column_name = 'account_id'
        ) THEN
            -- 3.1 Verificar se ad_account_id existe (nova estrutura)
            IF EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'campaign_insights' 
                AND column_name = 'ad_account_id'
            ) THEN
                -- Usar ad_account_id para a lógica (nova estrutura)
                RAISE NOTICE 'Coluna ad_account_id será usada para relacionamento (nova estrutura)';
            ELSE
                -- 3.2 Adicionar account_id se não existir nenhuma coluna relacionada a contas
                ALTER TABLE campaign_insights ADD COLUMN account_id VARCHAR(100);
                RAISE NOTICE 'Coluna account_id adicionada à tabela campaign_insights';
            END IF;
        END IF;
        
        -- 4. Verificar se campaign_id tem o mesmo tipo nas duas tabelas
        DECLARE
            ci_type TEXT;
            c_type TEXT;
        BEGIN
            SELECT data_type INTO ci_type
            FROM information_schema.columns 
            WHERE table_name = 'campaign_insights' AND column_name = 'campaign_id';
            
            SELECT data_type INTO c_type
            FROM information_schema.columns 
            WHERE table_name = 'campaigns' AND column_name = 'campaign_id';
            
            -- 4.1 Se os tipos forem diferentes, fazer casting explícito
            IF ci_type != c_type THEN
                -- Usar CAST explícito para evitar erros de tipo
                UPDATE campaign_insights ci
                SET campaign_db_id = c.id
                FROM campaigns c
                WHERE CAST(ci.campaign_id AS VARCHAR) = CAST(c.campaign_id AS VARCHAR);
                
                RAISE NOTICE 'Atualização realizada com casting explícito entre tipos diferentes';
            ELSE
                -- 4.2 Usar a consulta normal se os tipos forem iguais
                UPDATE campaign_insights ci
                SET campaign_db_id = c.id
                FROM campaigns c
                WHERE ci.campaign_id = c.campaign_id;
                
                RAISE NOTICE 'Atualização realizada com tipos compatíveis';
            END IF;
        END;
        
        -- 5. Adicionar um índice para melhorar a performance das consultas
        CREATE INDEX idx_campaign_insights_campaign_db_id ON campaign_insights(campaign_db_id);
        
    ELSE
        RAISE NOTICE 'A coluna campaign_db_id já existe na tabela campaign_insights';
    END IF;
END
$$;
