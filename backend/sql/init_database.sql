-- Script consolidado para inicializar o banco de dados
-- Este script combina todos os scripts de inicialização e pode ser executado manualmente

-- Verificar se a pasta sql existe
CREATE SCHEMA IF NOT EXISTS public;

-- Incluir todos os scripts da pasta init-scripts em ordem
\i /docker-entrypoint-initdb.d/00_create_users_table.sql
\i /docker-entrypoint-initdb.d/01_create_ad_accounts_table.sql
\i /docker-entrypoint-initdb.d/02_create_campaigns_table.sql
\i /docker-entrypoint-initdb.d/03_create_campaign_insights_table.sql
\i /docker-entrypoint-initdb.d/04_create_integration_tables.sql

-- Incluir script de permissões
\i /app/create_permission_tables.sql

-- Confirmar todas as alterações
COMMIT;
