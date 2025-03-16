FROM node:18-alpine

WORKDIR /app

# Instalar dependências necessárias
RUN apk add --no-cache postgresql-client

COPY package*.json ./

RUN npm install --only=production

# Copiar o código-fonte
COPY . .

# Copiar o script de migração SQL
COPY ./sql/migrations.sql /app/migrations.sql

# Criar um script de inicialização simples separado
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Verificando se é necessário executar migrações..."' >> /app/start.sh && \
    echo 'if [ -f /app/migrations.sql ]; then' >> /app/start.sh && \
    echo '  echo "Tentando executar migrações..."' >> /app/start.sh && \
    echo '  # Tentativas para aguardar o PostgreSQL iniciar' >> /app/start.sh && \
    echo '  for i in 1 2 3 4 5; do' >> /app/start.sh && \
    echo '    echo "Tentativa $i de conectar ao PostgreSQL..."' >> /app/start.sh && \
    echo '    if PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "\\q" 2>/dev/null; then' >> /app/start.sh && \
    echo '      echo "Conectado ao PostgreSQL! Executando migrações..."' >> /app/start.sh && \
    echo '      PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -f /app/migrations.sql' >> /app/start.sh && \
    echo '      echo "Migrações concluídas!"' >> /app/start.sh && \
    echo '      break' >> /app/start.sh && \
    echo '    else' >> /app/start.sh && \
    echo '      echo "PostgreSQL ainda não está disponível. Tentando novamente em 5 segundos..."' >> /app/start.sh && \
    echo '      sleep 5' >> /app/start.sh && \
    echo '    fi' >> /app/start.sh && \
    echo '  done' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Iniciar a aplicação' >> /app/start.sh && \
    echo 'exec node src/app.js' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000

# Usar o script de inicialização como ponto de entrada
CMD ["/app/start.sh"]
