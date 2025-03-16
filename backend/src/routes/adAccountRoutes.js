const express = require('express');
const { body } = require('express-validator');
const AdAccountController = require('../controllers/adAccountController');

const router = express.Router();

/**
 * Create routes for ad account functionality
 * @param {Object} redisClient - Redis client
 * @param {Object} pgPool - PostgreSQL connection pool
 * @returns {Object} Express router
 */
module.exports = function(redisClient, pgPool) {
  const adAccountController = new AdAccountController(redisClient, pgPool);

  // Connect to Meta Ads account
  router.post(
    '/connect-meta',
    [
      body('code').notEmpty().withMessage('O código de autorização é obrigatório'),
      body('redirectUri').notEmpty().withMessage('O URI de redirecionamento é obrigatório')
    ],
    adAccountController.connectMeta.bind(adAccountController)
  );

  // Get all ad accounts
  router.get(
    '/',
    adAccountController.getAdAccounts.bind(adAccountController)
  );

  // Get campaigns for an ad account
  router.get(
    '/:accountId/campaigns',
    adAccountController.getCampaigns.bind(adAccountController)
  );

  // Get ad sets for a campaign
  router.get(
    '/campaigns/:campaignId/adsets',
    adAccountController.getAdSets.bind(adAccountController)
  );

  // Get ads for an ad set
  router.get(
    '/adsets/:adSetId/ads',
    adAccountController.getAds.bind(adAccountController)
  );

  return router;
};
