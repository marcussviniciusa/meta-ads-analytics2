# Guia de Deploy do SpeedFunnels

Este guia contém instruções detalhadas para fazer o deploy do SpeedFunnels em uma nova VPS usando Portainer, Traefik e PostgreSQL.

## 📋 Pré-requisitos

- Uma VPS com Docker e Docker Compose instalados
- Portainer instalado e configurado
- Traefik configurado como proxy reverso
- PostgreSQL (pode ser instalado na VPS ou usar o contêiner Docker)
- Domínios configurados para API e Frontend

## 🚀 Passo a Passo para Deploy

### 1. Preparando os Arquivos

1. Clone este repositório na sua VPS:
   ```bash
   git clone https://github.com/seu-usuario/speedfunnels.git
   cd speedfunnels
   ```

2. Copie o arquivo `.env.example` para `.env` e configure as variáveis:
   ```bash
   cp .env.example .env
   nano .env  # ou use outro editor para modificar o arquivo
   ```

3. Configure todas as variáveis no arquivo `.env`, especialmente:
   - Credenciais do PostgreSQL
   - Credenciais do Redis
   - Chaves de API (Facebook, Google)
   - Domínios para API e Frontend

### 2. Deploy via Portainer

1. **Acesse o Portainer** na sua VPS (geralmente em `https://portainer.seu-dominio.com`)

2. **Navegue até "Stacks"** no menu lateral

3. **Clique em "Add stack"**

4. Preencha as informações:
   - **Nome**: `speedfunnels`
   - **Build method**: `Upload from file` (selecione o arquivo `speedfunnels-stack.yml`)
   - **Environment variables**: Ative "Use .env file" e faça upload do arquivo `.env` configurado

5. **Clique em "Deploy the stack"**

6. O Portainer iniciará os serviços na seguinte ordem:
   - Primeiro o serviço `db-init` que executará as migrações do banco de dados
   - Em seguida, a API e o Frontend

### 3. Verificando o Deploy

1. **Verificar os logs do serviço db-init** para confirmar que as tabelas foram criadas com sucesso

2. **Verificar os logs da API** para confirmar que está conectando corretamente ao banco de dados

3. **Acessar o Frontend** em `https://seu-dominio-frontend` e tentar fazer login com as credenciais de administrador configuradas no arquivo `.env`

## 🔄 Deploy em uma Nova VPS

Para fazer deploy em uma nova VPS, basta repetir o processo acima, prestando atenção especial a:

1. **Usar novas credenciais de banco de dados**: atualize as variáveis `POSTGRES_HOST`, `POSTGRES_USER` e `POSTGRES_PASSWORD` no arquivo `.env`

2. **Configurar novos domínios**: atualize `API_DOMAIN` e `FRONTEND_DOMAIN` para os domínios da nova instalação

3. O serviço `db-init` garantirá que todas as tabelas necessárias sejam criadas automaticamente no novo banco de dados PostgreSQL

## 🛠️ Solução de Problemas

### Problema: Falha na inicialização do banco de dados

1. Verifique se o PostgreSQL está acessível no host e porta especificados
2. Verifique as credenciais do PostgreSQL
3. Examine os logs do serviço `db-init` para ver erros específicos

### Problema: Erro 500 ao tentar fazer login

1. Verifique se todas as tabelas foram criadas corretamente
2. Verifique as credenciais do banco de dados no arquivo `.env`
3. Examine os logs da API para identificar erros específicos

### Problema: Problemas de CORS

1. Verifique se os domínios estão configurados corretamente nas variáveis de ambiente
2. Verifique se o Traefik está aplicando corretamente os cabeçalhos CORS

## 📄 Manutenção do Banco de Dados

Para futuras atualizações no esquema do banco de dados:

1. Atualize o arquivo `migrations.sql` com as novas alterações
2. Faça redeploy do stack ou execute manualmente o script SQL

## 🔒 Segurança

1. Nunca compartilhe o arquivo `.env` contendo credenciais
2. Mantenha as chaves de API do Facebook e Google seguras
3. Altere regularmente a senha do administrador
4. Mantenha o PostgreSQL configurado para aceitar conexões apenas de IPs confiáveis
