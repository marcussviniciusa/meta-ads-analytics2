-- SQL para criar as tabelas de permissões que estão faltando

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
CREATE INDEX IF NOT EXISTS idx_user_ga_property_permissions_user_id ON user_ga_property_permissions(user_id);

-- Tabela de tokens de usuário para Meta Ads
CREATE TABLE IF NOT EXISTS user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_id_tokens FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_provider UNIQUE(user_id, provider)
);

-- Tabela de papéis de usuário (user_roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    CONSTRAINT fk_user_id_roles FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_created_by_roles FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT uk_user_role UNIQUE(user_id, role_id)
);

-- Tabela de integrações de usuário
CREATE TABLE IF NOT EXISTS user_integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    external_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_id_integrations FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_source_id FOREIGN KEY (source_id) REFERENCES integration_sources(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_source UNIQUE(user_id, source_id)
);

-- Índices adicionais para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_provider ON user_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_source_id ON user_integrations(source_id);
