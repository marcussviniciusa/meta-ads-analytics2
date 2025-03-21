-- Script de migração para atualizar os tipos de dados das colunas campaign_id e campaign_db_id
-- Data: 20 de março de 2025

-- Iniciar uma transação para garantir que todas as alterações sejam feitas ou nenhuma
BEGIN;

-- Função para realizar a migração de forma segura
DO $$
BEGIN
    -- Failsafe: Garantir que a constraint campaign_insights_campaign_id_fkey seja removida
    BEGIN
        EXECUTE 'ALTER TABLE campaign_insights DROP CONSTRAINT IF EXISTS campaign_insights_campaign_id_fkey;';
        RAISE NOTICE 'Constraint campaign_insights_campaign_id_fkey removida com sucesso.';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao remover constraint campaign_insights_campaign_id_fkey: %', SQLERRM;
    END;

    -- Failsafe: Garantir que a constraint campaign_insights_campaign_db_id_fkey seja removida
    BEGIN
        EXECUTE 'ALTER TABLE campaign_insights DROP CONSTRAINT IF EXISTS campaign_insights_campaign_db_id_fkey;';
        RAISE NOTICE 'Constraint campaign_insights_campaign_db_id_fkey removida com sucesso.';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao remover constraint campaign_insights_campaign_db_id_fkey: %', SQLERRM;
    END;

    -- 1. Atualizar o tipo da coluna campaign_id em campaign_insights para VARCHAR(100)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaign_insights' 
        AND column_name = 'campaign_id'
    ) THEN
        -- Verificar o tipo atual
        DECLARE
            current_type TEXT;
        BEGIN
            SELECT data_type INTO current_type
            FROM information_schema.columns 
            WHERE table_name = 'campaign_insights' AND column_name = 'campaign_id';
            
            -- Se o tipo não for VARCHAR, atualizá-lo
            IF current_type != 'character varying' THEN
                -- Abordagem mais geral: remover todas as constraints que referenciam campaign_id
                DECLARE
                    constraints_cursor REFCURSOR;
                    constraint_name TEXT;
                BEGIN
                    -- Buscar todas as constraints que referenciam a coluna campaign_id
                    OPEN constraints_cursor FOR
                        SELECT tc.constraint_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.constraint_column_usage ccu 
                        ON tc.constraint_name = ccu.constraint_name
                        WHERE tc.table_name = 'campaign_insights'
                        AND ccu.column_name = 'campaign_id';
                    
                    -- Loop através de todas as constraints encontradas
                    LOOP
                        FETCH constraints_cursor INTO constraint_name;
                        EXIT WHEN NOT FOUND;
                        
                        BEGIN
                            EXECUTE 'ALTER TABLE campaign_insights DROP CONSTRAINT IF EXISTS ' || constraint_name || ';';
                            RAISE NOTICE 'Restrição % removida', constraint_name;
                        EXCEPTION
                            WHEN OTHERS THEN
                                RAISE NOTICE 'Erro ao remover restrição %: %', constraint_name, SQLERRM;
                        END;
                    END LOOP;
                    
                    CLOSE constraints_cursor;
                END;
                
                -- Alterar o tipo da coluna
                ALTER TABLE campaign_insights ALTER COLUMN campaign_id TYPE VARCHAR(100) USING campaign_id::VARCHAR;
                RAISE NOTICE 'Coluna campaign_id alterada para VARCHAR(100) em campaign_insights';
                
                -- Recriar restrição de unicidade com base nas colunas disponíveis
                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'campaign_insights' 
                    AND column_name = 'date'
                ) THEN
                    -- Usar date para restrição
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints tc
                        WHERE tc.table_name = 'campaign_insights'
                        AND tc.constraint_name = 'campaign_insights_campaign_id_date_key'
                    ) THEN
                        ALTER TABLE campaign_insights 
                        ADD CONSTRAINT campaign_insights_campaign_id_date_key 
                        UNIQUE(campaign_id, date);
                        RAISE NOTICE 'Restrição de unicidade (campaign_id, date) recriada';
                    ELSE
                        RAISE NOTICE 'Restrição de unicidade (campaign_id, date) já existe, não foi recriada';
                    END IF;
                ELSIF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'campaign_insights' 
                    AND column_name = 'date_start'
                ) AND EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'campaign_insights' 
                    AND column_name = 'date_stop'
                ) THEN
                    -- Usar date_start e date_stop para restrição
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.table_constraints tc
                        WHERE tc.table_name = 'campaign_insights'
                        AND tc.constraint_name = 'campaign_insights_campaign_id_date_range_key'
                    ) THEN
                        ALTER TABLE campaign_insights 
                        ADD CONSTRAINT campaign_insights_campaign_id_date_range_key 
                        UNIQUE(campaign_id, date_start, date_stop);
                        RAISE NOTICE 'Restrição de unicidade (campaign_id, date_start, date_stop) recriada';
                    ELSE
                        RAISE NOTICE 'Restrição de unicidade (campaign_id, date_start, date_stop) já existe, não foi recriada';
                    END IF;
                END IF;
            ELSE
                RAISE NOTICE 'Coluna campaign_id já é do tipo VARCHAR em campaign_insights';
            END IF;
        END;
    ELSE
        RAISE NOTICE 'Coluna campaign_id não existe na tabela campaign_insights';
    END IF;
    
    -- 2. Atualizar o tipo da coluna campaign_db_id em campaign_insights para BIGINT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaign_insights' 
        AND column_name = 'campaign_db_id'
    ) THEN
        -- Verificar o tipo atual
        DECLARE
            current_type TEXT;
        BEGIN
            SELECT data_type INTO current_type
            FROM information_schema.columns 
            WHERE table_name = 'campaign_insights' AND column_name = 'campaign_db_id';
            
            -- Se o tipo não for BIGINT, atualizá-lo
            IF current_type != 'bigint' THEN
                -- Abordagem mais geral: remover todas as constraints que referenciam campaign_db_id
                DECLARE
                    constraints_cursor REFCURSOR;
                    constraint_name TEXT;
                BEGIN
                    -- Buscar todas as constraints que referenciam a coluna campaign_db_id
                    OPEN constraints_cursor FOR
                        SELECT tc.constraint_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.constraint_column_usage ccu 
                        ON tc.constraint_name = ccu.constraint_name
                        WHERE tc.table_name = 'campaign_insights'
                        AND ccu.column_name = 'campaign_db_id';
                    
                    -- Loop através de todas as constraints encontradas
                    LOOP
                        FETCH constraints_cursor INTO constraint_name;
                        EXIT WHEN NOT FOUND;
                        
                        BEGIN
                            EXECUTE 'ALTER TABLE campaign_insights DROP CONSTRAINT IF EXISTS ' || constraint_name || ';';
                            RAISE NOTICE 'Restrição % removida', constraint_name;
                        EXCEPTION
                            WHEN OTHERS THEN
                                RAISE NOTICE 'Erro ao remover restrição %: %', constraint_name, SQLERRM;
                        END;
                    END LOOP;
                    
                    CLOSE constraints_cursor;
                END;
                
                -- Alterar o tipo da coluna
                ALTER TABLE campaign_insights ALTER COLUMN campaign_db_id TYPE BIGINT USING campaign_db_id::BIGINT;
                RAISE NOTICE 'Coluna campaign_db_id alterada para BIGINT em campaign_insights';
                
                -- Verificar se a constraint já existe antes de recriá-la
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints tc
                    WHERE tc.table_name = 'campaign_insights'
                    AND tc.constraint_name = 'campaign_insights_campaign_db_id_fkey'
                ) THEN
                    ALTER TABLE campaign_insights 
                    ADD CONSTRAINT campaign_insights_campaign_db_id_fkey
                    FOREIGN KEY (campaign_db_id) REFERENCES campaigns(id) ON DELETE CASCADE;
                    RAISE NOTICE 'Constraint campaign_insights_campaign_db_id_fkey adicionada';
                ELSE
                    RAISE NOTICE 'Constraint campaign_insights_campaign_db_id_fkey já existe, não foi recriada';
                END IF;
            ELSE
                RAISE NOTICE 'Coluna campaign_db_id já é do tipo BIGINT em campaign_insights';
            END IF;
        END;
    ELSE
        RAISE NOTICE 'Coluna campaign_db_id não existe na tabela campaign_insights';
    END IF;
    
    -- 3. Criar índices para melhorar performance se não existirem
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'campaign_insights' 
        AND indexname = 'idx_campaign_insights_campaign_id'
    ) THEN
        CREATE INDEX idx_campaign_insights_campaign_id ON campaign_insights(campaign_id);
        RAISE NOTICE 'Índice idx_campaign_insights_campaign_id criado';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'campaign_insights' 
        AND indexname = 'idx_campaign_insights_campaign_db_id'
    ) AND EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaign_insights' 
        AND column_name = 'campaign_db_id'
    ) THEN
        CREATE INDEX idx_campaign_insights_campaign_db_id ON campaign_insights(campaign_db_id);
        RAISE NOTICE 'Índice idx_campaign_insights_campaign_db_id criado';
    END IF;
    
END $$;

-- Commit da transação se não houver erros
COMMIT;
