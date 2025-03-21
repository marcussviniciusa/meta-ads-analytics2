#!/bin/sh

# Script para verificar se as correções nos endpoints problemáticos foram aplicadas
echo "===== VERIFICAÇÃO DE ENDPOINTS DA API ====="

# Testar endpoint de propriedades Google Analytics
echo "\n=== Testando endpoint /api/integrations/google-analytics/properties ==="
curl -s -I -X GET "https://api.speedfunnels.online/api/integrations/google-analytics/properties" \
  -H "Origin: https://app.speedfunnels.online" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Testar endpoint de empresas
echo "\n=== Testando endpoint /api/companies ==="
curl -s -I -X GET "https://api.speedfunnels.online/api/companies" \
  -H "Origin: https://app.speedfunnels.online" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

echo "\n\n=== Instruções para aplicar as alterações ==="
echo "Para aplicar as mudanças da configuração do Traefik, você precisa:"
echo "1. Reconstruir os contêineres usando docker-compose"
echo "   docker-compose -f metaads-stack.yml up -d --force-recreate api frontend"
echo ""
echo "2. Se ainda houver problemas, verifique os logs do Traefik:"
echo "   docker logs \$(docker ps | grep traefik | awk '{print \$1}')"
echo ""
echo "3. Depois de aplicar as alterações, teste novamente acessando o dashboard na aplicação"
