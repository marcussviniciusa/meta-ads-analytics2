import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography, 
  Button,
  Tabs,
  Tab,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  Collapse
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CampaignCohortAnalysis from './CampaignCohortAnalysis';
import AudienceInsights from './AudienceInsights';
import metaReportService from '../../services/metaReportService';
import MetaApiDiagnosticTool from './MetaApiDiagnosticTool';

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
  const [showDiagnosticTool, setShowDiagnosticTool] = useState(false);
  
  // Fetch data when params change
  useEffect(() => {
    if (accountId && dateRange) {
      console.log('EnhancedMetaAnalytics - Iniciando análise para conta:', accountId);
      fetchData();
    } else {
      console.warn('EnhancedMetaAnalytics - Parâmetros ausentes:', { 
        temAccountId: !!accountId, 
        temDateRange: !!dateRange 
      });
      setError('Parâmetros insuficientes para carregamento dos dados');
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
      const startDateStr = dateRange?.startDate ? 
        dateRange.startDate instanceof Date ? 
          dateRange.startDate.toISOString().split('T')[0] : 
          dateRange.startDate : 
        null;
      
      const endDateStr = dateRange?.endDate ? 
        dateRange.endDate instanceof Date ? 
          dateRange.endDate.toISOString().split('T')[0] : 
          dateRange.endDate : 
        null;
      
      console.log('EnhancedMetaAnalytics - Período:', startDateStr, 'até', endDateStr);
      
      if (!startDateStr || !endDateStr) {
        throw new Error('Período de datas inválido');
      }
      
      // Fetch campaigns if not already loaded
      if (campaigns.length === 0) {
        console.log('EnhancedMetaAnalytics - Buscando campanhas da conta:', accountId);
        try {
          const campaignsResponse = await metaReportService.getCampaigns(accountId);
          const campaignsCount = campaignsResponse.campaigns?.length || 0;
          
          setCampaigns(campaignsResponse.campaigns || []);
          console.log(`EnhancedMetaAnalytics - ${campaignsCount} campanhas carregadas`);
        } catch (campaignError) {
          console.error('Erro ao carregar campanhas:', campaignError.message || 'Erro desconhecido');
          setError('Não foi possível carregar dados de campanhas: ' + campaignError.message);
          setLoading(false);
          return; // Interrompe a execução se não conseguir obter campanhas
        }
      }
      
      // Fetch insights with the campaign filter if specified
      const campaignId = selectedCampaign && selectedCampaign !== 'all' ? selectedCampaign : null;
      console.log('EnhancedMetaAnalytics - Buscando insights', campaignId ? `para campanha: ${campaignId}` : 'para todas as campanhas');
      
      try {
        const insightsResponse = await metaReportService.getAccountInsights(
          accountId,
          startDateStr,
          endDateStr,
          campaignId
        );
        
        // Log only the structure of the response, not the entire data
        console.log('EnhancedMetaAnalytics - Estrutura de resposta de insights:', 
          insightsResponse ? 
            `${Object.keys(insightsResponse).join(', ')}` : 
            'Resposta vazia');
        
        // Verify that insights data is valid
        if (insightsResponse && Array.isArray(insightsResponse.insights)) {
          setInsights(insightsResponse.insights);
          
          // Handle audience data
          if (insightsResponse.audience_data) {
            setAudienceData(insightsResponse.audience_data);
          } else {
            // Set audience data equal to insights if specific audience data not available
            setTimeout(() => {
              setAudienceData(insightsResponse.insights);
            }, 500);
          }
        } else if (insightsResponse && typeof insightsResponse === 'object') {
          // Handle case where API returns data in a different structure
          const extractedInsights = extractInsightsFromResponse(insightsResponse);
          setInsights(extractedInsights);
          
          // Set identical audience data
          setTimeout(() => {
            setAudienceData(extractedInsights);
          }, 500);
        } else {
          throw new Error('Formato de dados inválido recebido da API');
        }
      } catch (err) {
        console.error('Erro na análise Meta Ads:', err.message || 'Erro desconhecido');
        setError(err.message || 'Erro ao carregar dados de análise avançada');
      } finally {
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro na análise Meta Ads:', err.message || 'Erro desconhecido');
      setError(err.message || 'Erro ao carregar dados de análise avançada');
      setLoading(false);
    }
  };
  
  /**
   * Extract insights from different response structures
   */
  const extractInsightsFromResponse = (response) => {
    // Try to find insights array in the response object
    if (response.data) {
      return Array.isArray(response.data) ? response.data : [response.data];
    }
    
    if (response.results) {
      return Array.isArray(response.results) ? response.results : [response.results]; 
    }
    
    // Convert response object to array if it doesn't have expected structure
    if (Object.keys(response).length > 0) {
      // Create artificial insights array from object properties
      return [
        {
          ...response,
          campaign_name: 'Overall Account',
          date_start: dateRange?.startDate,
          date_stop: dateRange?.endDate
        }
      ];
    }
    
    return [];
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
  
  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          {error}
        </Alert>
      )}
      
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
    </Box>
  );
};

export default EnhancedMetaAnalytics;
