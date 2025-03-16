#!/bin/bash

# Script para executar a migração das tabelas de integração
echo "Iniciando migração do banco de dados..."

# Obter a chave de migração do ambiente
MIGRATION_KEY=$(grep MIGRATION_SECRET_KEY /home/m/meta-ads-analytics2/metaads-stack.yml | cut -d':' -f2 | tr -d ' ')

# Executar a requisição para a API de migração
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-migration-key: $MIGRATION_KEY" \
  http://localhost:8080/api/migrations/add-company-and-roles

echo "Agora vamos executar as migrações de integração..."

# Conectar ao container do PostgreSQL e executar o script SQL
cat << EOF > /tmp/run_integration_migration.sql
\i /docker-entrypoint-initdb.d/04_create_integration_tables.sql
EOF

# Este comando assume que você está usando o Docker
docker exec -it postgres psql -U postgres -d meta_ads -f /tmp/run_integration_migration.sql

echo "Migração concluída!"
