#!/bin/sh

# Script para diagnóstico de problemas de CORS/Roteamento
echo "===== DIAGNÓSTICO DE PROBLEMAS DE CORS E ROTEAMENTO ====="

echo "\n=== Verificando headers da API ==="
curl -s -I -X OPTIONS https://api.speedfunnels.online/api/integrations/google-analytics/properties \
  -H "Origin: https://app.speedfunnels.online" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type"

echo "\n\n=== Verificando resposta da API (Propriedades GA) ==="
curl -s -X GET https://api.speedfunnels.online/api/integrations/google-analytics/properties \
  -H "Origin: https://app.speedfunnels.online" \
  -H "Authorization: Bearer $(cat /tmp/sample_token.txt 2>/dev/null || echo 'TOKEN_NAO_ENCONTRADO')" \
  | head -n 20

echo "\n\n=== Verificando configuração do Traefik (roteamento) ==="
# Verificar se estamos em um contêiner Docker
if [ -f /.dockerenv ]; then
  echo "Executando dentro de um contêiner Docker. Algumas verificações podem ser limitadas."
else
  # Obter rotas do Traefik via Docker
  echo "\nRoteamento do Traefik para a API:"
  docker exec $(docker ps | grep traefik | awk '{print $1}') traefik version 2>/dev/null || echo "Traefik não encontrado ou não acessível"
fi

echo "\n=== Verificando configuração CORS no backend ==="
grep -n "cors" /home/m/meta-ads-analytics2/backend/src/app.js 2>/dev/null || echo "Arquivo app.js não encontrado"

echo "\n=== Verificando logs do backend ==="
echo "Para verificar os logs do contêiner do backend, execute:"
echo "  docker logs \$(docker ps | grep meta-ads-backend | awk '{print \$1}') 2>&1 | grep -i 'cors\\|error' | tail -n 20"

echo "\n=== Recomendações para correção ==="
echo "1. Verifique se as configurações de CORS no Traefik e no backend estão alinhadas"
echo "2. Confirme que o Middleware CORS no Traefik está sendo aplicado corretamente"
echo "3. Verifique se as rotas para /api/integrations/google-analytics estão configuradas"
echo "4. Certifique-se que o Content-Type: application/json está sendo definido corretamente"
