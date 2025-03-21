#!/bin/bash
set -e

echo "===== Reiniciando serviços Meta Ads Analytics ====="
echo "Aplicando alterações de configuração do Traefik..."

# Verifica se o arquivo de stack está presente
if [ ! -f "metaads-stack.yml" ]; then
  echo "Erro: Arquivo metaads-stack.yml não encontrado!"
  exit 1
fi

echo "Parando serviços Docker..."
docker-compose -f metaads-stack.yml down

echo "Limpando cache do Traefik..."
rm -rf /home/m/meta-ads-analytics2/data/traefik/acme.json || true
touch /home/m/meta-ads-analytics2/data/traefik/acme.json
chmod 600 /home/m/meta-ads-analytics2/data/traefik/acme.json

echo "Reiniciando serviços..."
docker-compose -f metaads-stack.yml up -d

echo "Aguardando inicialização dos serviços (5 segundos)..."
sleep 5

# Verificando status
echo "Verificando logs do Traefik para garantir que a configuração está correta..."
docker logs $(docker ps -qf "name=traefik") | tail -n 20

echo "===== Reinicialização concluída! ====="
echo "Serviços reiniciados com sucesso!"
echo "Acesse o frontend em: https://app.speedfunnels.online"
echo "A API está disponível em: https://api.speedfunnels.online"
echo "Para verificar os logs do API, use: docker-compose -f metaads-stack.yml logs -f api"
echo "Para verificar os logs do Traefik, use: docker-compose -f metaads-stack.yml logs -f traefik"
