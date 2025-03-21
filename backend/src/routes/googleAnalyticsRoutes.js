const express = require('express');
const GoogleAnalyticsService = require('../services/googleAnalyticsService');
const { authMiddleware } = require('../middleware/authMiddleware');

module.exports = function(redisClient, pgPool) {
  const router = express.Router();
  const googleAnalyticsService = new GoogleAnalyticsService(pgPool, redisClient);

  // Obter URL de autenticação
  router.get('/auth-url', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId; 
      const userRole = req.user.role;
      const authUrl = googleAnalyticsService.getAuthUrl(userId, userRole);
      res.json({ url: authUrl });
    } catch (error) {
      console.error('Erro ao gerar URL de autenticação:', error);
      res.status(500).json({ error: 'Erro ao gerar URL de autenticação' });
    }
  });

  // Callback da autenticação Google
  router.get('/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ error: 'Parâmetros inválidos' });
      }
      
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      
      const result = await googleAnalyticsService.handleCallback(code, stateData);
      
      if (result.success) {
        res.redirect(`${process.env.FRONTEND_URL}/dashboard?integration=google-analytics&status=success`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/dashboard?integration=google-analytics&status=error&message=${encodeURIComponent(result.error || 'Erro desconhecido')}`);
      }
    } catch (error) {
      console.error('Erro no callback do Google Analytics:', error);
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?integration=google-analytics&status=error&message=${encodeURIComponent(error.message)}`);
    }
  });

  // Verificar status da conexão
  router.get('/status', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId; 
      const userRole = req.user.role;
      const status = await googleAnalyticsService.checkConnectionStatus(userId, userRole);
      res.json(status);
    } catch (error) {
      console.error('Erro ao verificar status da conexão:', error);
      res.status(500).json({ error: 'Erro ao verificar status da conexão' });
    }
  });

  // Obter propriedades do GA4
  router.get('/properties', authMiddleware, async (req, res) => {
    try {
      // Forçar cabeçalho Content-Type como application/json
      res.set('Content-Type', 'application/json; charset=utf-8');
      // Adicionar headers CORS explicitamente para esta rota
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      console.log('[GoogleAnalyticsRoutes] Buscando propriedades GA para usuário:', req.user.userId);
      console.log('[GoogleAnalyticsRoutes] Headers da requisição:', JSON.stringify(req.headers));
      
      const userId = req.user.userId; 
      const userRole = req.user.role;
      const properties = await googleAnalyticsService.getProperties(userId, userRole);
      
      console.log('[GoogleAnalyticsRoutes] Encontradas', properties.length, 'propriedades GA');
      
      // Retornar como array vazio se não houver propriedades
      if (!properties || !Array.isArray(properties)) {
        console.log('[GoogleAnalyticsRoutes] Nenhuma propriedade GA encontrada ou resposta inválida');
        return res.status(200).json({ properties: [], success: true });
      }
      
      // Formatar propriedades para garantir campos consistentes
      const formattedProperties = properties.map(property => ({
        id: property.property_id,
        propertyId: property.property_id,
        name: property.property_name || 'Propriedade GA',
        accountId: property.account_id,
        accountName: property.account_name || 'Conta GA'
      }));
      
      console.log('[GoogleAnalyticsRoutes] Retornando resposta formatada com', formattedProperties.length, 'propriedades');
      
      // Retornar as propriedades formatadas no formato {properties: [...]}
      return res.status(200).json({ 
        properties: formattedProperties,
        success: true
      });
    } catch (error) {
      console.error('[GoogleAnalyticsRoutes] Erro ao obter propriedades do GA4:', error);
      
      // Forçar cabeçalho Content-Type como application/json mesmo em caso de erro
      res.set('Content-Type', 'application/json; charset=utf-8');
      
      // Verificar se é erro de autenticação
      if (error.message && (
          error.message.includes('token') || 
          error.message.includes('autenticação') || 
          error.message.includes('auth'))) {
        return res.status(401).json({ 
          error: 'authentication_error', 
          message: 'Erro de autenticação com o Google Analytics. Reconecte sua conta.',
          properties: [],
          success: false
        });
      }
      
      // Para outros erros
      return res.status(500).json({ 
        error: 'server_error', 
        message: 'Erro ao obter propriedades do GA4',
        properties: [],
        success: false
      });
    }
  });

  // Obter relatório do GA4
  router.post('/report', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { propertyId, reportConfig, startDate, endDate, dimensions, metrics, dimensionFilters } = req.body;
      
      // Suporte para formato simplificado enviado pelo frontend
      if (propertyId && (startDate || endDate || dimensions || metrics)) {
        // Construir o objeto reportConfig no formato que a API do GA4 espera
        const formattedReportConfig = {
          dateRanges: [
            {
              startDate: startDate || 'yesterday',
              endDate: endDate || 'today'
            }
          ],
          dimensions: dimensions ? dimensions.map(dim => ({ name: dim })) : [],
          metrics: metrics ? metrics.map(metric => ({ name: metric })) : []
        };
        
        // Adicionar filtros, se fornecidos
        if (dimensionFilters && Object.keys(dimensionFilters).length > 0) {
          formattedReportConfig.dimensionFilter = {
            andGroup: {
              expressions: Object.entries(dimensionFilters).map(([dimension, value]) => ({
                filter: {
                  fieldName: dimension,
                  stringFilter: {
                    matchType: 'EXACT',
                    value: value
                  }
                }
              }))
            }
          };
        }
        
        console.log('Solicitação de relatório reformatada:', JSON.stringify(formattedReportConfig, null, 2));
        const report = await googleAnalyticsService.getReport(userId, propertyId, formattedReportConfig, userRole);
        return res.json(report);
      } 
      // Formato original com reportConfig completo
      else if (propertyId && reportConfig) {
        const report = await googleAnalyticsService.getReport(userId, propertyId, reportConfig, userRole);
        return res.json(report);
      }
      else {
        return res.status(400).json({ error: 'Parâmetros inválidos: propertyId e reportConfig ou (startDate, endDate, dimensions, metrics) são obrigatórios' });
      }
    } catch (error) {
      console.error('Erro ao obter relatório do GA4:', error);
      
      // Verificar se é erro de permissão
      if (error.message && error.message.includes('não tem permissão')) {
        return res.status(403).json({ 
          error: 'permission_denied', 
          message: error.message 
        });
      }
      
      res.status(500).json({ error: 'Erro ao obter relatório do GA4' });
    }
  });

  // Desconectar Google Analytics
  router.post('/disconnect', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId; 
      const userRole = req.user.role;
      const result = await googleAnalyticsService.disconnect(userId, userRole);
      res.json(result);
    } catch (error) {
      console.error('Erro ao desconectar Google Analytics:', error);
      res.status(500).json({ error: 'Erro ao desconectar Google Analytics' });
    }
  });

  return router;
};
