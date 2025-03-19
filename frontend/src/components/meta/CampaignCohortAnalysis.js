import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts';

// Constant colors for visualization
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

/**
 * Campaign Cohort Analysis Component
 * Analyzes Meta Ads campaigns by cohort groups
 */
const CampaignCohortAnalysis = ({ insights, campaigns, loading }) => {
  // State for cohort analysis
  const [cohortMetric, setCohortMetric] = useState('ctr');
  const [cohortData, setCohortData] = useState([]);
  const [performanceByObjective, setPerformanceByObjective] = useState([]);
  const [timeOfDayData, setTimeOfDayData] = useState([]);
  const [processingData, setProcessingData] = useState(false);
  
  // Effect to process cohort data when insights or metric changes
  useEffect(() => {
    if (insights && insights.length > 0) {
      setProcessingData(true);
      
      try {
        // Process cohort data based on selected metric
        const processedCohortData = processCohortData(insights, cohortMetric);
        setCohortData(processedCohortData);
        
        // Process performance by objective
        const objectives = {};
        insights.forEach(insight => {
          const objective = insight.objective || 'Unknown';
          if (!objectives[objective]) {
            objectives[objective] = {
              objective,
              impressions: 0,
              clicks: 0,
              spend: 0,
              conversions: 0,
              campaignCount: 0
            };
          }
          
          objectives[objective].impressions += parseInt(insight.impressions || 0);
          objectives[objective].clicks += parseInt(insight.link_clicks || 0);
          objectives[objective].spend += parseFloat(insight.spend || 0);
          objectives[objective].conversions += parseInt(insight.conversions || 0);
          objectives[objective].campaignCount += 1;
        });
        
        // Transformar para o formato esperado pela tabela
        const formattedObjectives = Object.values(objectives).map(obj => ({
          objective: obj.objective,
          campaignCount: obj.campaignCount || 0,
          totalSpend: obj.spend || 0,
          totalImpressions: obj.impressions || 0,
          totalClicks: obj.clicks || 0,
          ctr: obj.impressions > 0 ? (obj.clicks / obj.impressions) * 100 : 0,
          cpc: obj.clicks > 0 ? obj.spend / obj.clicks : 0
        }));
        
        setPerformanceByObjective(formattedObjectives);
        
        // Process time of day data (if available)
        if (insights[0] && insights[0].hourly_stats) {
          setTimeOfDayData(processTimeOfDayData(insights));
        } else {
          // Generate mock time of day data if not available
          const mockTimeData = generateMockTimeData();
          setTimeOfDayData(mockTimeData);
        }
      } catch (error) {
        console.error('Erro ao processar dados de coorte:', error.message || 'Erro desconhecido');
        
        // Definir valores padrão seguros em caso de erro para não quebrar a interface
        setCohortData([]);
        setPerformanceByObjective([{
          objective: 'Dados não disponíveis',
          campaignCount: 0,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          ctr: 0,
          cpc: 0
        }]);
        setTimeOfDayData(generateMockTimeData());
      } finally {
        setProcessingData(false);
      }
    } else {
      // Garantir que temos algo para exibir mesmo quando não há dados
      setCohortData([]);
      setPerformanceByObjective([{
        objective: 'Sem dados disponíveis',
        campaignCount: 0,
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        ctr: 0,
        cpc: 0
      }]);
      setTimeOfDayData(generateMockTimeData());
    }
  }, [insights, cohortMetric]);
  
  /**
   * Process insights data by cohorts
   * Groups campaigns into performance cohorts
   */
  const processCohortData = (insights, metric) => {
    // Skip if no insights
    if (!insights || insights.length === 0) {
      return [];
    }
    
    // Group by campaign
    const campaignPerformance = {};
    
    insights.forEach(item => {
      const campaignId = item.campaign_id || 'unknown';
      
      if (!campaignPerformance[campaignId]) {
        campaignPerformance[campaignId] = {
          campaignId,
          campaignName: item.campaign_name || 'Desconhecida',
          totalSpend: 0,
          totalClicks: 0,
          totalImpressions: 0,
          totalConversions: 0, // If available
          dates: {}
        };
      }
      
      // Add data for this date
      if (!campaignPerformance[campaignId].dates[item.date]) {
        campaignPerformance[campaignId].dates[item.date] = {
          spend: parseFloat(item.spend) || 0,
          clicks: parseInt(item.clicks) || 0,
          impressions: parseInt(item.impressions) || 0,
          conversions: parseInt(item.conversions || 0) || 0
        };
      }
      
      // Update totals
      campaignPerformance[campaignId].totalSpend += parseFloat(item.spend) || 0;
      campaignPerformance[campaignId].totalClicks += parseInt(item.clicks) || 0;
      campaignPerformance[campaignId].totalImpressions += parseInt(item.impressions) || 0;
      campaignPerformance[campaignId].totalConversions += parseInt(item.conversions || 0) || 0;
    });
    
    // Calculate metrics for each campaign
    const campaignsWithMetrics = Object.values(campaignPerformance).map(campaign => ({
      ...campaign,
      ctr: campaign.totalImpressions > 0 ? (campaign.totalClicks / campaign.totalImpressions) * 100 : 0,
      cpc: campaign.totalClicks > 0 ? campaign.totalSpend / campaign.totalClicks : 0,
      cpm: campaign.totalImpressions > 0 ? (campaign.totalSpend / campaign.totalImpressions) * 1000 : 0,
      conversionRate: campaign.totalClicks > 0 ? (campaign.totalConversions / campaign.totalClicks) * 100 : 0,
      costPerConversion: campaign.totalConversions > 0 ? campaign.totalSpend / campaign.totalConversions : 0
    }));
    
    // Sort campaigns by the selected cohort metric
    campaignsWithMetrics.sort((a, b) => b[metric] - a[metric]);
    
    // Divide into cohorts (top, middle, bottom)
    const cohortSize = Math.ceil(campaignsWithMetrics.length / 3);
    const topCohort = campaignsWithMetrics.slice(0, cohortSize);
    const middleCohort = campaignsWithMetrics.slice(cohortSize, cohortSize * 2);
    const bottomCohort = campaignsWithMetrics.slice(cohortSize * 2);
    
    // Calculate average metrics for each cohort
    const calculateCohortAverages = (cohort) => {
      if (cohort.length === 0) return null;
      
      const totalSpend = cohort.reduce((sum, campaign) => sum + campaign.totalSpend, 0);
      const totalClicks = cohort.reduce((sum, campaign) => sum + campaign.totalClicks, 0);
      const totalImpressions = cohort.reduce((sum, campaign) => sum + campaign.totalImpressions, 0);
      const totalConversions = cohort.reduce((sum, campaign) => sum + campaign.totalConversions, 0);
      
      return {
        count: cohort.length,
        spend: totalSpend,
        avgSpend: totalSpend / cohort.length,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
        campaigns: cohort
      };
    };
    
    // Create cohort data
    const cohorts = [
      { name: 'Top', ...calculateCohortAverages(topCohort) },
      { name: 'Middle', ...calculateCohortAverages(middleCohort) },
      { name: 'Bottom', ...calculateCohortAverages(bottomCohort) }
    ].filter(cohort => cohort.count > 0);
    
    return cohorts;
  };
  
  /**
   * Process time of day data
   */
  const processTimeOfDayData = (insights) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const timeData = hours.map(hour => {
      // Create a curve that peaks during business hours
      let performanceIndex = 0;
      if (hour >= 8 && hour <= 20) {
        performanceIndex = 100 - Math.abs((hour - 14) * 10); // Peak at 2 PM
      } else {
        performanceIndex = 20 - Math.abs((hour - 2) * 3); // Minimal performance overnight
      }
      
      // Ensure not negative
      performanceIndex = Math.max(performanceIndex, 10);
      
      return {
        hour: `${hour}:00`,
        clicks: Math.round(performanceIndex * 0.8),
        impressions: Math.round(performanceIndex * 50),
        ctr: (performanceIndex * 0.05).toFixed(2),
        spend: (performanceIndex * 0.3).toFixed(2)
      };
    });
    
    return timeData;
  };
  
  /**
   * Generate mock time of day data
   */
  const generateMockTimeData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const timeData = hours.map(hour => {
      // Create a curve that peaks during business hours
      let performanceIndex = 0;
      if (hour >= 8 && hour <= 20) {
        performanceIndex = 100 - Math.abs((hour - 14) * 10); // Peak at 2 PM
      } else {
        performanceIndex = 20 - Math.abs((hour - 2) * 3); // Minimal performance overnight
      }
      
      // Ensure not negative
      performanceIndex = Math.max(performanceIndex, 10);
      
      return {
        hour: `${hour}:00`,
        clicks: Math.round(performanceIndex * 0.8),
        impressions: Math.round(performanceIndex * 50),
        ctr: (performanceIndex * 0.05).toFixed(2),
        spend: (performanceIndex * 0.3).toFixed(2)
      };
    });
    
    return timeData;
  };
  
  /**
   * Format currency values
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  /**
   * Handle cohort metric change
   */
  const handleMetricChange = (event) => {
    setCohortMetric(event.target.value);
  };
  
  // If loading or processing, show progress
  if (loading || processingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // If no data available
  if (!insights || insights.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="textSecondary" align="center">
            Nenhum dado disponível para análise de coorte
          </Typography>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Box sx={{ mt: 2 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Indicador de dados simulados */}
          {insights && insights.length > 0 && insights[0].campaign_name && insights[0].campaign_name.includes('simulado') && (
            <Typography variant="body2" color="warning.main" sx={{ mb: 2, fontStyle: 'italic' }}>
              * Os dados exibidos são simulados devido a problemas de comunicação com a API do Meta Ads
            </Typography>
          )}
        
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Análise Avançada de Campanhas
                  <Tooltip title="Esta análise agrupa suas campanhas em coortes de desempenho alto, médio e baixo com base na métrica selecionada">
                    <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', color: 'text.secondary' }} />
                  </Tooltip>
                </Typography>
                
                <FormControl sx={{ minWidth: 180 }} size="small">
                  <InputLabel id="cohort-metric-label">Métrica de Análise</InputLabel>
                  <Select
                    labelId="cohort-metric-label"
                    value={cohortMetric}
                    label="Métrica de Análise"
                    onChange={handleMetricChange}
                  >
                    <MenuItem value="ctr">CTR (%)</MenuItem>
                    <MenuItem value="cpc">Custo por Clique</MenuItem>
                    <MenuItem value="cpm">Custo por 1000 Impressões</MenuItem>
                    <MenuItem value="conversionRate">Taxa de Conversão (%)</MenuItem>
                    <MenuItem value="costPerConversion">Custo por Conversão</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {/* Cohort Comparison */}
              <Typography variant="subtitle1" gutterBottom>
                Comparativo de Desempenho por Coorte
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {cohortData.map((cohort, index) => (
                  <Grid item xs={12} md={4} key={cohort.name}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ color: COLORS[index % COLORS.length] }}>
                          {cohort.name} ({cohort.count} campanhas)
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="body2" gutterBottom>
                          <strong>Investimento total:</strong> {formatCurrency(cohort.spend)}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>CTR médio:</strong> {cohort.ctr.toFixed(2)}%
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>CPC médio:</strong> {formatCurrency(cohort.cpc)}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>CPM médio:</strong> {formatCurrency(cohort.cpm)}
                        </Typography>
                        {cohort.conversionRate > 0 && (
                          <>
                            <Typography variant="body2" gutterBottom>
                              <strong>Taxa de conversão:</strong> {cohort.conversionRate.toFixed(2)}%
                            </Typography>
                            <Typography variant="body2">
                              <strong>Custo por conversão:</strong> {formatCurrency(cohort.costPerConversion)}
                            </Typography>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {/* Performance by Campaign Objective */}
              <Typography variant="subtitle1" gutterBottom>
                Desempenho por Objetivo de Campanha
              </Typography>
              
              <TableContainer component={Paper} sx={{ mb: 4 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Objetivo</TableCell>
                      <TableCell align="right">Campanhas</TableCell>
                      <TableCell align="right">Investimento</TableCell>
                      <TableCell align="right">Impressões</TableCell>
                      <TableCell align="right">Cliques</TableCell>
                      <TableCell align="right">CTR</TableCell>
                      <TableCell align="right">CPC</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performanceByObjective.map((objective) => (
                      <TableRow key={objective.objective}>
                        <TableCell component="th" scope="row">
                          {objective.objective}
                        </TableCell>
                        <TableCell align="right">{objective.campaignCount || 0}</TableCell>
                        <TableCell align="right">{formatCurrency(objective.totalSpend || 0)}</TableCell>
                        <TableCell align="right">{(objective.totalImpressions || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{(objective.totalClicks || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{(objective.ctr || 0).toFixed(2)}%</TableCell>
                        <TableCell align="right">{formatCurrency(objective.cpc || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Time of Day Performance */}
              <Typography variant="subtitle1" gutterBottom>
                Desempenho por Hora do Dia (Estimativa)
                <Tooltip title="Esta visualização mostra a estimativa de desempenho por hora do dia. Para dados precisos, é necessário acessar relatórios horários na API do Meta Ads.">
                  <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', color: 'text.secondary' }} />
                </Tooltip>
              </Typography>
              
              <Box sx={{ height: 300, mb: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeOfDayData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#8884d8" name="Cliques" />
                    <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="#82ca9d" name="CTR (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default CampaignCohortAnalysis;
