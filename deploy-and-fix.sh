#!/bin/bash

# Script para deploy e correção da aplicação Meta Ads Analytics

echo "Meta Ads Analytics - Script de Deploy e Correções"
echo "================================================="
echo

# Verificar se está rodando no Portainer
if [ -z "$PORTAINER_ENV" ]; then
  echo "Este script foi projetado para ser executado no ambiente de implantação."
  echo "Executando em modo de desenvolvimento local."
fi

echo "1. Reimplantando a stack com a configuração atualizada..."
docker stack deploy -c metaads-stack.yml metaads

echo "2. Aguardando o contêiner da API estar pronto..."
sleep 15

# Obter o ID do contêiner da API
API_CONTAINER=$(docker ps | grep metaads_api | head -n 1 | awk '{print $1}')

if [ -z "$API_CONTAINER" ]; then
  echo "Erro: Não foi possível encontrar o contêiner da API. Verifique se a stack foi implantada corretamente."
  exit 1
fi

echo "3. Iniciando o banco de dados e executando todas as migrações..."
docker exec $API_CONTAINER node /app/src/migrations/init-database.js

if [ $? -ne 0 ]; then
  echo "Erro: Falha ao inicializar o banco de dados. Verificando logs..."
  docker logs $API_CONTAINER --tail 100
  exit 1
fi

echo "4. Executando a migração específica para adicionar a coluna campaign_db_id..."
docker exec $API_CONTAINER node /app/src/migrations/add-campaign-db-id.js

echo "5. Verificando as respostas do endpoint da API..."
echo "Testando endpoint de saúde:"
curl -s -I https://api.speedfunnels.online/health | grep -i "content-type"

echo "Testando endpoint de integração:"
curl -s -I https://api.speedfunnels.online/api/integrations/sources | grep -i "content-type"

echo
echo "Implantação e correções concluídas!"
echo "Verifique se a API agora está retornando respostas JSON adequadas."
echo
echo "Você pode testar com: curl -s https://api.speedfunnels.online/health | jq"
echo "Ou verificar a resposta completa com: curl -s https://api.speedfunnels.online/api/integrations/sources"
echo

# Verificar a conexão do frontend com a API
echo "6. Verificando se o frontend consegue se comunicar com a API..."
FRONTEND_CONTAINER=$(docker ps | grep metaads_frontend | head -n 1 | awk '{print $1}')

if [ -n "$FRONTEND_CONTAINER" ]; then
  echo "Frontend encontrado. Verificando conexão com a API..."
  docker exec $FRONTEND_CONTAINER curl -s -I http://api:8080/health | grep -i "content-type"
else
  echo "Contêiner frontend não encontrado. Pulando verificação de conexão interna."
fi

echo
echo "Processo de deploy e correção concluído com sucesso!"
echo
