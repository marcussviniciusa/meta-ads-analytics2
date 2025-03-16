const { google } = require('googleapis');
const analyticsData = google.analyticsdata('v1beta');
const analyticsAdmin = google.analyticsadmin('v1beta');
const PermissionService = require('./permissionService');

class GoogleAnalyticsService {
  constructor(pgPool, redisClient) {
    this.pgPool = pgPool;
    this.redisClient = redisClient;
    this.permissionService = new PermissionService(pgPool);
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `https://apispeed.marcussviniciusa.cloud/api/google-analytics/callback`
    );
  }

  /**
   * Gera URL para autenticação do Google
   */
  getAuthUrl(userId) {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/analytics.readonly'],
      state,
      prompt: 'consent' // Forçar exibição de tela de consentimento para garantir refresh_token
    });
  }

  /**
   * Processa o callback da autenticação OAuth
   * @param {string} code - Código de autorização do Google
   * @param {string|object} userId - ID do usuário ou objeto com userId
   * @returns {Promise<Object>} Resultado do processamento
   */
  async handleCallback(code, userId) {
    try {
      console.log('GoogleAnalyticsService.handleCallback chamado com:', { code, userId });
      
      // Normalizar userId
      const normalizedUserId = typeof userId === 'object' ? userId.userId : userId;
      console.log('ID do usuário normalizado:', normalizedUserId);
      
      // Trocar código por tokens de acesso e refresh
      const { tokens } = await this.oauth2Client.getToken(code);
      console.log('Tokens obtidos do Google:', {
        access_token: tokens.access_token ? 'presente' : 'ausente',
        refresh_token: tokens.refresh_token ? 'presente' : 'ausente',
        expires_in: tokens.expires_in
      });
      
      if (!tokens.access_token) {
        throw new Error('Tokens de acesso não obtidos');
      }
      
      // Salvar tokens
      await this.saveTokens(normalizedUserId, tokens);
      console.log('Tokens salvos com sucesso para o usuário', normalizedUserId);
      
      // Buscar e salvar propriedades imediatamente
      try {
        console.log('Iniciando busca de propriedades do GA4 após autenticação');
        await this.fetchAndSaveProperties(normalizedUserId, tokens.access_token);
        console.log('Propriedades do GA4 salvas com sucesso');
      } catch (propertyError) {
        console.error('Erro ao buscar propriedades após autenticação:', propertyError);
        // Continuamos mesmo se houver erro na busca de propriedades
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro no callback do Google Analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva os tokens no Redis e PostgreSQL
   */
  async saveTokens(userId, tokens) {
    try {
      // Salvar access_token no Redis (temporário)
      if (tokens.access_token) {
        const redisKey = `google_access_token:${userId}`;
        await this.redisClient.set(redisKey, tokens.access_token, 'EX', tokens.expires_in || 3600);
      }
      
      // Salvar refresh_token no PostgreSQL (permanente)
      if (tokens.refresh_token) {
        await this.pgPool.query(
          `INSERT INTO google_tokens (user_id, refresh_token, created_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) 
           DO UPDATE SET refresh_token = $2, created_at = NOW()`,
          [userId, tokens.refresh_token]
        );
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar tokens Google:', error);
      throw error;
    }
  }

  /**
   * Obtém token de acesso válido para um usuário
   */
  async getAccessToken(userId) {
    try {
      // Verificar se existe token no Redis
      const cachedToken = await this.redisClient.get(`google_access_token:${userId}`);
      
      if (cachedToken) {
        return cachedToken;
      }
      
      // Se não existir no Redis, buscar refresh token no PostgreSQL
      const result = await this.pgPool.query(
        'SELECT refresh_token FROM google_tokens WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0 || !result.rows[0].refresh_token) {
        throw new Error('Usuário não autenticado com Google Analytics');
      }
      
      // Usar refresh token para obter novo access token
      this.oauth2Client.setCredentials({
        refresh_token: result.rows[0].refresh_token
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (credentials.access_token) {
        // Salvar novo access token no Redis
        await this.redisClient.set(
          `google_access_token:${userId}`,
          credentials.access_token,
          'EX',
          credentials.expires_in || 3600
        );
        
        return credentials.access_token;
      } else {
        throw new Error('Falha ao obter novo token de acesso');
      }
    } catch (error) {
      console.error('Erro ao obter access token do Google:', error);
      throw error;
    }
  }

  /**
   * Busca e salva propriedades do GA4 no banco de dados
   */
  async fetchAndSaveProperties(userId, accessToken) {
    try {
      console.log(`Buscando propriedades do GA4 para o usuário ${userId}`);
      
      // Configurar cliente do Google com o token
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      // Buscar contas do GA4
      console.log('Solicitando accountSummaries do Google Analytics Admin API');
      const accountSummaries = await analyticsAdmin.accountSummaries.list({
        auth: this.oauth2Client
      });
      
      console.log('Resposta recebida do Google Analytics:', JSON.stringify(accountSummaries.data));
      
      if (!accountSummaries.data.accountSummaries || accountSummaries.data.accountSummaries.length === 0) {
        console.log('Nenhuma conta do GA4 encontrada para o usuário');
        return { success: true, message: 'Nenhuma conta do GA4 encontrada' };
      }
      
      // Processar cada conta e propriedade
      console.log(`Encontradas ${accountSummaries.data.accountSummaries.length} contas do GA4`);
      
      for (const account of accountSummaries.data.accountSummaries) {
        const accountId = account.account.split('/').pop();
        const accountName = account.displayName || 'Conta GA';
        
        console.log(`Processando conta: ${accountName} (${accountId})`);
        
        if (!account.propertySummaries || account.propertySummaries.length === 0) {
          console.log(`Nenhuma propriedade encontrada para a conta ${accountName}`);
          continue;
        }
        
        console.log(`Encontradas ${account.propertySummaries.length} propriedades na conta ${accountName}`);
        
        for (const property of account.propertySummaries) {
          const propertyId = property.property.split('/').pop();
          const propertyName = property.displayName || 'Propriedade GA';
          
          console.log(`Salvando propriedade: ${propertyName} (${propertyId})`);
          
          // Salvar propriedade no banco de dados
          await this.pgPool.query(
            `INSERT INTO ga_properties 
            (user_id, property_id, property_name, account_id, account_name, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id, property_id) 
            DO UPDATE SET 
              property_name = $3, 
              account_id = $4, 
              account_name = $5, 
              created_at = NOW()`,
            [userId, propertyId, propertyName, accountId, accountName]
          );
          
          console.log(`Propriedade ${propertyName} salva com sucesso`);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao buscar propriedades do GA4:', error);
      throw error;
    }
  }

  /**
   * Verifica status da conexão com Google Analytics
   */
  async checkConnectionStatus(userId) {
    try {
      const result = await this.pgPool.query(
        'SELECT id FROM google_tokens WHERE user_id = $1',
        [userId]
      );
      
      return { connected: result.rows.length > 0 };
    } catch (error) {
      console.error('Erro ao verificar status da conexão GA:', error);
      throw error;
    }
  }

  /**
   * Verifica se um usuário tem permissão para acessar uma propriedade GA
   * @param {number} userId - ID do usuário
   * @param {string} propertyId - ID da propriedade GA
   * @param {string} userRole - Papel do usuário (opcional)
   * @returns {Promise<boolean>} - Verdadeiro se tiver permissão, falso caso contrário
   */
  async hasPropertyAccess(userId, propertyId, userRole) {
    try {
      // Admins e super admins têm acesso a tudo
      if (userRole === 'super_admin' || userRole === 'admin') {
        return true;
      }
      
      // Para usuários normais, verificar permissões específicas
      return await this.permissionService.hasGAPropertyAccess(userId, propertyId);
    } catch (error) {
      console.error('Erro ao verificar permissão para propriedade GA:', error);
      return false;
    }
  }

  /**
   * Obtém propriedades do GA4 para um usuário
   * @param {number} userId - ID do usuário
   * @param {string} userRole - Papel do usuário (opcional)
   * @returns {Promise<Array>} - Lista de propriedades GA
   */
  async getProperties(userId, userRole) {
    try {
      console.log(`Buscando propriedades do GA4 para o usuário ${userId}`);
      
      // Obter todas as propriedades do banco
      const result = await this.pgPool.query(
        'SELECT * FROM ga_properties WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      
      const properties = result.rows;
      console.log(`Encontradas ${properties.length} propriedades para o usuário ${userId}`);
      
      // Se for admin ou super_admin, retornar todas as propriedades
      if (userRole === 'super_admin' || userRole === 'admin') {
        return properties;
      }
      
      // Para usuários normais, filtrar apenas as propriedades com permissão
      const allowedPropertyIds = await this.permissionService.getUserGAProperties(userId);
      
      // Se não houver propriedades permitidas, retornar array vazio
      if (!allowedPropertyIds || allowedPropertyIds.length === 0) {
        return [];
      }
      
      // Filtrar as propriedades conforme permissões
      return properties.filter(property => 
        allowedPropertyIds.includes(property.property_id)
      );
    } catch (error) {
      console.error('Erro ao obter propriedades do GA4:', error);
      throw error;
    }
  }

  /**
   * Obtém relatório do GA4 com depuração avançada
   * @param {number} userId - ID do usuário
   * @param {string} propertyId - ID da propriedade GA
   * @param {Object} reportConfig - Configuração do relatório
   * @param {string} userRole - Papel do usuário (opcional)
   * @returns {Promise<Object>} - Dados do relatório
   */
  async getReport(userId, propertyId, reportConfig, userRole) {
    try {
      console.log('=== INÍCIO DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
      console.log(`Usuário ID: ${userId}, Função: ${userRole}, Propriedade ID: ${propertyId}`);
      console.log('Configuração do relatório:', JSON.stringify(reportConfig, null, 2));
      
      // Verificar se a propriedade existe para este usuário
      const propertyQuery = await this.pgPool.query(
        'SELECT * FROM ga_properties WHERE user_id = $1 AND property_id = $2',
        [userId, propertyId]
      );
      
      console.log(`Propriedade encontrada: ${propertyQuery.rows.length > 0 ? 'SIM' : 'NÃO'}`);
      
      if (propertyQuery.rows.length === 0) {
        console.error(`ERRO: Propriedade ${propertyId} não encontrada para o usuário ${userId}`);
        throw new Error(`Propriedade ${propertyId} não encontrada`);
      }
      
      // Verificar permissão de acesso à propriedade
      if (userRole !== 'super_admin' && userRole !== 'admin') {
        const permissionsQuery = await this.pgPool.query(
          'SELECT * FROM user_ga_property_permissions WHERE user_id = $1 AND property_id = $2',
          [userId, propertyId]
        );
        
        console.log(`Permissões específicas encontradas: ${permissionsQuery.rows.length > 0 ? 'SIM' : 'NÃO'}`);
        
        if (permissionsQuery.rows.length === 0) {
          console.error(`ERRO: Usuário ${userId} não tem permissões para a propriedade ${propertyId}`);
          throw new Error('Você não tem permissão para acessar esta propriedade do Google Analytics');
        }
      }
      
      // Obter token de acesso
      try {
        console.log('Buscando token de acesso...');
        const accessToken = await this.getAccessToken(userId);
        console.log('Token de acesso obtido com sucesso');
        
        // Configurar cliente do Google com o token
        this.oauth2Client.setCredentials({ access_token: accessToken });
        
        // Executar relatório
        console.log(`Executando relatório para a propriedade ${propertyId}...`);
        
        try {
          const response = await analyticsData.properties.runReport({
            auth: this.oauth2Client,
            property: `properties/${propertyId}`,
            requestBody: reportConfig
          });
          
          console.log('Relatório recebido com sucesso. Tamanho dos dados:', 
            JSON.stringify(response.data).length);
          console.log('=== FIM DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
          
          return response.data;
        } catch (apiError) {
          console.error('ERRO na API do Google Analytics:', apiError);
          console.error('Detalhes do erro:');
          
          if (apiError.response) {
            console.error('Status:', apiError.response.status);
            console.error('Dados:', JSON.stringify(apiError.response.data));
            console.error('Headers:', JSON.stringify(apiError.response.headers));
          } else if (apiError.request) {
            console.error('Sem resposta recebida');
            console.error('Request:', apiError.request);
          } else {
            console.error('Mensagem:', apiError.message);
          }
          
          if (apiError.code) {
            console.error('Código de erro:', apiError.code);
          }
          
          console.log('=== FIM DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
          throw apiError;
        }
      } catch (tokenError) {
        console.error('ERRO ao obter token de acesso:', tokenError);
        console.log('=== FIM DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
        throw tokenError;
      }
    } catch (error) {
      console.error('ERRO ao executar relatório do GA4:', error);
      console.log('=== FIM DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
      throw error;
    }
  }

  /**
   * Desconecta a integração com Google Analytics
   */
  async disconnect(userId) {
    try {
      // Remover tokens do Redis
      await this.redisClient.del(`google_access_token:${userId}`);
      
      // Remover tokens do PostgreSQL
      await this.pgPool.query(
        'DELETE FROM google_tokens WHERE user_id = $1',
        [userId]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao desconectar Google Analytics:', error);
      throw error;
    }
  }
}

module.exports = GoogleAnalyticsService;
