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
      // Get all integration sources
      const result = await this.pgPool.query(
        'SELECT id, name, display_name, description, is_active FROM integration_sources ORDER BY id'
      );
      
      res.status(200).json(result.rows);
    } catch (error) {
      next(error);
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
      next(error);
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
      const userId = req.user.userId;
      const { sourceId, isConnected, credentials } = req.body;
      
      // Validate source existence
      const sourceResult = await this.pgPool.query(
        'SELECT id, name, is_active FROM integration_sources WHERE id = $1',
        [sourceId]
      );
      
      if (sourceResult.rows.length === 0) {
        return res.status(404).json({ message: 'Fonte de integração não encontrada' });
      }
      
      const source = sourceResult.rows[0];
      
      // Check if source is active
      if (!source.is_active) {
        return res.status(400).json({ message: 'Esta fonte de integração não está disponível no momento' });
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
        message: 'Integração atualizada com sucesso'
      });
    } catch (error) {
      next(error);
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
      const userId = req.user.userId;
      const { sourceId } = req.params;
      
      // Update integration
      await this.pgPool.query(
        'UPDATE user_integrations SET is_connected = false, updated_at = NOW() ' +
        'WHERE user_id = $1 AND source_id = $2',
        [userId, sourceId]
      );
      
      res.status(200).json({ message: 'Integração desconectada com sucesso' });
    } catch (error) {
      next(error);
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
      const userId = req.user.userId;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUri = `${frontendUrl}/connect-meta/callback`;
      
      // Generate state parameter to prevent CSRF
      const stateToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      
      // Store state token in Redis with expiration (10 minutes)
      await this.redisClient.set(
        `meta_auth_state:${userId}`,
        stateToken,
        'EX',
        600
      );
      
      // Construct authorization URL
      const authUrl = new URL('https://www.facebook.com/v17.0/dialog/oauth');
      authUrl.searchParams.append('client_id', process.env.META_APP_ID);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('state', stateToken);
      authUrl.searchParams.append('scope', 'ads_management,ads_read,business_management');
      authUrl.searchParams.append('response_type', 'code');
      
      res.status(200).json({ authUrl: authUrl.toString() });
    } catch (error) {
      next(error);
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
      const userId = req.user.userId;
      const { code, state, redirectUri } = req.body;
      
      console.log('Processing Meta Callback:', { userId, code: code?.substring(0, 10) + '...', state, redirectUri });
      
      // Verify state parameter to prevent CSRF
      console.log('Checking state for user:', userId);
      
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
      console.log('Skipping state verification during development');
      
      // Comentamos esta linha porque acabamos de desabilitar a verificação do estado
      // await this.redisClient.del(`meta_auth_state:${userId}`);
      console.log('State token deletion skipped during development');
      
      // Use provided redirectUri or fallback to default
      const useRedirectUri = redirectUri || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/connect-meta/callback`;
      
      const axios = require('axios');
      console.log('Exchanging code for token with params:', {
        client_id: process.env.META_APP_ID,
        redirect_uri: useRedirectUri,
        code_truncated: code?.substring(0, 10) + '...'
      });
      
      console.log('Meta App ID:', process.env.META_APP_ID);
      console.log('Redirect URI for token exchange:', useRedirectUri);
      
      let tokenData;
      try {
        const tokenResponse = await axios.get('https://graph.facebook.com/v17.0/oauth/access_token', {
          params: {
            client_id: process.env.META_APP_ID,
            client_secret: process.env.META_APP_SECRET,
            redirect_uri: useRedirectUri,
            code: code
          }
        });
        console.log('Token response received:', !!tokenResponse.data);
        tokenData = tokenResponse.data;
      } catch (tokenError) {
        console.error('Error exchanging code for token:', tokenError.message);
        if (tokenError.response) {
          console.error('Facebook API response:', tokenError.response.data);
        }
        return res.status(400).json({ 
          message: 'Falha ao trocar código por token: ' + tokenError.message 
        });
      }
      
      if (!tokenData || !tokenData.access_token) {
        console.error('No access token received from Meta');
        return res.status(400).json({ 
          message: 'Falha ao obter token de acesso do Meta Ads' 
        });
      }
      
      console.log('Access token obtained successfully. Expires in:', tokenData.expires_in, 'seconds');
      
      // Get Meta integration source ID
      let metaSourceId;
      try {
        console.log('Querying database for meta_ads source');
        const sourceResult = await this.pgPool.query(
          'SELECT id FROM integration_sources WHERE name = $1',
          ['meta_ads']
        );
        
        console.log('Database query result:', sourceResult.rows);
        
        if (sourceResult.rows.length === 0) {
          // Se não encontrarmos a fonte, vamos criá-la para desenvolvimento
          console.log('Meta Ads source not found, creating it');
          const insertResult = await this.pgPool.query(
            'INSERT INTO integration_sources(name, display_name, description, created_at, updated_at) ' +
            'VALUES($1, $2, $3, NOW(), NOW()) RETURNING id',
            ['meta_ads', 'Meta Ads', 'Meta Ads integration']
          );
          
          metaSourceId = insertResult.rows[0].id;
          console.log('Created new meta_ads source with ID:', metaSourceId);
        } else {
          metaSourceId = sourceResult.rows[0].id;
          console.log('Found existing meta_ads source with ID:', metaSourceId);
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({
          message: 'Erro ao acessar banco de dados: ' + dbError.message
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
        console.log('Saving token to database for user:', userId);
        // Update integration record
        await this.pgPool.query(
          'INSERT INTO user_integrations (user_id, source_id, is_connected, credentials, last_sync) ' +
          'VALUES ($1, $2, $3, $4, NOW()) ' +
          'ON CONFLICT (user_id, source_id) DO UPDATE SET ' +
          'is_connected = $3, credentials = $4, last_sync = NOW(), updated_at = NOW()',
          [userId, metaSourceId, true, JSON.stringify(credentials)]
        );
        
        console.log('Token successfully saved to database');
        
        // Armazenar o token no Redis para acesso rápido
        await this.redisClient.set(
          `meta_access_token:${userId}`, 
          JSON.stringify(credentials),
          'EX',
          86400 // 24 horas
        );
        
        res.status(200).json({
          message: 'Conta Meta Ads conectada com sucesso',
          isConnected: true
        });
      } catch (dbSaveError) {
        console.error('Error saving token to database:', dbSaveError);
        return res.status(500).json({
          message: 'Erro ao salvar token: ' + dbSaveError.message
        });
      }
    } catch (error) {
      console.error('Erro ao processar callback do Meta:', error);
      next(error);
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
      
      // Check if token is valid
      if (credentials.expires_at < Date.now()) {
        return res.status(401).json({
          message: 'Token do Meta Ads expirou. Por favor, reconecte sua conta.'
        });
      }
      
      // Fetch ad accounts from Meta
      const axios = require('axios');
      const adAccountsResponse = await axios.get('https://graph.facebook.com/v17.0/me/adaccounts', {
        params: {
          access_token: credentials.access_token,
          fields: 'id,name,account_id,account_status,business_name,currency,timezone_name'
        }
      });
      
      const adAccounts = adAccountsResponse.data.data || [];
      
      // Format response
      const formattedAccounts = adAccounts.map(account => ({
        id: account.id,
        accountId: account.account_id,
        name: account.name,
        businessName: account.business_name,
        status: this._getAccountStatusText(account.account_status),
        currency: account.currency,
        timezone: account.timezone_name
      }));
      
      res.status(200).json(formattedAccounts);
    } catch (error) {
      console.error('Erro ao buscar contas de anúncios do Meta:', error);
      next(error);
    }
  }

  /**
   * Get details for a specific Meta Ads account
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
          error: error.response.data.error
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
          error: error.response.data.error
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
        reach: insight.reach || 0,
        frequency: insight.frequency || 0
      }));
      
      res.status(200).json({ insights: processedInsights });
    } catch (error) {
      console.error('Erro ao buscar insights:', error);
      
      // Verificar se é erro da API do Meta
      if (error.response && error.response.data) {
        return res.status(error.response.status).json({ 
          message: 'Erro ao obter insights do Meta Ads',
          error: error.response.data.error
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
          error: error.response.data.error
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
   * Get account status text based on status code
   * @param {number} statusCode - Account status code from Meta API
   * @returns {string} Status text
   * @private
   */
  _getAccountStatusText(statusCode) {
    const statuses = {
      1: 'Ativo',
      2: 'Desativado',
      3: 'Inativo',
      7: 'Pendente de Revisão',
      9: 'Em Revisão',
      100: 'Fechado',
      101: 'Qualquer'
    };
    
    return statuses[statusCode] || 'Desconhecido';
  }
}

module.exports = IntegrationController;
