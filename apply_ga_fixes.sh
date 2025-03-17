#!/bin/bash

# Script para aplicar todas as correções ao problema do Google Analytics
# Este script deve ser executado a partir da raiz do projeto

echo "Aplicando correções para o Google Analytics..."

# Verificar se estamos na raiz do projeto
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
  echo "Erro: Este script deve ser executado a partir da raiz do projeto"
  exit 1
fi

# Backup dos arquivos antes de modificar
echo "Criando backups dos arquivos..."
BACKUP_DIR="ga_fixes_backup_$(date +%Y%m%d%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup dos arquivos do backend
if [ -f "backend/src/services/googleAnalyticsService.js" ]; then
  cp backend/src/services/googleAnalyticsService.js $BACKUP_DIR/
  echo "✓ Backup de googleAnalyticsService.js criado"
fi

# Backup dos arquivos do frontend
if [ -f "frontend/src/pages/Dashboard.js" ]; then
  cp frontend/src/pages/Dashboard.js $BACKUP_DIR/
  echo "✓ Backup de Dashboard.js criado"
fi

if [ -f "frontend/src/utils/gaFixUtils.js" ]; then
  cp frontend/src/utils/gaFixUtils.js $BACKUP_DIR/
  echo "✓ Backup de gaFixUtils.js criado"
fi

echo "Backups criados em: $BACKUP_DIR"

# 1. Correção do erro de sintaxe no googleAnalyticsService.js
echo "Corrigindo erro de sintaxe no googleAnalyticsService.js..."
sed -i -e '/}\);/ s/}\);//' backend/src/services/googleAnalyticsService.js

if [ $? -eq 0 ]; then
  echo "✓ Correção do erro de sintaxe aplicada com sucesso"
else
  echo "✗ Erro ao aplicar correção de sintaxe"
fi

# 2. Aplicar melhorias no frontend
echo "Aplicando melhorias no frontend..."

# Verificar se módulos necessários estão importados
if ! grep -q "transformTopPagesRows" frontend/src/pages/Dashboard.js; then
  # Atualizar a importação do gaFixUtils para incluir as novas funções
  sed -i '/import.*gaFixUtils/ s/fixGoogleAnalyticsData.*/fixGoogleAnalyticsData, transformTrafficSourceRows, transformTopPagesRows } from '\''..\/utils\/gaFixUtils'\'';/' frontend/src/pages/Dashboard.js
  echo "✓ Importação atualizada no Dashboard.js"
fi

# 3. Atualização manual requerida
echo "ATENÇÃO: Algumas alterações precisam ser feitas manualmente:"
echo "1. Atualize a função renderFunnelSection no arquivo Dashboard.js para usar processedTopPages"
echo "   Instruções detalhadas estão em: update_funnel_section.js"
echo 

echo "Todas as correções automáticas foram aplicadas!"
echo 
echo "Por favor, reinicie o servidor backend e frontend para aplicar as mudanças:"
echo "1. cd backend && npm run dev"
echo "2. cd frontend && npm start"
echo
echo "Para mais informações, consulte o arquivo RESTART_INSTRUCTIONS.md"
