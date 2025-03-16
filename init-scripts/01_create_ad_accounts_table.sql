-- Criação da tabela de contas de anúncios
CREATE TABLE IF NOT EXISTS ad_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id VARCHAR(100) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  currency VARCHAR(10),
  timezone VARCHAR(100),
  status INTEGER,
  status_text VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_ad_accounts_user_id ON ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_account_id ON ad_accounts(account_id);
