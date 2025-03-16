const MetaService = require('../services/metaService');

/**
 * Controller for report generation endpoints
 */
class ReportController {
  constructor(redisClient, pgPool) {
    this.metaService = new MetaService(redisClient, pgPool);
    this.pgPool = pgPool;
    this.redisClient = redisClient;
  }

  /**
   * Get campaign insights for a specific date range
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getCampaignInsights(req, res, next) {
    try {
      const userId = req.user.userId;
      const { campaignId } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Datas de início e fim são obrigatórias' });
      }
      
      // Get insights
      const insights = await this.metaService.getCampaignInsights(userId, campaignId, {
        start: startDate,
        end: endDate
      });
      
      res.status(200).json(insights);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account overview - summary of all campaigns
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAccountOverview(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountId } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Datas de início e fim são obrigatórias' });
      }
      
      // Get campaigns
      const campaigns = await this.metaService.getCampaigns(userId, accountId);
      
      const dateRange = {
        start: startDate,
        end: endDate
      };
      
      // Get insights for all campaigns
      const insightsPromises = campaigns.map(campaign => 
        this.metaService.getCampaignInsights(userId, campaign.id, dateRange)
      );
      
      const allCampaignInsights = await Promise.all(insightsPromises);
      
      // Process data for overview
      const overview = {
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalReach: 0,
        avgCTR: 0,
        avgCPC: 0,
        campaignCount: campaigns.length,
        performanceByDay: {},
        campaigns: []
      };
      
      // Process each campaign's insights
      allCampaignInsights.forEach((insights, index) => {
        const campaign = campaigns[index];
        
        let campaignData = {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalReach: 0,
          avgCTR: 0,
          avgCPC: 0,
          performanceByDay: []
        };
        
        // Process daily insights
        insights.forEach(daily => {
          // Add to campaign totals
          campaignData.totalSpend += parseFloat(daily.spend || 0);
          campaignData.totalImpressions += parseInt(daily.impressions || 0);
          campaignData.totalClicks += parseInt(daily.clicks || 0);
          campaignData.totalReach += parseInt(daily.reach || 0);
          
          // Add to account overview daily performance
          const date = daily.date_start;
          if (!overview.performanceByDay[date]) {
            overview.performanceByDay[date] = {
              date,
              spend: 0,
              impressions: 0,
              clicks: 0,
              reach: 0
            };
          }
          
          overview.performanceByDay[date].spend += parseFloat(daily.spend || 0);
          overview.performanceByDay[date].impressions += parseInt(daily.impressions || 0);
          overview.performanceByDay[date].clicks += parseInt(daily.clicks || 0);
          overview.performanceByDay[date].reach += parseInt(daily.reach || 0);
          
          // Add to campaign daily performance
          campaignData.performanceByDay.push({
            date,
            spend: parseFloat(daily.spend || 0),
            impressions: parseInt(daily.impressions || 0),
            clicks: parseInt(daily.clicks || 0),
            reach: parseInt(daily.reach || 0),
            ctr: parseFloat(daily.ctr || 0),
            cpc: parseFloat(daily.cpc || 0)
          });
        });
        
        // Calculate campaign averages
        if (campaignData.totalImpressions > 0) {
          campaignData.avgCTR = (campaignData.totalClicks / campaignData.totalImpressions) * 100;
        }
        
        if (campaignData.totalClicks > 0) {
          campaignData.avgCPC = campaignData.totalSpend / campaignData.totalClicks;
        }
        
        // Add to account totals
        overview.totalSpend += campaignData.totalSpend;
        overview.totalImpressions += campaignData.totalImpressions;
        overview.totalClicks += campaignData.totalClicks;
        overview.totalReach += campaignData.totalReach;
        
        // Add campaign data to overview
        overview.campaigns.push(campaignData);
      });
      
      // Calculate account averages
      if (overview.totalImpressions > 0) {
        overview.avgCTR = (overview.totalClicks / overview.totalImpressions) * 100;
      }
      
      if (overview.totalClicks > 0) {
        overview.avgCPC = overview.totalSpend / overview.totalClicks;
      }
      
      // Convert performance by day from object to array
      overview.performanceByDay = Object.values(overview.performanceByDay)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Sort campaigns by spend (highest first)
      overview.campaigns.sort((a, b) => b.totalSpend - a.totalSpend);
      
      res.status(200).json(overview);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save a custom report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async saveReport(req, res, next) {
    try {
      const userId = req.user.userId;
      const { name, description, reportType, filters, columns, sortBy, dateRange } = req.body;
      
      // Validate required fields
      if (!name || !reportType) {
        return res.status(400).json({ message: 'Nome e tipo de relatório são obrigatórios' });
      }
      
      // Save report configuration
      const result = await this.pgPool.query(
        'INSERT INTO saved_reports (user_id, name, description, report_type, filters, columns, sort_by, date_range) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [
          userId, 
          name, 
          description, 
          reportType, 
          JSON.stringify(filters || {}), 
          JSON.stringify(columns || []), 
          JSON.stringify(sortBy || {}), 
          JSON.stringify(dateRange || {})
        ]
      );
      
      const reportId = result.rows[0].id;
      
      res.status(201).json({ 
        id: reportId,
        message: 'Relatório salvo com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's saved reports
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getSavedReports(req, res, next) {
    try {
      const userId = req.user.userId;
      
      // Get saved reports
      const result = await this.pgPool.query(
        'SELECT id, name, description, report_type, created_at, updated_at FROM saved_reports WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      
      res.status(200).json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific saved report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getSavedReport(req, res, next) {
    try {
      const userId = req.user.userId;
      const { reportId } = req.params;
      
      // Get saved report
      const result = await this.pgPool.query(
        'SELECT * FROM saved_reports WHERE id = $1 AND user_id = $2',
        [reportId, userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Relatório não encontrado' });
      }
      
      res.status(200).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReportController;
