-- Tabelas para a aplicação de análise de Meta Ads

-- Usuários
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokens de acesso dos usuários
CREATE TABLE user_tokens (
  user_id INTEGER REFERENCES users(id),
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
);

-- Contas de anúncios
CREATE TABLE ad_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  account_id VARCHAR(50) NOT NULL,
  name VARCHAR(100),
  status INTEGER,
  business_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, account_id)
);

-- Campanhas
CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  account_id VARCHAR(50) NOT NULL,
  campaign_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  objective VARCHAR(50),
  status VARCHAR(20),
  created_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id, campaign_id)
);

-- Conjuntos de anúncios
CREATE TABLE ad_sets (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(50) NOT NULL,
  ad_set_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20),
  bid_strategy VARCHAR(50),
  daily_budget DECIMAL(14,2),
  lifetime_budget DECIMAL(14,2),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (campaign_id, ad_set_id)
);

-- Anúncios
CREATE TABLE ads (
  id SERIAL PRIMARY KEY,
  ad_set_id VARCHAR(50) NOT NULL,
  ad_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20),
  created_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (ad_set_id, ad_id)
);

-- Insights de campanha
CREATE TABLE campaign_insights (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  ctr DECIMAL(10,6),
  cpc DECIMAL(10,4),
  spend DECIMAL(14,4),
  reach INTEGER,
  frequency DECIMAL(10,4),
  unique_clicks INTEGER,
  cost_per_unique_click DECIMAL(14,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (campaign_id, date)
);

-- Insights de conjunto de anúncios
CREATE TABLE ad_set_insights (
  id SERIAL PRIMARY KEY,
  ad_set_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  ctr DECIMAL(10,6),
  cpc DECIMAL(10,4),
  spend DECIMAL(14,4),
  reach INTEGER,
  frequency DECIMAL(10,4),
  unique_clicks INTEGER,
  cost_per_unique_click DECIMAL(14,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (ad_set_id, date)
);

-- Insights de anúncios
CREATE TABLE ad_insights (
  id SERIAL PRIMARY KEY,
  ad_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  ctr DECIMAL(10,6),
  cpc DECIMAL(10,4),
  spend DECIMAL(14,4),
  reach INTEGER,
  frequency DECIMAL(10,4),
  unique_clicks INTEGER,
  cost_per_unique_click DECIMAL(14,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (ad_id, date)
);

-- Fontes de integração
CREATE TABLE integration_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Integrações por usuário
CREATE TABLE user_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  source_id INTEGER REFERENCES integration_sources(id),
  is_connected BOOLEAN DEFAULT false,
  credentials JSONB,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, source_id)
);

-- Relatórios salvos
CREATE TABLE saved_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL,
  filters JSONB,
  columns JSONB,
  sort_by JSONB,
  date_range JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs de sincronização
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  source_id INTEGER REFERENCES integration_sources(id),
  status VARCHAR(20) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir fontes de integração disponíveis
INSERT INTO integration_sources (name, display_name, description) 
VALUES 
('meta', 'Meta Ads', 'Integração com Facebook e Instagram Ads via API de Marketing do Meta'),
('google_analytics', 'Google Analytics', 'Integração com Google Analytics para dados de website');

-- Criar índices para melhorar performance de consultas
CREATE INDEX idx_campaign_insights_date ON campaign_insights(date);
CREATE INDEX idx_ad_set_insights_date ON ad_set_insights(date);
CREATE INDEX idx_ad_insights_date ON ad_insights(date);
CREATE INDEX idx_user_integrations_user ON user_integrations(user_id);
CREATE INDEX idx_campaign_account ON campaigns(account_id);
CREATE INDEX idx_ad_sets_campaign ON ad_sets(campaign_id);
CREATE INDEX idx_ads_ad_set ON ads(ad_set_id);
