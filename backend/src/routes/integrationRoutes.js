const express = require('express');
const { body } = require('express-validator');
const IntegrationController = require('../controllers/integrationController');

const router = express.Router();

/**
 * Create routes for integration functionality
 * @param {Object} redisClient - Redis client
 * @param {Object} pgPool - PostgreSQL connection pool
 * @returns {Object} Express router
 */
module.exports = function(redisClient, pgPool) {
  const integrationController = new IntegrationController(redisClient, pgPool);

  // Get all available integration sources
  router.get(
    '/sources',
    integrationController.getIntegrationSources.bind(integrationController)
  );

  // Get user's integrations
  router.get(
    '/',
    integrationController.getUserIntegrations.bind(integrationController)
  );

  // Create/update an integration
  router.post(
    '/',
    [
      body('sourceId').isInt().withMessage('ID da fonte de integração deve ser um número'),
      body('isConnected').isBoolean().withMessage('O status de conexão deve ser um booleano')
    ],
    integrationController.upsertIntegration.bind(integrationController)
  );

  // Disconnect an integration
  router.delete(
    '/:sourceId',
    integrationController.disconnectIntegration.bind(integrationController)
  );

  // Meta Ads specific endpoints
  
  // Inicia o fluxo de autorização com Meta Ads
  router.get(
    '/meta-ads/auth-url',
    integrationController.getMetaAuthUrl.bind(integrationController)
  );
  
  // Processa o callback de autorização do Meta Ads
  router.post(
    '/meta-ads/callback',
    [
      body('code').isString().notEmpty().withMessage('Código de autorização é obrigatório'),
      body('state').isString().notEmpty().withMessage('Parâmetro de estado é obrigatório'),
      body('redirectUri').optional().isString().withMessage('URL de redirecionamento deve ser uma string')
    ],
    integrationController.processMetaCallback.bind(integrationController)
  );
  
  // Verifica e renova o token do Meta Ads se necessário
  router.post(
    '/meta-ads/check-token',
    integrationController.checkAndRefreshMetaToken.bind(integrationController)
  );
  
  // Lista as contas de anúncios disponíveis no Meta
  router.get(
    '/meta-ads/accounts',
    integrationController.getMetaAdAccounts.bind(integrationController)
  );

  // Obter detalhes de uma conta de anúncios específica
  router.get(
    '/meta-ads/accounts/:accountId',
    integrationController.getMetaAdAccountDetails.bind(integrationController)
  );

  // Obter campanhas de uma conta específica
  router.get(
    '/meta-ads/accounts/:accountId/campaigns',
    integrationController.getMetaAdCampaigns.bind(integrationController)
  );

  // Obter insights (dados de performance) de uma conta específica
  router.get(
    '/meta-ads/accounts/:accountId/insights',
    integrationController.getMetaAdInsights.bind(integrationController)
  );

  // Obter insights de uma campanha específica
  router.get(
    '/meta-ads/campaigns/:campaignId/insights',
    integrationController.getMetaCampaignInsights.bind(integrationController)
  );

  // Remover uma conta de anúncios (desassociar do usuário)
  router.delete(
    '/meta-ads/accounts/:accountId',
    integrationController.removeMetaAdAccount.bind(integrationController)
  );

  // Google Analytics integration placeholder (to be implemented in the future)
  router.post(
    '/google-analytics/connect',
    integrationController.connectGoogleAnalytics.bind(integrationController)
  );

  return router;
};
