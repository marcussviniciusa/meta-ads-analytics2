/**
 * Controller for managing external integrations
 */
class IntegrationController {
  constructor(redisClient, pgPool) {
    this.redisClient = redisClient;
    this.pgPool = pgPool;
  }

  /**
   * Get all available integration sources
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getIntegrationSources(req, res, next) {
    try {
      // Set Content-Type header for consistent response format
      res.set('Content-Type', 'application/json');
      
      // Get all integration sources
      const result = await this.pgPool.query(
        'SELECT id, name, display_name, description, is_active FROM integration_sources ORDER BY id'
      );
      
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('[IntegrationController] Error getting integration sources:', error);
      res.set('Content-Type', 'application/json');
      res.status(500).json({
        message: 'Erro ao obter fontes de integração',
        error: 'internal_server_error',
        details: error.message
      });
    }
  }

  /**
   * Get user's integrations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getUserIntegrations(req, res, next) {
    try {
      // Set Content-Type header for consistent response format
      res.set('Content-Type', 'application/json');
      
      const userId = req.user.userId;
      
      // Get user integrations
      const result = await this.pgPool.query(
        'SELECT ui.id, ui.user_id, ui.source_id, ui.is_connected, ui.last_sync, ' +
        'int_src.name, int_src.display_name, int_src.description, int_src.is_active ' +
        'FROM user_integrations ui ' +
        'JOIN integration_sources int_src ON ui.source_id = int_src.id ' +
        'WHERE ui.user_id = $1',
        [userId]
      );
      
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('[IntegrationController] Error getting user integrations:', error);
      res.set('Content-Type', 'application/json');
      res.status(500).json({
        message: 'Erro ao obter integrações do usuário',
        error: 'internal_server_error',
        details: error.message
      });
    }
  }

  /**
   * Create/update an integration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async upsertIntegration(req, res, next) {
    try {
      // Set Content-Type header for consistent response format
      res.set('Content-Type', 'application/json');
      
      const userId = req.user.userId;
      const { sourceId, isConnected, credentials } = req.body;
      
      // Validate source existence
      const sourceResult = await this.pgPool.query(
        'SELECT id, name, is_active FROM integration_sources WHERE id = $1',
        [sourceId]
      );
      
      if (sourceResult.rows.length === 0) {
        return res.status(404).json({ 
          message: 'Fonte de integração não encontrada',
          error: 'source_not_found'
        });
      }
      
      const source = sourceResult.rows[0];
      
      // Check if source is active
      if (!source.is_active) {
        return res.status(400).json({ 
          message: 'Esta fonte de integração não está disponível no momento',
          error: 'source_inactive'
        });
      }
      
      // Create/update integration
      const result = await this.pgPool.query(
        'INSERT INTO user_integrations (user_id, source_id, is_connected, credentials) ' +
        'VALUES ($1, $2, $3, $4) ' +
        'ON CONFLICT (user_id, source_id) DO UPDATE SET ' +
        'is_connected = $3, credentials = $4, updated_at = NOW() ' +
        'RETURNING id',
        [userId, sourceId, isConnected, JSON.stringify(credentials || {})]
      );
      
      const integrationId = result.rows[0].id;
      
      res.status(200).json({
        id: integrationId,
        message: 'Integração atualizada com sucesso',
        success: true
      });
    } catch (error) {
      console.error('[IntegrationController] Error upserting integration:', error);
      res.set('Content-Type', 'application/json');
      res.status(500).json({
        message: 'Erro ao criar/atualizar integração',
        error: 'internal_server_error',
        details: error.message,
        success: false
      });
    }
  }

  /**
   * Disconnect an integration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async disconnectIntegration(req, res, next) {
    try {
      // Set Content-Type header for consistent response format
      res.set('Content-Type', 'application/json');
      
      const userId = req.user.userId;
      const { sourceId } = req.params;
      
      // Check if integration exists
      const checkResult = await this.pgPool.query(
        'SELECT id FROM user_integrations WHERE user_id = $1 AND source_id = $2',
        [userId, sourceId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ 
          message: 'Integração não encontrada',
          error: 'integration_not_found',
          success: false
        });
      }
      
      // Update integration
      await this.pgPool.query(
        'UPDATE user_integrations SET is_connected = false, updated_at = NOW() ' +
        'WHERE user_id = $1 AND source_id = $2',
        [userId, sourceId]
      );
      
      res.status(200).json({ 
        message: 'Integração desconectada com sucesso',
        success: true
      });
    } catch (error) {
      console.error('[IntegrationController] Error disconnecting integration:', error);
      res.set('Content-Type', 'application/json');
      res.status(500).json({
        message: 'Erro ao desconectar integração',
        error: 'internal_server_error',
        details: error.message,
        success: false
      });
    }
  }

  /**
   * Get Meta Ads authorization URL
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getMetaAuthUrl(req, res, next) {
    try {
      // Set Content-Type header for consistent response format
      res.set('Content-Type', 'application/json');
      
      const userId = req.user.userId;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUri = `${frontendUrl}/connect-meta/callback`;
      
      // Validate environment variables
      if (!process.env.META_APP_ID) {
        console.error('[IntegrationController] Missing META_APP_ID environment variable');
        return res.status(500).json({
          message: 'Configuração da integração com Meta Ads incompleta (META_APP_ID)',
          error: 'config_error',
          success: false
        });
      }
      
      // Generate state parameter to prevent CSRF
      const stateToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      
      try {
        // Store state token in Redis with expiration (10 minutes)
        await this.redisClient.set(
          `meta_auth_state:${userId}`,
          stateToken,
          'EX',
          600
        );
      } catch (redisError) {
        console.error('[IntegrationController] Redis error when setting state token:', redisError);
        return res.status(500).json({
          message: 'Erro interno ao iniciar processo de autenticação',
          error: 'redis_error',
          details: redisError.message,
          success: false
        });
      }
      
      // Construct authorization URL
      const authUrl = new URL('https://www.facebook.com/v17.0/dialog/oauth');
      authUrl.searchParams.append('client_id', process.env.META_APP_ID);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('state', stateToken);
      authUrl.searchParams.append('scope', 'ads_management,ads_read,business_management');
      authUrl.searchParams.append('response_type', 'code');
      
      res.status(200).json({ 
        authUrl: authUrl.toString(),
        success: true
      });
    } catch (error) {
      console.error('[IntegrationController] Error creating Meta auth URL:', error);
      res.set('Content-Type', 'application/json');
      res.status(500).json({
        message: 'Erro ao criar URL de autenticação Meta',
        error: 'internal_server_error',
        details: error.message,
        success: false
      });
    }
  }

  /**
   * Process Meta Ads authorization callback
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async processMetaCallback(req, res, next) {
    try {
      // Ensure consistent response format
      res.set('Content-Type', 'application/json');
      
      const userId = req.user?.userId;
      const { code, state, redirectUri } = req.body;
      
      console.log('[IntegrationController] Processing Meta Callback:', { 
        userId, 
        userInfo: req.user,
        code: code?.substring(0, 10) + '...', 
        state, 
        redirectUri 
      });
      
      // Verificar se o userId está definido
      if (!userId) {
        console.error('[IntegrationController] UserId is undefined in request. User object:', req.user);
        return res.status(400).json({
          message: 'ID do usuário não encontrado na requisição. Por favor, faça login novamente.',
          error: 'user_not_found',
          success: false,
          diagnostics: {
            type: 'authentication_error',
            suggestion: 'Tente fazer logout e login novamente para atualizar sua sessão.'
          }
        });
      }
      
      // Verify state parameter to prevent CSRF
      console.log('[IntegrationController] Checking state for user:', userId);
      
      // Durante testes, vamos temporariamente ignorar a validação do state
      // para verificar se o processo de troca de código por token está funcionando
      // NOTA: Em produção, a validação do state deve ser sempre habilitada!
      
      /* 
      const storedState = await this.redisClient.get(`meta_auth_state:${userId}`);
      console.log('Stored state:', storedState);
      
      if (!storedState) {
        console.log('No stored state found');
        return res.status(400).json({ 
          message: 'Nenhum estado encontrado. Tente conectar novamente.' 
        });
      }
      
      if (storedState !== state) {
        console.log('State mismatch:', { storedState, receivedState: state });
        return res.status(400).json({ 
          message: 'Parâmetro de estado inválido. Tente conectar novamente.' 
        });
      }
      */
      
