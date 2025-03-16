#!/bin/bash

# Script para inicializar o banco de dados com todos os arquivos SQL

# Credenciais do banco de dados (lendo do arquivo .env)
source ../.env

# Se não conseguir ler do .env, usar valores padrão
DB_HOST=${POSTGRES_HOST:-77.37.41.106}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-speedfunnels_v2}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-"Marcus1911!!Marcus"}

echo "Inicializando banco de dados $DB_NAME no servidor $DB_HOST..."

# Executa cada arquivo SQL na ordem correta
for sql_file in $(ls sql/*.sql | sort); do
  echo "Executando $sql_file..."
  PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $sql_file
done

echo "Inicialização do banco de dados concluída!"
