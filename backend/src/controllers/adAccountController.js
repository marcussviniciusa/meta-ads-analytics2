const MetaService = require('../services/metaService');
const PermissionService = require('../services/permissionService');

/**
 * Controller for ad account endpoints
 */
class AdAccountController {
  constructor(redisClient, pgPool) {
    this.metaService = new MetaService(redisClient, pgPool);
    this.permissionService = new PermissionService(pgPool);
  }

  /**
   * Connect user account to Meta
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async connectMeta(req, res, next) {
    try {
      const { code, redirectUri } = req.body;
      const userId = req.user.userId;
      
      // Exchange code for token
      const { access_token, expires_in } = await this.metaService.exchangeCodeForToken(code, redirectUri);
      
      // Store token
      await this.metaService.storeUserToken(userId, access_token, expires_in);
      
      res.status(200).json({ message: 'Conta do Meta conectada com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's ad accounts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAdAccounts(req, res, next) {
    try {
      const userId = req.user.userId;
      
      try {
        // Get ad accounts
        const allAdAccounts = await this.metaService.getAdAccounts(userId);
        
        // Para super_admin e admin, retornar todas as contas
        if (req.user.role === 'super_admin' || req.user.role === 'admin') {
          return res.status(200).json(allAdAccounts);
        }
        
        // Para usuários normais, filtrar apenas as contas permitidas
        const allowedAccountIds = await this.permissionService.getUserAdAccounts(userId);
        
        // Se não houver contas permitidas, retorna array vazio
        if (!allowedAccountIds || allowedAccountIds.length === 0) {
          return res.status(200).json([]);
        }
        
        // Filtrar as contas conforme permissões
        const filteredAccounts = allAdAccounts.filter(account => 
          allowedAccountIds.includes(account.id) || allowedAccountIds.includes(account.account_id)
        );
        
        res.status(200).json(filteredAccounts);
      } catch (error) {
        // Verificar se o erro é de token não encontrado
        if (error.code === 'TOKEN_ERROR' || 
            error.message === 'Token não encontrado' || 
            error.message === 'Token inválido' || 
            error.message === 'Token expirado' ||
            error.message === 'Falha ao recuperar token de acesso') {
          
          // Registrar o problema no log
          console.log(`Usuário ${userId} não possui integração válida com Meta Ads: ${error.originalError || error.message}`);
          
          // Responder com status 400 e mensagem amigável
          return res.status(400).json({
            error: 'integration_required',
            message: 'Integração com Meta Ads não configurada ou expirada. Por favor, conecte sua conta do Meta Ads primeiro.',
            action: 'connect_meta',
            actionUrl: '/connect-meta'
          });
        }
        
        // Para outros erros, passar para o próximo middleware
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get campaigns for an ad account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getCampaigns(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountId } = req.params;
      
      // Verificar permissões para a conta de anúncio
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        const hasAccess = await this.permissionService.hasMetaAdAccountAccess(userId, accountId);
        if (!hasAccess) {
          return res.status(403).json({
            error: 'permission_denied',
            message: 'Você não tem permissão para acessar esta conta de anúncio'
          });
        }
      }
      
      try {
        // Get campaigns
        const campaigns = await this.metaService.getCampaigns(userId, accountId);
        res.status(200).json(campaigns);
      } catch (error) {
        // Verificar se o erro é de token não encontrado
        if (error.message === 'Token não encontrado' || error.message === 'Token inválido' || error.message === 'Token expirado') {
          // Responder com status 400 e mensagem amigável
          return res.status(400).json({
            error: 'integration_required',
            message: 'Integração com Meta Ads não configurada ou expirada. Por favor, conecte sua conta do Meta Ads primeiro.',
            action: 'connect_meta',
            actionUrl: '/connect-meta'
          });
        }
        
        // Para outros erros, passar para o próximo middleware
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ad sets for a campaign
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAdSets(req, res, next) {
    try {
      const userId = req.user.userId;
      const { campaignId } = req.params;
      
      try {
        // Get ad sets
        const adSets = await this.metaService.getAdSets(userId, campaignId);
        res.status(200).json(adSets);
      } catch (error) {
        // Verificar se o erro é de token não encontrado
        if (error.message === 'Token não encontrado' || error.message === 'Token inválido' || error.message === 'Token expirado') {
          // Responder com status 400 e mensagem amigável
          return res.status(400).json({
            error: 'integration_required',
            message: 'Integração com Meta Ads não configurada ou expirada. Por favor, conecte sua conta do Meta Ads primeiro.',
            action: 'connect_meta',
            actionUrl: '/connect-meta'
          });
        }
        
        // Para outros erros, passar para o próximo middleware
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ads for an ad set
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAds(req, res, next) {
    try {
      const userId = req.user.userId;
      const { adSetId } = req.params;
      
      try {
        // Get ads
        const ads = await this.metaService.getAds(userId, adSetId);
        res.status(200).json(ads);
      } catch (error) {
        // Verificar se o erro é de token não encontrado
        if (error.message === 'Token não encontrado' || error.message === 'Token inválido' || error.message === 'Token expirado') {
          // Responder com status 400 e mensagem amigável
          return res.status(400).json({
            error: 'integration_required',
            message: 'Integração com Meta Ads não configurada ou expirada. Por favor, conecte sua conta do Meta Ads primeiro.',
            action: 'connect_meta',
            actionUrl: '/connect-meta'
          });
        }
        
        // Para outros erros, passar para o próximo middleware
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdAccountController;