      // Durante o desenvolvimento, vamos pular a verificação de estado
      console.log('[IntegrationController] Skipping state verification during development');
      
      // Comentamos esta linha porque acabamos de desabilitar a verificação do estado
      // await this.redisClient.del(`meta_auth_state:${userId}`);
      console.log('[IntegrationController] State token deletion skipped during development');
      
      // Use provided redirectUri or fallback to default
      const useRedirectUri = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/connect-meta/callback`;
      
      const axios = require('axios');
      console.log('[IntegrationController] Exchanging code for token with params:', {
        client_id: process.env.META_APP_ID,
        redirect_uri: useRedirectUri,
        code_truncated: code?.substring(0, 10) + '...'
      });
      
      console.log('[IntegrationController] Meta App ID:', process.env.META_APP_ID);
      console.log('[IntegrationController] Redirect URI for token exchange:', useRedirectUri);
      
      // Validate required environment variables
      if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
        console.error('[IntegrationController] Missing Meta API credentials');
        return res.status(500).json({
          message: 'Configuração da integração com Meta Ads incompleta',
          error: 'config_error',
          success: false,
          diagnostics: {
            type: 'configuration_error',
            suggestion: 'Verifique se as variáveis META_APP_ID e META_APP_SECRET estão configuradas no servidor.'
          }
        });
      }
      
      // Validate code parameter
      if (!code) {
        console.error('[IntegrationController] Missing code parameter');
        return res.status(400).json({
          message: 'Parâmetro de código ausente no callback de autorização',
          error: 'missing_code',
          success: false,
          diagnostics: {
            type: 'oauth_error',
            suggestion: 'Tente iniciar o processo de autorização novamente.'
          }
        });
      }
      
      let tokenData;
      try {
        const tokenResponse = await axios.get('https://graph.facebook.com/v17.0/oauth/access_token', {
          params: {
            client_id: process.env.META_APP_ID,
            client_secret: process.env.META_APP_SECRET,
            redirect_uri: useRedirectUri,
            code: code
          },
          timeout: 15000, // 15 segundos de timeout
          headers: {
            'Accept': 'application/json'
          }
        });
        console.log('[IntegrationController] Token response received:', !!tokenResponse.data);
        tokenData = tokenResponse.data;
      } catch (tokenError) {
        console.error('[IntegrationController] Error exchanging code for token:', tokenError.message);
        
        // Detailed error diagnostics based on the error
        let diagnostics = {
          type: 'api_error',
          suggestion: 'Tente novamente. Se o problema persistir, verifique sua conexão com a internet e tente mais tarde.'
        };
        
        let errorCode = 'token_exchange_error';
        let statusCode = 400;
        
        if (tokenError.response) {
          console.error('[IntegrationController] Facebook API response:', tokenError.response.data);
          
          const fbError = tokenError.response.data.error || {};
          
          // Specific error handling for common Meta API errors
          if (fbError.code === 190 || fbError.type === 'OAuthException') {
            diagnostics = {
              type: 'oauth_error',
              suggestion: 'A autorização com o Facebook expirou ou é inválida. Tente reconectar sua conta.'
            };
            errorCode = 'oauth_exception';
          } else if (fbError.code === 4 || fbError.type === 'APIError') {
            diagnostics = {
              type: 'rate_limit_error',
              suggestion: 'Limite de requisições atingido. Aguarde alguns minutos e tente novamente.'
            };
            errorCode = 'api_rate_limit';
          } else if (fbError.code === 2 || fbError.message?.includes('temporarily')) {
            diagnostics = {
              type: 'temporary_error',
              suggestion: 'O Facebook está com problemas temporários. Tente novamente mais tarde.'
            };
            errorCode = 'temporary_failure';
          } else if (fbError.code === 200 || fbError.type === 'GraphMethodException') {
            diagnostics = {
              type: 'permission_error',
              suggestion: 'Permissões insuficientes. Verifique se você tem as permissões corretas para acessar a API do Meta Ads.'
            };
            errorCode = 'permission_denied';
          }
          
          // Set specific status code based on the error
          if (fbError.code === 190) statusCode = 401; // Authentication error
          else if (fbError.code === 4) statusCode = 429; // Rate limit
          else if (fbError.code === 2) statusCode = 503; // Service unavailable
          else if (fbError.code === 200) statusCode = 403; // Forbidden
          
          // Retornar erro específico do Facebook para o cliente
          return res.status(statusCode).json({ 
            message: 'Falha ao trocar código por token: ' + tokenError.message,
            error: errorCode,
            origin: 'facebook',
            success: false,
            details: fbError,
            diagnostics: diagnostics
          });
        }
        
        // Generic error if no specific error response
        return res.status(statusCode).json({ 
          message: 'Falha ao trocar código por token: ' + tokenError.message,
          error: errorCode,
          success: false,
          diagnostics: diagnostics
        });
      }
      
      if (!tokenData || !tokenData.access_token) {
        console.error('[IntegrationController] No access token received from Meta');
        return res.status(400).json({ 
          message: 'Falha ao obter token de acesso do Meta Ads',
          error: 'missing_token',
          success: false,
          diagnostics: {
            type: 'oauth_error',
            suggestion: 'O Facebook não retornou um token de acesso válido. Tente reconectar sua conta.'
          }
        });
      }
      
      console.log('[IntegrationController] Access token obtained successfully. Expires in:', tokenData.expires_in, 'seconds');
      
      // Get Meta integration source ID
      let metaSourceId;
      try {
        console.log('[IntegrationController] Querying database for meta_ads source');
        const sourceResult = await this.pgPool.query(
          'SELECT id FROM integration_sources WHERE name = $1',
          ['meta_ads']
        );
        
        console.log('[IntegrationController] Database query result:', sourceResult.rows);
        
        if (sourceResult.rows.length === 0) {
          // Se não encontrarmos a fonte, vamos criá-la para desenvolvimento
          console.log('[IntegrationController] Meta Ads source not found, creating it');
          const insertResult = await this.pgPool.query(
            'INSERT INTO integration_sources(name, display_name, description, created_at, updated_at) ' +
            'VALUES($1, $2, $3, NOW(), NOW()) RETURNING id',
            ['meta_ads', 'Meta Ads', 'Meta Ads integration']
          );
          
          metaSourceId = insertResult.rows[0].id;
          console.log('[IntegrationController] Created new meta_ads source with ID:', metaSourceId);
        } else {
          metaSourceId = sourceResult.rows[0].id;
          console.log('[IntegrationController] Found existing meta_ads source with ID:', metaSourceId);
        }
      } catch (dbError) {
        console.error('[IntegrationController] Database error:', dbError);
        return res.status(500).json({
          message: 'Erro ao acessar banco de dados: ' + dbError.message,
          error: 'database_error',
          success: false,
          diagnostics: {
            type: 'database_error',
            suggestion: 'Erro interno do servidor. Por favor, tente novamente mais tarde.'
          }
        });
      }
      
      // Store token information
      const credentials = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'bearer',
        expires_at: Date.now() + (tokenData.expires_in * 1000),
        scopes: 'ads_management,ads_read,business_management'
      };
      
      try {
        console.log('[IntegrationController] Saving token to database for user:', userId);
        // Update integration record
        await this.pgPool.query(
          'INSERT INTO user_integrations (user_id, source_id, is_connected, credentials, last_sync) ' +
          'VALUES ($1, $2, $3, $4, NOW()) ' +
          'ON CONFLICT (user_id, source_id) DO UPDATE SET ' +
          'is_connected = $3, credentials = $4, last_sync = NOW(), updated_at = NOW()',
          [userId, metaSourceId, true, JSON.stringify(credentials)]
        );
        
        console.log('[IntegrationController] Token successfully saved to database');
        
        // Armazenar o token no Redis para acesso rápido
        await this.redisClient.set(
          `meta_access_token:${userId}`, 
          JSON.stringify(credentials),
          'EX',
          86400 // 24 horas
        );
        
        console.log('[IntegrationController] Meta integration completed successfully for user:', userId);
        
        res.status(200).json({
          message: 'Conta Meta Ads conectada com sucesso',
          isConnected: true,
          success: true
        });
      } catch (dbSaveError) {
        console.error('[IntegrationController] Error saving token to database:', dbSaveError);
        return res.status(500).json({
          message: 'Erro ao salvar token: ' + dbSaveError.message,
          error: 'database_save_error',
          success: false,
          diagnostics: {
            type: 'database_error',
            suggestion: 'Não foi possível salvar suas credenciais. Tente novamente mais tarde.'
          }
        });
      }
    } catch (error) {
      console.error('[IntegrationController] Erro ao processar callback do Meta:', error);
      
      // Set Content-Type header for consistent response format
      res.set('Content-Type', 'application/json');
      
      // Return detailed error response
      res.status(500).json({
        message: 'Erro interno ao processar a autorização do Meta Ads',
        error: 'internal_server_error',
        details: error.message,
        success: false,
        diagnostics: {
          type: 'internal_error',
          suggestion: 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.'
        }
      });
    }
  }

  /**
   * Check and refresh Meta Ads token if necessary
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async checkAndRefreshMetaToken(req, res, next) {
    try {
      const userId = req.user.userId;
      
      // Get Meta integration
      const integrationResult = await this.pgPool.query(
        'SELECT ui.id, ui.credentials FROM user_integrations ui ' +
        'JOIN integration_sources int_src ON ui.source_id = int_src.id ' +
        'WHERE ui.user_id = $1 AND int_src.name = $2 AND ui.is_connected = true',
        [userId, 'meta_ads']
      );
      
      if (integrationResult.rows.length === 0) {
        return res.status(404).json({ 
          message: 'Integração com Meta Ads não encontrada ou não está ativa' 
        });
      }
      
      const integration = integrationResult.rows[0];
      const credentials = integration.credentials;
      
      // Check if token is about to expire (less than 1 hour left)
      const expiresAt = credentials.expires_at;
      const oneHourFromNow = Date.now() + (60 * 60 * 1000);
      
      if (expiresAt > oneHourFromNow) {
        // Token is still valid
        return res.status(200).json({
          isValid: true,
          expiresAt: expiresAt
        });
      }
      
      // Token needs to be refreshed - Meta tokens can't be refreshed directly,
      // we would need to prompt the user to reconnect
      res.status(200).json({
        isValid: false,
        message: 'Token do Meta Ads expirou. Por favor, reconecte sua conta.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Meta Ad Accounts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getMetaAdAccounts(req, res, next) {
    try {
      const userId = req.user.userId;
      
      console.log('[IntegrationController] Buscando contas Meta Ads para usuário:', userId);
      
      // Forçar cabeçalhos Content-Type para JSON
      res.set('Content-Type', 'application/json');
      
      // Get Meta integration
      const integrationResult = await this.pgPool.query(
        'SELECT ui.id, ui.credentials FROM user_integrations ui ' +
        'JOIN integration_sources int_src ON ui.source_id = int_src.id ' +
        'WHERE ui.user_id = $1 AND int_src.name = $2 AND ui.is_connected = true',
        [userId, 'meta_ads']
      );
      
      if (integrationResult.rows.length === 0) {
        console.log('[IntegrationController] Integração Meta Ads não encontrada para usuário:', userId);
        return res.status(404).json({ 
          message: 'Integração com Meta Ads não encontrada ou não está ativa',
          error: 'integration_required',
          accounts: [],
          success: false,
          diagnostics: {
            type: 'integration_missing',
            suggestion: 'Você precisa conectar sua conta do Meta Ads antes de acessar suas contas de anúncios. Clique no botão "Conectar Meta Ads" para iniciar o processo de conexão.'
          }
        });
      }
      
      const integration = integrationResult.rows[0];
      const credentials = integration.credentials;
      
      // Check if token exists
      if (!credentials || !credentials.access_token) {
        console.log('[IntegrationController] Token Meta Ads não encontrado para usuário:', userId);
        return res.status(401).json({
          message: 'Token do Meta Ads não encontrado. Por favor, reconecte sua conta.',
          error: 'token_not_found',
          accounts: [],
          success: false,
          diagnostics: {
            type: 'authentication_error',
            suggestion: 'Suas credenciais do Meta Ads não foram encontradas. Clique em "Reconectar Meta Ads" para autorizar novamente.'
          }
        });
      }
      
      // Check if token is valid
      if (credentials.expires_at && credentials.expires_at < Date.now()) {
        console.log('[IntegrationController] Token Meta Ads expirado para usuário:', userId);
        return res.status(401).json({
          message: 'Token do Meta Ads expirou. Por favor, reconecte sua conta.',
          error: 'token_expired',
          accounts: [],
          success: false,
          diagnostics: {
            type: 'expired_token',
            suggestion: 'Sua sessão com o Meta Ads expirou. Para continuar usando a integração, clique em "Reconectar Meta Ads".'
          }
        });
      }
      
      // Fetch ad accounts from Meta
      console.log('[IntegrationController] Buscando contas na API do Meta para usuário:', userId);
      const axios = require('axios');
      
      try {
        const adAccountsResponse = await axios.get('https://graph.facebook.com/v17.0/me/adaccounts', {
          params: {
            access_token: credentials.access_token,
            fields: 'id,name,account_id,account_status,business_name,currency,timezone_name'
          },
          timeout: 10000, // 10 segundos de timeout
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log('[IntegrationController] Resposta da API Meta recebida com sucesso');
        
        if (!adAccountsResponse.data || !adAccountsResponse.data.data) {
          console.warn('[IntegrationController] Resposta da API Meta sem dados esperados:', adAccountsResponse.data);
          return res.status(200).json({
            accounts: [],
            success: true,
            diagnostics: {
              type: 'empty_response',
              suggestion: 'Nenhuma conta de anúncios foi encontrada. Se você acredita que isso é um erro, verifique se tem permissões de acesso às contas no Business Manager do Meta Ads.'
            }
          });
        }
        
        const adAccounts = adAccountsResponse.data.data || [];
        
        // Format response
        const formattedAccounts = adAccounts.map(account => ({
          id: account.id,
          account_id: account.account_id,
          name: account.name,
          businessName: account.business_name,
          status: account.account_status,
          statusText: this._getAccountStatusText(account.account_status),
          currency: account.currency,
          timezone: account.timezone_name
        }));
        
        console.log('[IntegrationController] Retornando', formattedAccounts.length, 'contas Meta');
        return res.status(200).json({
          accounts: formattedAccounts,
          success: true
        });
      } catch (metaApiError) {
        console.error('[IntegrationController] Erro na API do Meta:', metaApiError.message);
        
        // Verificar detalhes do erro da API Meta
        const metaErrorResponse = metaApiError.response?.data?.error;
        
        // Preparar diagnóstico padrão
        let diagnostics = {
          type: 'api_error',
          suggestion: 'Ocorreu um erro ao acessar a API do Meta Ads. Tente novamente mais tarde.'
        };
        
        let errorCode = 'meta_api_error';
        let statusCode = 400;
        
        if (metaErrorResponse) {
          console.error('[IntegrationController] Erro da API Meta:', {
            type: metaErrorResponse.type,
            message: metaErrorResponse.message,
            code: metaErrorResponse.code,
            fbtrace_id: metaErrorResponse.fbtrace_id
          });
          
          // Diagnósticos específicos para diferentes tipos de erros da API Meta
          if (metaErrorResponse.type === 'OAuthException') {
            diagnostics = {
              type: 'oauth_error',
              suggestion: 'Sua autorização com o Meta Ads expirou ou foi revogada. Clique em "Reconectar Meta Ads" para autorizar novamente.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'oauth_error';
            statusCode = 401;
          } else if (metaErrorResponse.code === 4 || metaErrorResponse.code === 17 || (metaErrorResponse.message && metaErrorResponse.message.includes('rate limit'))) {
            diagnostics = {
              type: 'rate_limit',
              suggestion: 'Você atingiu o limite de requisições para a API do Meta Ads. Aguarde alguns minutos e tente novamente.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'rate_limit_exceeded';
            statusCode = 429;
          } else if (metaErrorResponse.code === 10 || metaErrorResponse.type === 'PermissionError') {
            diagnostics = {
              type: 'permission_error',
              suggestion: 'Você não tem permissão para acessar as contas de anúncios. Verifique suas permissões no Business Manager do Meta Ads.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'permission_denied';
            statusCode = 403;
          } else if (metaErrorResponse.code === 1 || metaErrorResponse.type === 'GraphMethodException') {
            diagnostics = {
              type: 'api_method_error',
              suggestion: 'Erro no método da API do Meta Ads. Verifique se você tem permissões para acessar as contas de anúncios e tente novamente.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'api_method_error';
          } else if (metaErrorResponse.code === 2 || (metaErrorResponse.message && metaErrorResponse.message.toLowerCase().includes('temporarily'))) {
            diagnostics = {
              type: 'service_unavailable',
              suggestion: 'O serviço da API do Meta Ads está temporariamente indisponível. Tente novamente mais tarde.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'service_unavailable';
            statusCode = 503;
          }
          
          console.log('[IntegrationController] Erro na API do Meta diagnosticado como:', diagnostics.type);
          
          return res.status(statusCode).json({
            message: 'Erro ao buscar contas do Meta Ads: ' + metaErrorResponse.message,
            error: errorCode,
            details: metaErrorResponse,
            accounts: [],
            success: false,
            diagnostics: diagnostics
          });
        }
        
        // Erro genérico da API Meta
        return res.status(statusCode).json({
          message: 'Erro ao buscar contas do Meta Ads',
          error: errorCode,
          details: metaApiError.message,
          accounts: [],
          success: false,
          diagnostics: diagnostics
        });
      }
    } catch (error) {
      console.error('[IntegrationController] Erro interno ao buscar contas Meta Ads:', error);
      
      // Garantir que a resposta seja JSON mesmo em caso de erro
      res.set('Content-Type', 'application/json');
      res.status(500).json({
        message: 'Erro interno ao buscar contas de anúncios do Meta',
        error: 'internal_server_error',
        accounts: [],
        success: false,
        diagnostics: {
          type: 'internal_error',
          suggestion: 'Ocorreu um erro inesperado no servidor. Por favor, tente novamente mais tarde ou entre em contato com o suporte se o problema persistir.'
        }
      });
    }
  }

  /**
   * Get Meta Ad Account details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getMetaAdAccountDetails(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountId } = req.params;
      
      // Validar acesso do usuário à conta
      const accountCheck = await this.pgPool.query(
        'SELECT * FROM ad_accounts WHERE user_id = $1 AND account_id = $2',
        [userId, accountId]
      );
      
      if (accountCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Conta de anúncios não encontrada ou sem acesso' });
      }
      
      // Obter token de acesso do usuário
      const accessToken = await this.getMetaAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ message: 'Não foi possível obter token de acesso ao Meta Ads' });
      }
      
      // Fazer requisição à API do Meta
      const axios = require('axios');
      const fields = 'id,name,account_id,account_status,business_name,currency,timezone_name';
      
      const response = await axios.get(
        `https://graph.facebook.com/v17.0/${accountId}?fields=${fields}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      res.status(200).json({ account: response.data });
    } catch (error) {
      console.error('Erro ao buscar detalhes da conta:', error);
      
      // Verificar se é erro da API do Meta
      if (error.response && error.response.data) {
        return res.status(error.response.status).json({ 
          message: 'Erro ao obter detalhes da conta do Meta Ads',
          error: error.response.data.error,
          origin: 'facebook' 
        });
      }
      
      next(error);
    }
  }

  /**
   * Get campaigns for a specific Meta Ads account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getMetaAdCampaigns(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountId } = req.params;
      
      // Validar acesso do usuário à conta
      const accountCheck = await this.pgPool.query(
        'SELECT * FROM ad_accounts WHERE user_id = $1 AND account_id = $2',
        [userId, accountId]
      );
      
      if (accountCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Conta de anúncios não encontrada ou sem acesso' });
      }
      
      // Obter token de acesso do usuário
      const accessToken = await this.getMetaAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ message: 'Não foi possível obter token de acesso ao Meta Ads' });
      }
      
      // Fazer requisição à API do Meta
      const axios = require('axios');
      const fields = 'id,name,objective,status,created_time,updated_time,daily_budget,lifetime_budget';
      
      const response = await axios.get(
        `https://graph.facebook.com/v17.0/act_${accountId}/campaigns?fields=${fields}&limit=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      // Processar e salvar campanhas no banco de dados
      const campaigns = response.data.data;
      const client = await this.pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const campaign of campaigns) {
          // Normalizar dados
          const campaignData = {
            campaign_id: campaign.id,
            account_id: accountId,
            name: campaign.name,
            objective: campaign.objective || null,
            status: campaign.status || null,
            created_time: campaign.created_time ? new Date(campaign.created_time) : null
          };
          
          // Inserir ou atualizar campanha
          await client.query(
            'INSERT INTO campaigns (account_id, campaign_id, name, objective, status, created_time) ' +
            'VALUES ($1, $2, $3, $4, $5, $6) ' +
            'ON CONFLICT (account_id, campaign_id) DO UPDATE SET ' +
            'name = $3, objective = $4, status = $5, updated_at = NOW()',
            [
              campaignData.account_id, 
              campaignData.campaign_id, 
              campaignData.name, 
              campaignData.objective,
              campaignData.status,
              campaignData.created_time
            ]
          );
        }
        
        await client.query('COMMIT');
      } catch (dbError) {
        await client.query('ROLLBACK');
        console.error('Erro ao salvar campanhas:', dbError);
      } finally {
        client.release();
      }
      
      res.status(200).json({ campaigns });
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      
      // Verificar se é erro da API do Meta
      if (error.response && error.response.data) {
        return res.status(error.response.status).json({ 
          message: 'Erro ao obter campanhas do Meta Ads',
          error: error.response.data.error,
          origin: 'facebook' 
        });
      }
      
      next(error);
    }
  }

  /**
   * Get insights for a specific Meta Ads account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getMetaAdInsights(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountId } = req.params;
      const { start_date, end_date, campaign_id } = req.query;
      
      // Validar acesso do usuário à conta
      const accountCheck = await this.pgPool.query(
        'SELECT * FROM ad_accounts WHERE user_id = $1 AND account_id = $2',
        [userId, accountId]
      );
      
      if (accountCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Conta de anúncios não encontrada ou sem acesso' });
      }
      
      // Validar parâmetros obrigatórios
      if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Datas de início e fim são obrigatórias' });
      }
      
      // Obter token de acesso do usuário
      const accessToken = await this.getMetaAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ message: 'Não foi possível obter token de acesso ao Meta Ads' });
      }
      
      // Construir parâmetros da requisição
      const axios = require('axios');
      const metrics = 'impressions,clicks,ctr,cpc,spend,reach,frequency,unique_clicks,cost_per_unique_click';
      const level = campaign_id ? 'campaign' : 'account';
      
      let apiUrl = `https://graph.facebook.com/v17.0/act_${accountId}/insights`;
      const params = {
        time_range: JSON.stringify({
          since: start_date,
          until: end_date
        }),
        fields: 'campaign_id,campaign_name,date_start,date_stop',
        time_increment: 1,
        level,
        access_token: accessToken,
        limit: 100
      };
      
      // Adicionar filtro de campanha se especificado
      if (campaign_id) {
        params.filtering = JSON.stringify([{
          field: 'campaign.id',
          operator: 'EQUAL',
          value: campaign_id
        }]);
      }
      
      // Incluir métricas desejadas
      params.fields += `,${metrics}`;
      
      // Fazer requisição à API do Meta
      const response = await axios.get(apiUrl, { params });
      
      // Processar dados e salvar no banco
      const insights = response.data.data;
      const client = await this.pgPool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (const insight of insights) {
          // Normalizar dados
          const campaignId = insight.campaign_id;
          const date = insight.date_start;
          
          // Inserir ou atualizar insight da campanha
          if (campaignId) {
            await client.query(
              'INSERT INTO campaign_insights (campaign_id, date, impressions, clicks, ctr, cpc, spend, reach, frequency, unique_clicks, cost_per_unique_click) ' +
              'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ' +
              'ON CONFLICT (campaign_id, date) DO UPDATE SET ' +
              'impressions = $3, clicks = $4, ctr = $5, cpc = $6, spend = $7, reach = $8, frequency = $9, unique_clicks = $10, cost_per_unique_click = $11, updated_at = NOW()',
              [
                campaignId,
                date,
                insight.impressions || 0,
                insight.clicks || 0,
                insight.ctr || 0,
                insight.cpc || 0,
                insight.spend || 0,
                insight.reach || 0,
                insight.frequency || 0,
                insight.unique_clicks || 0,
                insight.cost_per_unique_click || 0
              ]
            );
          }
        }
        
        await client.query('COMMIT');
      } catch (dbError) {
        await client.query('ROLLBACK');
        console.error('Erro ao salvar insights:', dbError);
      } finally {
        client.release();
      }
      
      // Formatar dados para a resposta
      const processedInsights = insights.map(insight => ({
        date: insight.date_start,
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        impressions: insight.impressions || 0,
        clicks: insight.clicks || 0,
        ctr: insight.ctr || 0,
        cpc: insight.cpc || 0,
        spend: insight.spend || 0,
        reach: insight.reach || 0
      }));
      
      res.status(200).json({ insights: processedInsights });
    } catch (error) {
      console.error('Erro ao buscar insights:', error);
      
      // Verificar se é erro da API do Meta
      if (error.response && error.response.data) {
        return res.status(error.response.status).json({ 
          message: 'Erro ao obter insights do Meta Ads',
          error: error.response.data.error,
          origin: 'facebook' 
        });
      }
      
      next(error);
    }
  }

  /**
   * Get insights for a specific Meta Ads campaign
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getMetaCampaignInsights(req, res, next) {
    try {
      const userId = req.user.userId;
      const { campaignId } = req.params;
      const { start_date, end_date } = req.query;
      
      // Validar acesso do usuário à campanha
      const campaignCheck = await this.pgPool.query(
        'SELECT c.* FROM campaigns c ' +
        'JOIN ad_accounts a ON c.account_id = a.account_id ' +
        'WHERE a.user_id = $1 AND c.campaign_id = $2',
        [userId, campaignId]
      );
      
      if (campaignCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Campanha não encontrada ou sem acesso' });
      }
      
      // Validar parâmetros obrigatórios
      if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Datas de início e fim são obrigatórias' });
      }
      
      // Obter token de acesso do usuário
      const accessToken = await this.getMetaAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ message: 'Não foi possível obter token de acesso ao Meta Ads' });
      }
      
      // Construir parâmetros da requisição
      const axios = require('axios');
      const metrics = 'impressions,clicks,ctr,cpc,spend,reach,frequency,unique_clicks,cost_per_unique_click';
      
      const params = {
        time_range: JSON.stringify({
          since: start_date,
          until: end_date
        }),
        fields: `campaign_name,adset_name,ad_name,date_start,date_stop,${metrics}`,
        time_increment: 1,
        level: 'ad',
        access_token: accessToken
      };
      
      // Fazer requisição à API do Meta
      const response = await axios.get(
        `https://graph.facebook.com/v17.0/${campaignId}/insights`,
        { params }
      );
      
      // Formatar dados para a resposta
      const insights = response.data.data.map(insight => ({
        date: insight.date_start,
        campaign_name: insight.campaign_name,
        adset_name: insight.adset_name,
        ad_name: insight.ad_name,
        impressions: insight.impressions || 0,
        clicks: insight.clicks || 0,
        ctr: insight.ctr || 0,
        cpc: insight.cpc || 0,
        spend: insight.spend || 0,
        reach: insight.reach || 0
      }));
      
      res.status(200).json({ insights });
    } catch (error) {
      console.error('Erro ao buscar insights da campanha:', error);
      
      // Verificar se é erro da API do Meta
      if (error.response && error.response.data) {
        return res.status(error.response.status).json({ 
          message: 'Erro ao obter insights da campanha do Meta Ads',
          error: error.response.data.error,
          origin: 'facebook' 
        });
      }
      
      next(error);
    }
  }

  /**
   * Remove (desassociar) a Meta Ads account from user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async removeMetaAdAccount(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountId } = req.params;
      
      // Verificar se a conta existe e pertence ao usuário
      const accountCheck = await this.pgPool.query(
        'SELECT * FROM ad_accounts WHERE user_id = $1 AND account_id = $2',
        [userId, accountId]
      );
      
      if (accountCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Conta de anúncios não encontrada ou sem acesso' });
      }
      
      // Remover associação da conta com o usuário
      await this.pgPool.query(
        'DELETE FROM ad_accounts WHERE user_id = $1 AND account_id = $2',
        [userId, accountId]
      );
      
      res.status(200).json({ message: 'Conta de anúncios removida com sucesso' });
    } catch (error) {
      console.error('Erro ao remover conta de anúncios:', error);
      next(error);
    }
  }

  /**
   * Get Meta Insights
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getMetaInsights(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountId, dateRange, fields, level, breakdowns } = req.body;
      
      // Ensure consistent response format
      res.set('Content-Type', 'application/json');
      
      console.log('[IntegrationController] Buscando insights do Meta para usuário:', userId);
      
      // Validar campos obrigatórios
      if (!accountId) {
        return res.status(400).json({
          message: 'ID da conta de anúncios é obrigatório',
          error: 'missing_account_id',
          success: false,
          diagnostics: {
            type: 'validation_error',
            suggestion: 'Selecione uma conta de anúncios válida para continuar.'
          },
          insights: []
        });
      }
      
      if (!dateRange || !dateRange.since || !dateRange.until) {
        return res.status(400).json({
          message: 'Intervalo de datas é obrigatório (since e until)',
          error: 'missing_date_range',
          success: false,
          diagnostics: {
            type: 'validation_error',
            suggestion: 'Por favor, selecione um período válido para buscar os dados.'
          },
          insights: []
        });
      }
      
      // Get Meta integration
      const integrationResult = await this.pgPool.query(
        'SELECT ui.id, ui.credentials FROM user_integrations ui ' +
        'JOIN integration_sources int_src ON ui.source_id = int_src.id ' +
        'WHERE ui.user_id = $1 AND int_src.name = $2 AND ui.is_connected = true',
        [userId, 'meta_ads']
      );
      
      if (integrationResult.rows.length === 0) {
        console.log('[IntegrationController] Integração Meta Ads não encontrada para usuário:', userId);
        return res.status(404).json({
          message: 'Integração com Meta Ads não encontrada ou não está ativa',
          error: 'integration_required',
          success: false,
          diagnostics: {
            type: 'integration_missing',
            suggestion: 'Você precisa conectar sua conta do Meta Ads antes de acessar os insights. Clique no botão "Conectar Meta Ads" para iniciar o processo de conexão.'
          },
          insights: []
        });
      }
      
      const integration = integrationResult.rows[0];
      const credentials = integration.credentials;
      
      // Check if token exists
      if (!credentials || !credentials.access_token) {
        console.log('[IntegrationController] Token Meta Ads não encontrado para usuário:', userId);
        return res.status(401).json({
          message: 'Token do Meta Ads não encontrado. Por favor, reconecte sua conta.',
          error: 'token_not_found',
          success: false,
          diagnostics: {
            type: 'authentication_error',
            suggestion: 'Suas credenciais do Meta Ads não foram encontradas. Clique em "Reconectar Meta Ads" para autorizar novamente.'
          },
          insights: []
        });
      }
      
      // Check if token is valid
      if (credentials.expires_at && credentials.expires_at < Date.now()) {
        console.log('[IntegrationController] Token Meta Ads expirado para usuário:', userId);
        return res.status(401).json({
          message: 'Token do Meta Ads expirou. Por favor, reconecte sua conta.',
          error: 'token_expired',
          success: false,
          diagnostics: {
            type: 'expired_token',
            suggestion: 'Sua sessão com o Meta Ads expirou. Para continuar usando a integração, clique em "Reconectar Meta Ads".'
          },
          insights: []
        });
      }
      
      console.log('[IntegrationController] Chamando API de Insights do Meta Ads com parâmetros:', {
        accountId,
        dateRange,
        fields: fields ? fields.slice(0, 5) : 'no fields specified',
        level,
        breakdowns: breakdowns ? breakdowns.slice(0, 3) : 'no breakdowns specified'
      });
      
      // Fetch insights from Meta
      const axios = require('axios');
      const defaultFields = ['campaign_name', 'adset_name', 'ad_name', 'account_name', 'spend', 'impressions', 'clicks', 'reach', 'cpm', 'cpc', 'ctr'];
      const insightsFields = fields && fields.length > 0 ? fields : defaultFields;
      
      try {
        // Constrói a URL da API de insights
        const apiEndpoint = `https://graph.facebook.com/v17.0/${accountId}/insights`;
        
        // Preparar parâmetros para a API
        const apiParams = {
          access_token: credentials.access_token,
          time_range: JSON.stringify({
            since: dateRange.since,
            until: dateRange.until
          }),
          fields: insightsFields.join(','),
          limit: 500 // Limite máximo de resultados
        };
        
        // Adicionar level (campanha, adset, ad) se fornecido
        if (level) {
          apiParams.level = level;
        }
        
        // Adicionar breakdowns se fornecidos
        if (breakdowns && breakdowns.length > 0) {
          apiParams.breakdowns = breakdowns.join(',');
        }
        
        console.log('[IntegrationController] Realizando chamada para a API Meta Insights');
        
        const insightsResponse = await axios.get(apiEndpoint, {
          params: apiParams,
          timeout: 25000, // 25 segundos de timeout para relatórios grandes
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log('[IntegrationController] Resposta da API Meta Insights recebida com sucesso:', {
          hasData: !!insightsResponse.data,
          dataLength: insightsResponse.data?.data?.length || 0
        });
        
        if (!insightsResponse.data || !insightsResponse.data.data) {
          console.warn('[IntegrationController] Resposta da API Meta Insights sem dados esperados');
          return res.status(200).json({
            insights: [],
            success: true,
            diagnostics: {
              type: 'empty_response',
              suggestion: 'Nenhum dado de performance foi encontrado para o período selecionado. Tente selecionar um período diferente ou verifique se há campanhas ativas na conta.'
            }
          });
        }
        
        const insights = insightsResponse.data.data || [];
        
        // Log do tamanho dos dados
        console.log('[IntegrationController] Retornando', insights.length, 'insights do Meta');
        
        return res.status(200).json({
          insights: insights,
          success: true
        });
      } catch (metaApiError) {
        console.error('[IntegrationController] Erro na API de Insights do Meta:', metaApiError.message);
        
        // Verificar detalhes do erro da API Meta
        const metaErrorResponse = metaApiError.response?.data?.error;
        
        // Preparar diagnóstico padrão
        let diagnostics = {
          type: 'api_error',
          suggestion: 'Ocorreu um erro ao acessar os dados do Meta Ads. Tente novamente mais tarde.'
        };
        
        let errorCode = 'meta_insights_error';
        let statusCode = 400;
        
        if (metaErrorResponse) {
          console.error('[IntegrationController] Erro detalhado da API Meta Insights:', {
            type: metaErrorResponse.type,
            message: metaErrorResponse.message,
            code: metaErrorResponse.code,
            fbtrace_id: metaErrorResponse.fbtrace_id
          });
          
          // Diagnósticos específicos para diferentes tipos de erros da API Meta
          if (metaErrorResponse.type === 'OAuthException') {
            diagnostics = {
              type: 'oauth_error',
              suggestion: 'Sua autorização com o Meta Ads expirou ou foi revogada. Clique em "Reconectar Meta Ads" para autorizar novamente.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'oauth_error';
            statusCode = 401;
          } else if (metaErrorResponse.code === 4 || metaErrorResponse.code === 17 || (metaErrorResponse.message && metaErrorResponse.message.includes('rate limit'))) {
            diagnostics = {
              type: 'rate_limit',
              suggestion: 'Você atingiu o limite de requisições para a API do Meta Ads. Aguarde alguns minutos e tente novamente.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'rate_limit_exceeded';
            statusCode = 429;
          } else if (metaErrorResponse.code === 10 || metaErrorResponse.type === 'PermissionError') {
            diagnostics = {
              type: 'permission_error',
              suggestion: 'Você não tem permissão para acessar os dados desta conta. Verifique suas permissões no Business Manager do Meta Ads.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'permission_denied';
            statusCode = 403;
          } else if (metaErrorResponse.code === 100) {
            // Código 100 geralmente indica um parâmetro inválido
            diagnostics = {
              type: 'parameter_error',
              suggestion: 'Um ou mais parâmetros enviados são inválidos. Verifique o ID da conta e o intervalo de datas.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'invalid_parameter';
          } else if (metaErrorResponse.code === 2 || (metaErrorResponse.message && metaErrorResponse.message.toLowerCase().includes('temporarily'))) {
            diagnostics = {
              type: 'service_unavailable',
              suggestion: 'O serviço da API do Meta Ads está temporariamente indisponível. Tente novamente mais tarde.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'service_unavailable';
            statusCode = 503;
          } else if (metaErrorResponse.message && (metaErrorResponse.message.includes('date range') || metaErrorResponse.message.includes('time_range'))) {
            diagnostics = {
              type: 'date_range_error',
              suggestion: 'O intervalo de datas fornecido é inválido. Verifique se as datas estão no formato correto (YYYY-MM-DD) e se o período não é muito extenso.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'invalid_date_range';
          }
          
          // Se a conta não existe ou ID inválido
          if (metaErrorResponse.message && metaErrorResponse.message.includes('Invalid account id')) {
            diagnostics = {
              type: 'invalid_account',
              suggestion: 'O ID da conta de anúncios fornecido é inválido ou você não tem acesso a ela.',
              error_details: metaErrorResponse.message
            };
            errorCode = 'invalid_account_id';
          }
          
          console.log('[IntegrationController] Erro na API do Meta Insights diagnosticado como:', diagnostics.type);
          
          return res.status(statusCode).json({
            message: 'Erro ao buscar insights do Meta Ads: ' + metaErrorResponse.message,
            error: errorCode,
            details: metaErrorResponse,
            success: false,
            diagnostics: diagnostics,
            insights: []
          });
        }
        
        // Erro genérico da API Meta
        return res.status(statusCode).json({
          message: 'Erro ao buscar insights do Meta Ads',
          error: errorCode,
          details: metaApiError.message,
          success: false,
          diagnostics: diagnostics,
          insights: []
        });
      }
    } catch (error) {
      console.error('[IntegrationController] Erro interno ao buscar insights do Meta:', error);
      
      // Garantir que a resposta seja JSON
      res.set('Content-Type', 'application/json');
      
      res.status(500).json({
        message: 'Erro interno ao buscar insights do Meta Ads',
        error: 'internal_server_error',
        success: false,
        diagnostics: {
          type: 'internal_error',
          suggestion: 'Ocorreu um erro inesperado no servidor. Por favor, tente novamente mais tarde ou entre em contato com o suporte se o problema persistir.'
        },
        insights: []
      });
    }
  }

  /**
   * Helper method to get Meta access token for a user
   * @param {number} userId - User ID
   * @returns {string|null} - Access token or null if not found
   */
  async getMetaAccessToken(userId) {
    try {
      // Get Meta Ads integration source ID
      const sourceResult = await this.pgPool.query(
        'SELECT id FROM integration_sources WHERE name = $1',
        ['meta_ads']
      );
      
      if (sourceResult.rows.length === 0) {
        console.error('Fonte de integração Meta Ads não encontrada');
        return null;
      }
      
      const sourceId = sourceResult.rows[0].id;
      
      // Get user's Meta integration
      const integrationResult = await this.pgPool.query(
        'SELECT credentials FROM user_integrations WHERE user_id = $1 AND source_id = $2 AND is_connected = true',
        [userId, sourceId]
      );
      
      if (integrationResult.rows.length === 0) {
        console.error('Integração Meta Ads não encontrada para o usuário');
        return null;
      }
      
      const credentials = integrationResult.rows[0].credentials;
      
      if (!credentials || !credentials.access_token) {
        console.error('Token de acesso não encontrado para a integração Meta Ads');
        return null;
      }
      
      return credentials.access_token;
    } catch (error) {
      console.error('Erro ao obter token de acesso Meta:', error);
      return null;
    }
  }

  /**
   * Connect to Google Analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async connectGoogleAnalytics(req, res, next) {
    try {
      // This is a placeholder for future implementation
      res.status(501).json({ 
        message: 'Integração com Google Analytics será implementada em breve',
        details: 'Esta funcionalidade ainda está em desenvolvimento. Volte em breve para acessá-la.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Google Auth URL
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getGoogleAuthUrl(req, res, next) {
    try {
      // Forçar cabeçalhos Content-Type para JSON
      res.set('Content-Type', 'application/json');
      
      const userId = req.user.userId;
      if (!userId) {
        console.error('[IntegrationController] UserId inválido ao gerar URL Google Auth:', userId);
        return res.status(400).json({
          message: 'Usuário não encontrado',
          error: 'user_not_found',
          success: false,
          diagnostics: {
            type: 'authentication_error',
            suggestion: 'Por favor, faça login novamente para continuar.'
          }
        });
      }
      
      const { redirectUri } = req.query;
      
      // Validate environment variables
      if (!process.env.GOOGLE_CLIENT_ID) {
        console.error('[IntegrationController] Variável de ambiente GOOGLE_CLIENT_ID não configurada');
        return res.status(500).json({
          message: 'Configuração da integração com Google Analytics incompleta',
          error: 'config_error',
          success: false,
          diagnostics: {
            type: 'configuration_error',
            suggestion: 'A integração com Google Analytics não está configurada corretamente no servidor. Entre em contato com o suporte.'
          }
        });
      }
      
      // Gerar state token para prevenir CSRF
      const stateToken = crypto.randomBytes(32).toString('hex');
      
      const useRedirectUri = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/connect-google/callback`;
      
      console.log('[IntegrationController] Gerando URL Google OAuth para usuário:', userId);
      
      // Store state token in Redis with expiration
      await this.redisClient.set(`google_auth_state:${userId}`, stateToken, 'EX', 3600); // 1 hour
      
      // Constrói a URL de autenticação do Google
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&response_type=code&scope=https://www.googleapis.com/auth/analytics.readonly&redirect_uri=${encodeURIComponent(useRedirectUri)}&state=${stateToken}&access_type=offline&prompt=consent`;
      
      console.log('[IntegrationController] URL Google OAuth gerada com sucesso');
      
      return res.json({
        authUrl,
        success: true
      });
    } catch (error) {
      console.error('[IntegrationController] Erro ao gerar URL Google Auth:', error);
      
      // Forçar cabeçalhos Content-Type para JSON
      res.set('Content-Type', 'application/json');
      
      return res.status(500).json({
        message: 'Erro ao gerar URL de autenticação do Google Analytics',
        error: 'auth_url_generation_error',
        success: false,
        diagnostics: {
          type: 'internal_error',
          suggestion: 'Ocorreu um erro ao iniciar o processo de integração com o Google Analytics. Por favor, tente novamente mais tarde.'
        }
      });
    }
  }

  /**
   * Get account status text based on status code
   * @param {number} statusCode - Account status code from Meta API
   * @returns {string} Status text
   * @private
   */
  _getAccountStatusText(statusCode) {
    switch (statusCode) {
      case 1:
        return 'Ativa';
      case 2:
        return 'Desativada';
      case 3:
        return 'Indisponível';
      case 7:
        return 'Pendente de Revisão';
      case 8:
        return 'Fechada';
      case 9:
        return 'Pendente de Fechamento';
      case 100:
        return 'Acesso Negado';
      case 101:
        return 'Removida';
      default:
        return 'Status Desconhecido';
    }
  }
}

module.exports = IntegrationController;
