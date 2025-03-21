#!/bin/bash

# Script para atualizar a stack no Portainer
echo "Atualizando stack Meta Ads Analytics no Portainer..."

# Informações para acessar o Portainer
# Nota: Você deve preencher estas variáveis com seus dados reais
PORTAINER_URL="http://localhost:9000"           # URL local do Portainer
PORTAINER_USERNAME="admin"                      # Usuário padrão
PORTAINER_PASSWORD="portainer123"              # Senha simplificada para desenvolvimento
STACK_NAME="meta-ads-stack"                     # Nome da stack no Portainer

# Obter token de autenticação
echo "Obtendo token de autenticação..."
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"${PORTAINER_USERNAME}\",\"Password\":\"${PORTAINER_PASSWORD}\"}" | jq -r .jwt)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "Erro ao obter token de autenticação. Verifique suas credenciais."
    exit 1
fi

echo "Token obtido com sucesso!"

# Obter ID da stack
echo "Obtendo ID da stack ${STACK_NAME}..."
STACK_ID=$(curl -s -X GET "${PORTAINER_URL}/api/stacks" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r ".[] | select(.Name==\"${STACK_NAME}\") | .Id")

if [ -z "$STACK_ID" ]; then
    echo "Erro: Stack ${STACK_NAME} não encontrada."
    exit 1
fi

echo "ID da stack ${STACK_NAME}: ${STACK_ID}"

# Atualizar a stack com o arquivo YAML atualizado
echo "Atualizando stack com o arquivo metaads-stack.yml..."

# Obter informações da stack atual para extrair o endpoint ID
STACK_INFO=$(curl -s -X GET "${PORTAINER_URL}/api/stacks/${STACK_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

ENDPOINT_ID=$(echo $STACK_INFO | jq -r .EndpointId)
COMPOSE_FILE_CONTENT=$(cat metaads-stack.yml | base64 -w 0)

# Atualizar a stack
RESPONSE=$(curl -s -X PUT "${PORTAINER_URL}/api/stacks/${STACK_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"StackFileContent\": \"${COMPOSE_FILE_CONTENT}\",
    \"Env\": [],
    \"Prune\": true
  }")

# Verificar a resposta
if [ "$(echo $RESPONSE | jq -r .Id)" == "$STACK_ID" ]; then
    echo "Stack atualizada com sucesso!"
else
    echo "Erro ao atualizar stack:"
    echo $RESPONSE | jq
    exit 1
fi

echo "Processo de atualização concluído!"
echo "Nota: Você pode precisar reiniciar os containers manualmente no Portainer."
