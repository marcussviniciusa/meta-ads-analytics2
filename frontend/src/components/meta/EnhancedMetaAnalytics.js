import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Divider,
  Alert,
  Button,
  CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CampaignCohortAnalysis from './CampaignCohortAnalysis';
import AudienceInsights from './AudienceInsights';
import metaReportService from '../../services/metaReportService';

/**
 * Enhanced Meta Analytics Component
 * Provides comprehensive analytics for Meta Ads data
 */
const EnhancedMetaAnalytics = ({ accountId, dateRange, selectedCampaign }) => {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [audienceData, setAudienceData] = useState(null);
  
  // Fetch data when params change
  useEffect(() => {
    if (accountId && dateRange) {
      fetchData();
    }
  }, [accountId, dateRange, selectedCampaign]);
  
  /**
   * Fetch all required data
   */
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Format dates
      const startDateStr = dateRange.startDate ? 
        dateRange.startDate instanceof Date ? 
          dateRange.startDate.toISOString().split('T')[0] : 
          dateRange.startDate : 
        null;
      
      const endDateStr = dateRange.endDate ? 
        dateRange.endDate instanceof Date ? 
          dateRange.endDate.toISOString().split('T')[0] : 
          dateRange.endDate : 
        null;
      
      if (!startDateStr || !endDateStr) {
        throw new Error('Período de datas inválido');
      }
      
      // Fetch campaigns if not already loaded
      if (campaigns.length === 0) {
        const campaignsResponse = await metaReportService.getCampaigns(accountId);
        setCampaigns(campaignsResponse.campaigns || []);
      }
      
      // Fetch insights with the campaign filter if specified
      const campaignId = selectedCampaign !== 'all' ? selectedCampaign : null;
      const insightsResponse = await metaReportService.getAccountInsights(
        accountId,
        startDateStr,
        endDateStr,
        campaignId
      );
      
      // Simulated audience data - this would be a real API call in production
      // Note: Meta Ads API requires specific permissions for demographic data
      // In a real implementation, you would fetch this data from your backend
      setTimeout(() => {
        setAudienceData(insightsResponse.insights || []);
      }, 500);
      
      setInsights(insightsResponse.insights || []);
    } catch (err) {
      console.error('Error fetching Meta Ads enhanced analytics:', err);
      setError(err.message || 'Erro ao carregar dados de análise avançada');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle tab change
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  /**
   * Refresh data
   */
  const handleRefresh = () => {
    fetchData();
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Tentar novamente
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }
  
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Análise Avançada do Meta Ads
          </Typography>
          
          <Button 
            startIcon={<RefreshIcon />} 
            size="small" 
            onClick={handleRefresh}
            disabled={loading}
          >
            Atualizar
          </Button>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab label="Análise de Coortes" />
          <Tab label="Insights de Audiência" />
        </Tabs>
        
        {activeTab === 0 && (
          <CampaignCohortAnalysis 
            insights={insights} 
            campaigns={campaigns}
            loading={loading} 
          />
        )}
        
        {activeTab === 1 && (
          <AudienceInsights 
            insights={audienceData || insights} 
            loading={loading} 
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedMetaAnalytics;
