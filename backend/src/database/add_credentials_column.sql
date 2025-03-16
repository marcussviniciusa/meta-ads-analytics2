-- Add credentials column to user_integrations table
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS credentials JSONB;

-- Adiciona índice para melhorar a performance de consultas
CREATE INDEX IF NOT EXISTS idx_user_integrations_credentials ON user_integrations USING gin (credentials);

-- Comentário explicativo
COMMENT ON COLUMN user_integrations.credentials IS 'JSONB field to store API credentials and tokens';
