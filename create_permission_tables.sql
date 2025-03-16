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
