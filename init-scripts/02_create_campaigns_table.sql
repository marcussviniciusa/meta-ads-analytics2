-- Criação da tabela de campanhas
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  ad_account_id INTEGER NOT NULL,
  account_id VARCHAR(100) NOT NULL,
  campaign_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  objective VARCHAR(100),
  status VARCHAR(50),
  daily_budget NUMERIC(14, 2),
  lifetime_budget NUMERIC(14, 2),
  created_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, campaign_id),
  FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id) ON DELETE CASCADE
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_id ON campaigns(campaign_id);
