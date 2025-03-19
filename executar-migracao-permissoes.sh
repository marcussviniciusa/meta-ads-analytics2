#!/bin/bash

# Script para executar a migração das tabelas de permissões de usuário
echo "Iniciando migração das tabelas de permissões de usuário..."

# Extrair a chave de migração do arquivo stack
MIGRATION_KEY=$(grep MIGRATION_SECRET_KEY /home/m/meta-ads-analytics2/metaads-stack.yml | cut -d':' -f2 | sed 's/^ *//' | tr -d '\r\n')

echo "Usando chave de migração: $MIGRATION_KEY"

# URL da API - ajuste conforme necessário
API_URL="https://api.speedfunnels.online/api/migrations/add-permission-tables"

# Executar a requisição para a API de migração
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-migration-key: $MIGRATION_KEY" \
  --data-binary "{\"migrationScript\": \"$(cat /home/m/meta-ads-analytics2/permissions_migration.sql | tr -d '\n' | sed 's/"/\\"/g')\"}" \
  $API_URL

echo ""
echo "Requisição de migração enviada. Verifique os logs do backend para confirmar o sucesso."
echo "Após a migração, reinicie o backend para garantir que as novas tabelas sejam usadas."
