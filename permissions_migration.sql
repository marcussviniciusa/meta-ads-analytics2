-- Criar tabela de permissões para contas de anúncio
CREATE TABLE IF NOT EXISTS user_ad_account_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id VARCHAR(255) NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, account_id)
);

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_ad_account_permissions_user_id ON user_ad_account_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_account_permissions_account_id ON user_ad_account_permissions(account_id);

-- Criar tabela de permissões para propriedades Google Analytics
CREATE TABLE IF NOT EXISTS user_ga_property_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR(255) NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_ga_property_permissions_user_id ON user_ga_property_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ga_property_permissions_property_id ON user_ga_property_permissions(property_id);

-- Criar tabela de tokens de usuário para Meta Ads
CREATE TABLE IF NOT EXISTS user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_provider ON user_tokens(provider);

-- Criar tabela de papéis de usuário (user_roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Criar tabela de integrações de usuário
CREATE TABLE IF NOT EXISTS user_integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id INTEGER NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, source_id)
);

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_source_id ON user_integrations(source_id);
