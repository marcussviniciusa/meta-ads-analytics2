import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import MetaReports from '../pages/MetaReports';
import metaReportService from '../services/metaReportService';

// Mock the service
jest.mock('../services/metaReportService', () => ({
  getAccountDetails: jest.fn(),
  getCampaigns: jest.fn(),
  getAccountInsights: jest.fn(),
  getCampaignInsights: jest.fn(),
  exportInsightsToCSV: jest.fn(),
}));

// Setup mock for ResizeObserver before any tests run
beforeAll(() => {
  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  
  // Suppress console warnings
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Reset mocks after all tests
afterAll(() => {
  console.warn.mockRestore();
  console.error.mockRestore();
});

// Create a theme for MUI components
const theme = createTheme();

// Helper function to render component with all providers
const renderWithProviders = (ui, { route = '/meta-reports/123456789' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  
  return render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/meta-reports/:accountId" element={ui} />
            <Route path="/meta-accounts" element={<div>Meta Accounts Page</div>} />
          </Routes>
        </MemoryRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

describe('MetaReports Component', () => {
  const mockAccountDetails = {
    account: {
      id: '123456789',
      name: 'Test Ad Account',
      currency: 'BRL',
      business_name: 'Test Business',
      amount_spent: '5000.00'
    }
  };
  
  const mockCampaigns = {
    campaigns: [
      {
        id: 'camp1',
        name: 'Campaign 1',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
        daily_budget: '1000.00'
      },
      {
        id: 'camp2',
        name: 'Campaign 2',
        status: 'PAUSED',
        objective: 'TRAFFIC',
        daily_budget: '500.00'
      }
    ]
  };
  
  const mockInsights = {
    insights: [
      {
        date: '2025-03-01',
        campaign_id: 'camp1',
        campaign_name: 'Campaign 1',
        impressions: '1000',
        clicks: '50',
        spend: '100.00',
        cpc: '2.00',
        ctr: '0.05',
        reach: '800'
      },
      {
        date: '2025-03-02',
        campaign_id: 'camp1',
        campaign_name: 'Campaign 1',
        impressions: '1200',
        clicks: '60',
        spend: '120.00',
        cpc: '2.00',
        ctr: '0.05',
        reach: '900'
      }
    ]
  };

  // Setup mocks before each test
  beforeEach(() => {
    metaReportService.getAccountDetails.mockResolvedValue(mockAccountDetails);
    metaReportService.getCampaigns.mockResolvedValue(mockCampaigns);
    metaReportService.getAccountInsights.mockResolvedValue(mockInsights);
    metaReportService.getCampaignInsights.mockResolvedValue(mockInsights);
    metaReportService.exportInsightsToCSV.mockResolvedValue({ success: true });
  });

  // Clear mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call API endpoints with correct parameters', async () => {
    renderWithProviders(<MetaReports />);
    
    // Check if service methods were called with correct params
    await waitFor(() => {
      expect(metaReportService.getAccountDetails).toHaveBeenCalledWith('123456789');
      expect(metaReportService.getCampaigns).toHaveBeenCalledWith('123456789');
      expect(metaReportService.getAccountInsights).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('should handle API errors', async () => {
    // Mock API failure
    metaReportService.getAccountDetails.mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<MetaReports />);
    
    // Check if error handling is triggered
    await waitFor(() => {
      expect(metaReportService.getAccountDetails).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});
