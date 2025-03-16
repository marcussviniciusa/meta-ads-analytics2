#!/bin/bash

# Script para executar a migração das tabelas de integração
echo "Iniciando migração das tabelas de integração..."

# Extrair a chave de migração do arquivo stack
MIGRATION_KEY=$(grep MIGRATION_SECRET_KEY /home/m/meta-ads-analytics2/metaads-stack.yml | cut -d':' -f2 | sed 's/^ *//' | tr -d '\r\n')

echo "Usando chave de migração: $MIGRATION_KEY"

# URL da API - ajuste conforme necessário
API_URL="https://api.speedfunnels.online/api/migrations/add-integration-tables"

# Executar a requisição para a API de migração
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-migration-key: $MIGRATION_KEY" \
  $API_URL

echo ""
echo "Requisição de migração enviada. Verifique os logs do backend para confirmar o sucesso."
echo "Após a migração, redeploy o stack para garantir que as novas tabelas sejam usadas."
