#!/bin/bash

# Script para inicializar o banco de dados com todas as tabelas necessárias
# Uso: ./init_database.sh

echo "Inicializando banco de dados SpeedFunnels..."

# Carregar variáveis de ambiente do arquivo .env
export $(grep -v '^#' .env | xargs)

# Exibir informações de conexão (sem mostrar a senha)
echo "Conectando ao banco de dados:"
echo "Host: $POSTGRES_HOST"
echo "Banco: $POSTGRES_DB"
echo "Usuário: $POSTGRES_USER"

# Verificar se o psql está instalado
if ! command -v psql &> /dev/null; then
    echo "Erro: psql não está instalado. Por favor, instale o cliente PostgreSQL."
    exit 1
fi

# Executar o script SQL principal
echo "Criando tabelas no banco de dados..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f ./backend/sql/init_database.sql

# Verificar se houve erro
if [ $? -eq 0 ]; then
    echo "Inicialização do banco de dados concluída com sucesso!"
else
    echo "Erro ao inicializar o banco de dados. Verifique as credenciais e tente novamente."
    exit 1
fi

# Criar usuário admin se não existir
echo "Verificando usuário admin..."
ADMIN_CHECK=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM users WHERE email = '$SUPER_ADMIN_EMAIL';")

if [ $ADMIN_CHECK -eq 0 ]; then
    echo "Criando usuário administrador..."
    
    # Aqui você pode adicionar o código para criar o usuário administrador
    # Exemplo (substitua pelo método correto de hash):
    # PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "INSERT INTO users (email, password_hash, name, role) VALUES ('$SUPER_ADMIN_EMAIL', 'hash_da_senha', 'Administrador', 'admin');"
    
    echo "Usuário administrador criado com sucesso!"
fi

echo "Configuração do banco de dados concluída!"
