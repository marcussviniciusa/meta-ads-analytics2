-- Criação da tabela de insights das campanhas
CREATE TABLE IF NOT EXISTS campaign_insights (
  id SERIAL PRIMARY KEY,
  campaign_db_id BIGINT,
  campaign_id VARCHAR(100) NOT NULL,
  date DATE,
  date_start DATE,
  date_stop DATE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(10, 6) DEFAULT 0,
  cpc NUMERIC(12, 6) DEFAULT 0,
  spend NUMERIC(14, 2) DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC(10, 6) DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  cost_per_unique_click NUMERIC(12, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verificar e adicionar constraint se necessário
DO $$
BEGIN
  -- Verificar quais colunas existem
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'campaign_insights' 
    AND column_name = 'date'
  ) THEN
    -- Se a coluna date existe, usar constraint com date
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.constraint_column_usage
      WHERE table_name = 'campaign_insights'
      AND constraint_name = 'campaign_insights_campaign_id_date_key'
    ) THEN
      ALTER TABLE campaign_insights ADD CONSTRAINT campaign_insights_campaign_id_date_key UNIQUE(campaign_id, date);
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
    -- Se as colunas date_start e date_stop existem, usar constraint com essas colunas
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.constraint_column_usage
      WHERE table_name = 'campaign_insights'
      AND constraint_name = 'campaign_insights_campaign_id_date_range_key'
    ) THEN
      ALTER TABLE campaign_insights ADD CONSTRAINT campaign_insights_campaign_id_date_range_key UNIQUE(campaign_id, date_start, date_stop);
    END IF;
  END IF;
END
$$;

-- Adicionar foreign key se necessário
DO $$
BEGIN
  -- Verificar se a coluna campaign_db_id existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'campaign_insights' 
    AND column_name = 'campaign_db_id'
  ) THEN
    -- Verificar se a referência já existe
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.constraint_column_usage ccu
      JOIN information_schema.table_constraints tc
      ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'campaign_insights'
      AND ccu.table_name = 'campaigns'
      AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
      ALTER TABLE campaign_insights ADD CONSTRAINT campaign_insights_campaign_db_id_fkey FOREIGN KEY (campaign_db_id) REFERENCES campaigns(id) ON DELETE CASCADE;
    END IF;
  END IF;
END
$$;

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_campaign_insights_campaign_id ON campaign_insights(campaign_id);

-- Criar índices apropriados com base nas colunas existentes
DO $$
BEGIN
  -- Verificar se a coluna date existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'campaign_insights' 
    AND column_name = 'date'
  ) THEN
    -- Criar índice para date
    CREATE INDEX IF NOT EXISTS idx_campaign_insights_date ON campaign_insights(date);
  END IF;
  
  -- Verificar se a coluna date_start existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'campaign_insights' 
    AND column_name = 'date_start'
  ) THEN
    -- Criar índice para date_start
    CREATE INDEX IF NOT EXISTS idx_campaign_insights_date_start ON campaign_insights(date_start);
  END IF;
  
  -- Verificar se a coluna date_stop existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'campaign_insights' 
    AND column_name = 'date_stop'
  ) THEN
    -- Criar índice para date_stop
    CREATE INDEX IF NOT EXISTS idx_campaign_insights_date_stop ON campaign_insights(date_stop);
  END IF;
  
  -- Verificar se data_start e date_stop existem para criar índice combinado
  IF EXISTS (
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
    -- Criar índice composto
    CREATE INDEX IF NOT EXISTS idx_campaign_insights_date_range ON campaign_insights(date_start, date_stop);
  END IF;
END
$$;
