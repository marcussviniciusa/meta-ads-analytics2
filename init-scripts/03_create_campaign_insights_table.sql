-- Criação da tabela de insights das campanhas
CREATE TABLE IF NOT EXISTS campaign_insights (
  id SERIAL PRIMARY KEY,
  campaign_db_id INTEGER NOT NULL,
  campaign_id VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date),
  FOREIGN KEY (campaign_db_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_campaign_insights_campaign_id ON campaign_insights(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_date ON campaign_insights(date);
