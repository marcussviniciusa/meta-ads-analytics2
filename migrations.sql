-- Script de migração para criar as tabelas que estão faltando
-- Este script assume que as tabelas 'users' e 'companies' já existem

-- Criando ad_accounts
CREATE TABLE IF NOT EXISTS ad_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  account_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(10),
  timezone VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ad_accounts_user_id ON ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_account_id ON ad_accounts(account_id);

-- Criando campaigns
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

CREATE INDEX IF NOT EXISTS idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_id ON campaigns(campaign_id);

-- Criando campaign_insights
CREATE TABLE IF NOT EXISTS campaign_insights (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  ad_account_id INTEGER NOT NULL,
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  impressions BIGINT,
  clicks BIGINT,
  spend NUMERIC(14, 2),
  cpc NUMERIC(14, 2),
  cpm NUMERIC(14, 2),
  ctr NUMERIC(14, 4),
  reach BIGINT,
  frequency NUMERIC(14, 2),
  unique_clicks BIGINT,
  cost_per_unique_click NUMERIC(14, 2),
  unique_ctr NUMERIC(14, 4),
  unique_impressions BIGINT,
  conversions BIGINT,
  cost_per_conversion NUMERIC(14, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date_start, date_stop),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaign_insights_campaign_id ON campaign_insights(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_date_range ON campaign_insights(date_start, date_stop);

-- Criando tabelas de integração
CREATE TABLE IF NOT EXISTS google_analytics_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  token_expiry TIMESTAMPTZ,
  account_id VARCHAR(100),
  account_name VARCHAR(255),
  property_id VARCHAR(100),
  property_name VARCHAR(255),
  view_id VARCHAR(100),
  view_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_id, property_id, view_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ga_accounts_user_id ON google_analytics_accounts(user_id);

-- Criando user_tokens
CREATE TABLE IF NOT EXISTS user_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(50) DEFAULT 'meta',  -- 'meta', 'google', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);

-- Criando integration_sources
CREATE TABLE IF NOT EXISTS integration_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir fontes de integração padrão
INSERT INTO integration_sources (name, display_name, description, is_active)
VALUES 
  ('meta_ads', 'Meta Ads', 'Integração com Meta (Facebook e Instagram) Ads', TRUE),
  ('google_analytics', 'Google Analytics', 'Integração com Google Analytics', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Criando user_integrations
CREATE TABLE IF NOT EXISTS user_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  source_id INTEGER NOT NULL,
  is_connected BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES integration_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_source_id ON user_integrations(source_id);

-- Criando google_tokens
CREATE TABLE IF NOT EXISTS google_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  account_id VARCHAR(100),
  property_id VARCHAR(100),
  view_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON google_tokens(user_id);

-- Criando permissions se não existirem
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Inserir permissões padrão se não existirem
INSERT INTO permissions (name, description)
VALUES 
  ('manage_users', 'Gerenciar usuários'),
  ('manage_accounts', 'Gerenciar contas de anúncio'),
  ('view_reports', 'Visualizar relatórios'),
  ('export_data', 'Exportar dados')
ON CONFLICT (name) DO NOTHING;

-- Inserir roles padrão se não existirem
INSERT INTO roles (name, description)
VALUES 
  ('admin', 'Administrador com acesso completo'),
  ('manager', 'Gerente com acesso parcial'),
  ('viewer', 'Usuário com acesso de visualização')
ON CONFLICT (name) DO NOTHING;

-- Associar permissões aos roles
-- Admin tem todas as permissões
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'admin'), id FROM permissions
ON CONFLICT DO NOTHING;

-- Manager pode gerenciar contas e ver relatórios
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'manager'), 
  id 
FROM permissions 
WHERE name IN ('manage_accounts', 'view_reports', 'export_data')
ON CONFLICT DO NOTHING;

-- Viewer só pode ver relatórios
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'viewer'), 
  id 
FROM permissions 
WHERE name IN ('view_reports')
ON CONFLICT DO NOTHING;

-- Confirmar todas as alterações
COMMIT;
