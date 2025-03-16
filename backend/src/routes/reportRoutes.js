const express = require('express');
const { body } = require('express-validator');
const ReportController = require('../controllers/reportController');

const router = express.Router();

/**
 * Create routes for report functionality
 * @param {Object} redisClient - Redis client
 * @param {Object} pgPool - PostgreSQL connection pool
 * @returns {Object} Express router
 */
module.exports = function(redisClient, pgPool) {
  const reportController = new ReportController(redisClient, pgPool);

  // Get account overview
  router.get(
    '/account/:accountId/overview',
    reportController.getAccountOverview.bind(reportController)
  );

  // Get campaign insights
  router.get(
    '/campaigns/:campaignId/insights',
    reportController.getCampaignInsights.bind(reportController)
  );

  // Save a custom report
  router.post(
    '/save',
    [
      body('name').notEmpty().withMessage('O nome do relatório é obrigatório'),
      body('reportType').notEmpty().withMessage('O tipo de relatório é obrigatório')
    ],
    reportController.saveReport.bind(reportController)
  );

  // Get all saved reports
  router.get(
    '/saved',
    reportController.getSavedReports.bind(reportController)
  );

  // Get a specific saved report
  router.get(
    '/saved/:reportId',
    reportController.getSavedReport.bind(reportController)
  );

  return router;
};
