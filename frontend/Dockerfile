FROM node:18-alpine as build

WORKDIR /app

# Apenas copia os arquivos de configuração de dependências primeiro
# para aproveitar o cache em camadas do Docker
COPY package.json package-lock.json ./

# Instala as dependências com flags para otimizar espaço
RUN npm install --legacy-peer-deps --no-audit --no-fund && \
    npm install ajv@8.12.0 --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

# Copia apenas os arquivos necessários para o build
COPY public ./public
COPY src ./src
COPY .env* ./

# A variável de ambiente será obtida do arquivo .env.production
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL:-https://api.speedfunnels.online/api}

# Executa o build da aplicação
RUN npm run build

# Estágio de produção - usa uma imagem menor do nginx
FROM nginx:alpine

# Copia apenas os arquivos de build necessários
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Configuração para SPA routing
RUN mkdir -p /usr/share/nginx/html
COPY --from=build /app/public/_redirects /usr/share/nginx/html/_redirects

# Expõe a porta 80
EXPOSE 80

# Inicializa o nginx
CMD ["nginx", "-g", "daemon off;"]
