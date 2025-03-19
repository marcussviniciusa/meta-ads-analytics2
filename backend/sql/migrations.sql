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

-- Garantindo que a tabela ad_accounts tenha todas as colunas necessárias
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS account_name VARCHAR(255);
-- Verifica se já existe a coluna name, se não existir, renomeia account_name para name
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'ad_accounts' AND column_name = 'name'
    ) THEN
        -- A coluna name já existe, não faz nada
        RAISE NOTICE 'Coluna name já existe na tabela ad_accounts';
    ELSE
        -- Verifica se account_name tem conteúdo
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'ad_accounts' AND column_name = 'account_name'
        ) THEN
            -- Renomeia account_name para name
            ALTER TABLE ad_accounts RENAME COLUMN account_name TO name;
            RAISE NOTICE 'Coluna account_name renomeada para name';
        ELSE
            -- Cria a coluna name diretamente
            ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS name VARCHAR(255);
            RAISE NOTICE 'Coluna name adicionada à tabela ad_accounts';
        END IF;
    END IF;
END
$$;

-- Adiciona outras colunas necessárias na tabela ad_accounts se não existirem
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS business_id VARCHAR(100);
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS amount_spent NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS account_status INTEGER DEFAULT 1;

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

-- Adicionando coluna credentials para armazenar tokens e credenciais de API
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS credentials JSONB;
CREATE INDEX IF NOT EXISTS idx_user_integrations_credentials ON user_integrations USING gin (credentials);
COMMENT ON COLUMN user_integrations.credentials IS 'JSONB field to store API credentials and tokens';

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

-- Criando tabela para propriedades do Google Analytics
CREATE TABLE IF NOT EXISTS ga_properties (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  account_id VARCHAR(100) NOT NULL,
  account_name VARCHAR(255),
  property_id VARCHAR(100) NOT NULL,
  property_name VARCHAR(255),
  property_type VARCHAR(50),
  parent_account VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_ga_properties_user_id ON ga_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_ga_properties_property_id ON ga_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_ga_properties_account_id ON ga_properties(account_id);

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

-- Tabela para permissões de contas de anúncio do Meta
CREATE TABLE IF NOT EXISTS user_ad_account_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_id_ad FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by_ad FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT uk_user_ad_account UNIQUE(user_id, account_id)
);

-- Tabela para permissões de propriedades do Google Analytics
CREATE TABLE IF NOT EXISTS user_ga_property_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  property_id VARCHAR(100) NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_id_ga FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by_ga FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT uk_user_ga_property UNIQUE(user_id, property_id)
);

-- Índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_user_ad_account_permissions_user_id ON user_ad_account_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ad_account_permissions_account_id ON user_ad_account_permissions(account_id);

CREATE INDEX IF NOT EXISTS idx_user_ga_property_permissions_user_id ON user_ga_property_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ga_property_permissions_property_id ON user_ga_property_permissions(property_id);

-- Confirmar todas as alterações
COMMIT;
