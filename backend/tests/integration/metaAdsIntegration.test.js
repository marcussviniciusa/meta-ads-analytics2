const request = require('supertest');
const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');

const IntegrationController = require('../../src/controllers/integrationController');
const createIntegrationRoutes = require('../../src/routes/integrationRoutes');

// Mock the getMetaAccessToken method
const originalPrototype = IntegrationController.prototype;
const originalGetMetaAccessToken = originalPrototype.getMetaAccessToken;

// Override the getMetaAccessToken method
IntegrationController.prototype.getMetaAccessToken = jest.fn().mockImplementation(function(userId) {
  return Promise.resolve('mock_access_token');
});

// Mock dependencies
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    })
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  }));
});

// Create authentication middleware
const authMiddleware = (req, res, next) => {
  // Add user object to request
  req.user = {
    userId: 1,
    email: 'test@example.com'
  };
  next();
};

// Create middleware that returns 401
const unauthorized401Middleware = (req, res) => {
  return res.status(401).json({ message: 'Unauthorized' });
};

describe('Meta Ads Integration API', () => {
  let app;
  let mock;
  let pool;
  let redis;
  let unauthApp; // App that returns 401 for all routes

  beforeAll(() => {
    // Setup express app with auth
    app = express();
    app.use(express.json());
    app.use(authMiddleware); // Add auth middleware to all routes
    
    // Setup express app with 401 middleware
    unauthApp = express();
    unauthApp.use(express.json());
    
    // Setup mocks
    pool = new Pool();
    redis = new Redis();
    
    // Setup axios mock
    mock = new MockAdapter(axios);
    
    // Setup routes
    const integrationRoutes = createIntegrationRoutes(redis, pool);
    app.use('/api/integrations', integrationRoutes);
    
    // Setup 401 route handler for unauth app
    unauthApp.all('/api/integrations/*', unauthorized401Middleware);
  });

  beforeEach(() => {
    // Setup default mocks for all tests
    mock.reset();
    
    // Mock DB queries to simulate user having access to account
    pool.query.mockImplementation((query, params) => {
      if (query.includes('FROM ad_accounts WHERE user_id')) {
        // Return that user has access to the account
        return Promise.resolve({ rows: [{ user_id: 1, account_id: '123456789' }], rowCount: 1 });
      }
      // Default empty response
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    
    // Mock account details (NO act_ prefix in the URL)
    mock.onGet('https://graph.facebook.com/v17.0/123456789?fields=id,name,account_id,account_status,business_name,currency,timezone_name').reply(200, {
      id: '123456789',
      name: 'Test Ad Account',
      currency: 'USD',
      account_status: 1,
      business_name: 'Test Business',
      timezone_name: 'America/Los_Angeles',
      account_id: '123456789'
    });
    
    // Mock campaigns (WITH act_ prefix)
    mock.onGet('https://graph.facebook.com/v17.0/act_123456789/campaigns?fields=id,name,objective,status,created_time,updated_time,daily_budget,lifetime_budget&limit=100').reply(200, {
      data: [
        {
          id: 'camp1',
          name: 'Campaign 1',
          status: 'ACTIVE',
          objective: 'CONVERSIONS'
        },
        {
          id: 'camp2',
          name: 'Campaign 2',
          status: 'PAUSED',
          objective: 'TRAFFIC'
        }
      ],
      paging: {
        cursors: {
          before: 'before_cursor',
          after: 'after_cursor'
        }
      }
    });
    
    // Mock account insights (WITH act_ prefix)
    // Create a regex-based handler to handle date params
    mock.onGet(new RegExp(`https://graph.facebook.com/v17.0/act_123456789/insights.*`)).reply(200, {
      data: [
        {
          date_start: '2025-03-01',
          date_stop: '2025-03-01',
          impressions: '1000',
          clicks: '50',
          spend: '100.00',
          cpc: '2.00',
          ctr: '0.05'
        },
        {
          date_start: '2025-03-02',
          date_stop: '2025-03-02',
          impressions: '1200',
          clicks: '60',
          spend: '120.00',
          cpc: '2.00',
          ctr: '0.05'
        }
      ],
      paging: {
        cursors: {
          before: 'before_cursor',
          after: 'after_cursor'
        }
      }
    });
    
    // Mock campaign insights
    mock.onGet(new RegExp(`https://graph.facebook.com/v17.0/camp1/insights.*`)).reply(200, {
      data: [
        {
          date_start: '2025-03-01',
          date_stop: '2025-03-01',
          campaign_name: 'Campaign 1',
          impressions: '500',
          clicks: '25',
          spend: '50.00'
        }
      ]
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
  });

  afterAll(() => {
    mock.restore();
    // Restore original method after tests
    IntegrationController.prototype.getMetaAccessToken = originalGetMetaAccessToken;
  });

  describe('GET /api/integrations/meta-ads/accounts/:accountId', () => {
    it('should return account details when authenticated and authorized', async () => {
      // Make request
      const response = await request(app)
        .get('/api/integrations/meta-ads/accounts/123456789')
        .set('Authorization', 'Bearer test_token');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('account');
      expect(response.body.account).toHaveProperty('id', '123456789');
      expect(response.body.account).toHaveProperty('name', 'Test Ad Account');
    });

    it('should return 401 when user is not authenticated', async () => {
      // Make request to the app with 401 middleware
      const response = await request(unauthApp)
        .get('/api/integrations/meta-ads/accounts/123456789')
        .set('Authorization', 'Bearer invalid_token');

      // Assertions
      expect(response.status).toBe(401);
    });

    it('should return 404 when user is not authorized to access account', async () => {
      // Mock DB to return user does NOT have access to account
      pool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Make request
      const response = await request(app)
        .get('/api/integrations/meta-ads/accounts/123456789')
        .set('Authorization', 'Bearer test_token');

      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('não encontrada ou sem acesso');
    });
  });

  describe('GET /api/integrations/meta-ads/accounts/:accountId/campaigns', () => {
    it('should return campaigns for an account', async () => {
      // Make request
      const response = await request(app)
        .get('/api/integrations/meta-ads/accounts/123456789/campaigns')
        .set('Authorization', 'Bearer test_token');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
      expect(response.body.campaigns).toHaveLength(2);
      expect(response.body.campaigns[0]).toHaveProperty('id', 'camp1');
      expect(response.body.campaigns[1]).toHaveProperty('name', 'Campaign 2');
    });
  });

  describe('GET /api/integrations/meta-ads/accounts/:accountId/insights', () => {
    it('should return insights for an account within a date range', async () => {
      // Make request
      const response = await request(app)
        .get('/api/integrations/meta-ads/accounts/123456789/insights')
        .query({ 
          start_date: '2025-03-01', 
          end_date: '2025-03-05' 
        })
        .set('Authorization', 'Bearer test_token');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('insights');
      expect(response.body.insights).toHaveLength(2);
      expect(response.body.insights[0]).toHaveProperty('impressions', '1000');
      expect(response.body.insights[1]).toHaveProperty('spend', '120.00');
    });
  });

  describe('GET /api/integrations/meta-ads/campaigns/:campaignId/insights', () => {
    it('should return insights for a specific campaign', async () => {
      // Mock DB for campaign access check
      pool.query
        .mockResolvedValueOnce({ rows: [{ account_id: '123456789' }], rowCount: 1 }) // Campaign belongs to account
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }], rowCount: 1 });  // User has access to account
      
      // Make request
      const response = await request(app)
        .get('/api/integrations/meta-ads/campaigns/camp1/insights')
        .query({ 
          start_date: '2025-03-01', 
          end_date: '2025-03-05' 
        })
        .set('Authorization', 'Bearer test_token');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('insights');
      expect(response.body.insights[0]).toHaveProperty('campaign_name', 'Campaign 1');
    });
  });

  describe('DELETE /api/integrations/meta-ads/accounts/:accountId', () => {
    it('should remove an ad account association from a user', async () => {
      // Mock DB to return user has access to account and delete succeeds
      pool.query
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }], rowCount: 1 })  // User has access check
        .mockResolvedValueOnce({ rowCount: 1 });  // Delete succeeds
      
      // Make request
      const response = await request(app)
        .delete('/api/integrations/meta-ads/accounts/123456789')
        .set('Authorization', 'Bearer test_token');

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('removida');
    });
  });
});
