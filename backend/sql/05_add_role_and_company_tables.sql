-- Criação da tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adição do campo role e company_id na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- Índice para busca por company_id
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Adicionando um super admin inicial (senha temporária: Admin2025!)
INSERT INTO companies (name) VALUES ('Admin') ON CONFLICT DO NOTHING;

-- Criação de função para adicionar super admin
CREATE OR REPLACE FUNCTION create_super_admin()
RETURNS void AS $$
DECLARE
    admin_company_id INTEGER;
    admin_exists BOOLEAN;
BEGIN
    -- Obter ID da empresa Admin
    SELECT id INTO admin_company_id FROM companies WHERE name = 'Admin';
    
    -- Verificar se já existe um super admin
    SELECT EXISTS (SELECT 1 FROM users WHERE role = 'super_admin') INTO admin_exists;
    
    -- Se não existir super admin, criar um
    IF NOT admin_exists THEN
        INSERT INTO users (email, password_hash, name, role, company_id)
        VALUES (
            'admin@speedfunnels.marcussviniciusa.cloud',
            '$2a$10$xK7cT5XZtTN.azs7mlkXs.eSJgH9GrPnhw5DXA4FgbN11xO5iBD3y', -- bcrypt hash for Admin2025!
            'Super Admin',
            'super_admin',
            admin_company_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Executar função para criar super admin
SELECT create_super_admin();
