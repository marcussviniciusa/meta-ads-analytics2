-- Criação da tabela de tokens de usuário
CREATE TABLE IF NOT EXISTS user_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(50) DEFAULT 'meta',  -- 'meta', 'google', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source)
);

-- Criação da tabela de fontes de integração
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

-- Criação da tabela de integrações do usuário
CREATE TABLE IF NOT EXISTS user_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id INTEGER NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  is_connected BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_source_id ON user_integrations(source_id);
