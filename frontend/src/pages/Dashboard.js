import React, { useState, useEffect } from 'react';
import { 
  Container, Grid, Paper, Typography, Box, CircularProgress,
  Button, Card, CardContent, Divider, TextField, MenuItem,
  Alert, Tab, Tabs, Link
} from '@mui/material';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Chart as ChartJS, 
  CategoryScale, LinearScale, 
  PointElement, LineElement, 
  BarElement, Title, 
  Tooltip, Legend, ArcElement 
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import adAccountService from '../services/adAccountService';
import googleAnalyticsService from '../services/googleAnalyticsService';
import { useAuth } from '../context/AuthContext';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale, LinearScale, 
  PointElement, LineElement, 
  BarElement, Title, 
  Tooltip, Legend, ArcElement
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [overviewData, setOverviewData] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAuth();
  
  // Google Analytics states
  const [gaConnected, setGaConnected] = useState(false);
  const [gaProperties, setGaProperties] = useState([]);
  const [selectedGaProperty, setSelectedGaProperty] = useState('');
  const [gaData, setGaData] = useState(null);
  const [loadingGa, setLoadingGa] = useState(false);
  const [gaError, setGaError] = useState('');
  
  // Funnel e insights detalhados
  const [funnelData, setFunnelData] = useState(null);
  
  // Estado para controlar as abas de insights (Meta Ads, Google Analytics, Funil)
  const [insightTab, setInsightTab] = useState(0);
  const [loadingFunnel, setLoadingFunnel] = useState(false);
  const [funnelError, setFunnelError] = useState('');

  // Carregar contas de anúncios ao montar o componente
  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        const accounts = await adAccountService.getAdAccounts();
        setAdAccounts(accounts);
        
        if (accounts.length > 0) {
          setSelectedAccount(accounts[0].id);
        }
      } catch (err) {
        console.error('Error fetching ad accounts:', err);
        
        // Verificar se é um erro de integração não configurada
        if (err.response && err.response.data && err.response.data.error === 'integration_required') {
          setError(
            <Box>
              <Typography variant="body1" gutterBottom>
                Integração com Meta Ads não configurada ou expirada.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                component={Link} 
                to="/connect-meta"
                size="small"
                sx={{ mt: 1 }}
              >
                Conectar Meta Ads
              </Button>
            </Box>
          );
        } else {
          setError('Não foi possível carregar as contas de anúncios. Verifique sua conexão com o Meta Ads.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdAccounts();
    
    // Verificar conexão com Google Analytics
    checkGoogleAnalyticsConnection();
  }, []);
  
  // Verificar conexão com Google Analytics e carregar propriedades se conectado
  const checkGoogleAnalyticsConnection = async () => {
    try {
      setLoadingGa(true);
      const status = await googleAnalyticsService.checkConnectionStatus();
      setGaConnected(status.connected);
      
      if (status.connected) {
        await fetchGoogleAnalyticsProperties();
      }
    } catch (err) {
      console.error('Erro ao verificar conexão com Google Analytics:', err);
      setGaError('Não foi possível verificar a conexão com o Google Analytics');
    } finally {
      setLoadingGa(false);
    }
  };
  
  // Buscar propriedades do Google Analytics
  const fetchGoogleAnalyticsProperties = async () => {
    try {
      const properties = await googleAnalyticsService.getProperties();
      setGaProperties(properties);
      
      if (properties.length > 0) {
        setSelectedGaProperty(properties[0].property_id);
      }
    } catch (err) {
      console.error('Erro ao carregar propriedades do Google Analytics:', err);
      setGaError('Não foi possível carregar as propriedades do Google Analytics');
    }
  };

  // Carregar dados de visão geral quando a conta ou datas mudarem
  useEffect(() => {
    if (selectedAccount) {
      fetchOverviewData();
    }
  }, [selectedAccount, startDate, endDate]);
  
  // Carregar dados do Google Analytics quando a propriedade ou datas mudarem
  useEffect(() => {
    if (gaConnected && selectedGaProperty) {
      fetchGoogleAnalyticsData();
    }
  }, [selectedGaProperty, startDate, endDate]);

  // Buscar dados de visão geral
  const fetchOverviewData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Usar diretamente o adAccountService para obter dados reais do Meta Ads
      const data = await adAccountService.getAccountOverview(
        selectedAccount,
        formattedStartDate,
        formattedEndDate
      );
      
      // Registra os dados reais obtidos no console para verificação
      console.log('Dados reais obtidos do Meta Ads:', data);
      
      // Atualiza o estado com os dados reais
      setOverviewData(data);
    } catch (err) {
      setError('Não foi possível carregar os dados da conta. Tente novamente mais tarde.');
      console.error('Error fetching overview data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar dados do Google Analytics
  const fetchGoogleAnalyticsData = async () => {
    setLoadingGa(true);
    setGaError('');
    
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const data = await googleAnalyticsService.getDashboardReport(
        selectedGaProperty,
        formattedStartDate,
        formattedEndDate
      );
      
      console.log('Dados do Google Analytics obtidos:', data);
      setGaData(data);
      
      // Também carregar dados detalhados do funil
      fetchFunnelData(formattedStartDate, formattedEndDate);
    } catch (err) {
      setGaError('Não foi possível carregar os dados do Google Analytics.');
      console.error('Erro ao buscar dados do Google Analytics:', err);
    } finally {
      setLoadingGa(false);
    }
  };
  
  // Buscar dados detalhados do funil
  const fetchFunnelData = async (startDateStr, endDateStr) => {
    if (!selectedGaProperty) return;
    
    setLoadingFunnel(true);
    setFunnelError('');
    
    try {
      // Usar as datas já formatadas ou formatá-las se não fornecidas
      const formattedStartDate = startDateStr || format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = endDateStr || format(endDate, 'yyyy-MM-dd');
      
      const data = await googleAnalyticsService.getDetailedInsights(
        selectedGaProperty,
        formattedStartDate,
        formattedEndDate
      );
      
      console.log('Dados detalhados do funil obtidos:', data);
      setFunnelData(data);
    } catch (err) {
      setFunnelError('Não foi possível carregar os dados detalhados do funil.');
      console.error('Erro ao buscar dados do funil:', err);
    } finally {
      setLoadingFunnel(false);
    }
  };

  // Criar dados para o gráfico de gastos diários
  const createDailySpendChartData = () => {
    if (!overviewData || !overviewData.performanceByDay) {
      return null;
    }
    
    const labels = overviewData.performanceByDay.map(day => format(new Date(day.date), 'dd/MM'));
    const spendData = overviewData.performanceByDay.map(day => day.spend);
    
    return {
      labels,
      datasets: [
        {
          label: 'Gastos Diários (R$)',
          data: spendData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          tension: 0.2,
        }
      ]
    };
  };

  // Criar dados para o gráfico de impressões e cliques
  const createPerformanceChartData = () => {
    if (!overviewData || !overviewData.performanceByDay) {
      return null;
    }
    
    const labels = overviewData.performanceByDay.map(day => format(new Date(day.date), 'dd/MM'));
    const impressionsData = overviewData.performanceByDay.map(day => day.impressions);
    const clicksData = overviewData.performanceByDay.map(day => day.clicks);
    
    return {
      labels,
      datasets: [
        {
          label: 'Impressões',
          data: impressionsData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Cliques',
          data: clicksData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y1',
        }
      ]
    };
  };

  // Criar dados para o gráfico de distribuição de gastos
  const createSpendDistributionChartData = () => {
    if (!overviewData || !overviewData.campaigns || overviewData.campaigns.length === 0) {
      return null;
    }
    
    // Pegar as 5 principais campanhas por gasto
    const topCampaigns = [...overviewData.campaigns]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);
    
    // Calcular outros gastos
    const otherSpend = overviewData.campaigns.length > 5 
      ? overviewData.totalSpend - topCampaigns.reduce((sum, camp) => sum + camp.totalSpend, 0)
      : 0;
    
    const labels = [...topCampaigns.map(camp => camp.name), otherSpend > 0 ? 'Outros' : null].filter(Boolean);
    const data = [...topCampaigns.map(camp => camp.totalSpend), otherSpend > 0 ? otherSpend : null].filter(Boolean);
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  // Criar dados para o gráfico de usuários ativos do Google Analytics
  const createGaUsersChartData = () => {
    if (!gaData || !gaData.rows) {
      return null;
    }
    
    // Extrair datas e valores das métricas
    const rows = gaData.rows || [];
    const dimensionHeaders = gaData.dimensionHeaders || [];
    const metricHeaders = gaData.metricHeaders || [];
    
    // Encontrar índices das métricas
    const dateIndex = dimensionHeaders.findIndex(h => h.name === 'date');
    const usersIndex = metricHeaders.findIndex(h => h.name === 'activeUsers');
    const sessionsIndex = metricHeaders.findIndex(h => h.name === 'sessions');
    const pageViewsIndex = metricHeaders.findIndex(h => h.name === 'screenPageViews');
    
    if (dateIndex === -1 || usersIndex === -1 || sessionsIndex === -1 || pageViewsIndex === -1) {
      console.error('Métricas ou dimensões necessárias não encontradas nos dados do GA');
      return null;
    }
    
    // Formatar datas e extrair valores
    const labels = rows.map(row => {
      const dateString = row.dimensionValues[dateIndex].value;
      // Converter formato YYYYMMDD para DD/MM
      return `${dateString.substring(6, 8)}/${dateString.substring(4, 6)}`;
    });
    
    const usersData = rows.map(row => parseInt(row.metricValues[usersIndex].value));
    const sessionsData = rows.map(row => parseInt(row.metricValues[sessionsIndex].value));
    const pageViewsData = rows.map(row => parseInt(row.metricValues[pageViewsIndex].value));
    
    return {
      labels,
      datasets: [
        {
          label: 'Usuários Ativos',
          data: usersData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Sessões',
          data: sessionsData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          yAxisID: 'y',
        },
        {
          label: 'Visualizações de Página',
          data: pageViewsData,
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
          yAxisID: 'y1',
        }
      ]
    };
  };

  // Formatar valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar número com separador de milhares
  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Formatar tempo em segundos para minutos e segundos
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0s';
    
    // Converter para número
    seconds = Number(seconds);
    
    // Se for menos de 60 segundos
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    
    // Se for mais de 60 segundos, mostrar em minutos e segundos
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s` 
      : `${minutes}m`;
  };

  // Manipulador de mudança de tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Renderizar KPIs
  const renderKPIs = () => {
    if (!overviewData) return null;
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Gasto Total
              </Typography>
              <Typography variant="h4" component="div">
                {formatCurrency(overviewData.totalSpend)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Impressões
              </Typography>
              <Typography variant="h4" component="div">
                {formatNumber(overviewData.totalImpressions)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cliques
              </Typography>
              <Typography variant="h4" component="div">
                {formatNumber(overviewData.totalClicks)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                CTR Médio
              </Typography>
              <Typography variant="h4" component="div">
                {overviewData.avgCTR.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Renderizar filtros
  const renderFilters = () => {
    return (
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Conta de Anúncios"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              fullWidth
              variant="outlined"
              disabled={loading || adAccounts.length === 0}
            >
              {adAccounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          
          {gaConnected && gaProperties.length > 0 && (
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Propriedade Google Analytics"
                value={selectedGaProperty}
                onChange={(e) => setSelectedGaProperty(e.target.value)}
                fullWidth
                variant="outlined"
                disabled={loadingGa}
              >
                {gaProperties.map((property) => (
                  <MenuItem key={property.property_id} value={property.property_id}>
                    {property.property_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          
          <Grid item xs={12} md={gaConnected ? 2 : 3}>
            <DatePicker
              selected={startDate}
              onChange={date => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              maxDate={endDate}
              locale={ptBR}
              dateFormat="dd/MM/yyyy"
              customInput={
                <TextField 
                  label="Data Inicial" 
                  fullWidth 
                  variant="outlined"
                  disabled={loading}
                />
              }
            />
          </Grid>
          
          <Grid item xs={12} md={gaConnected ? 2 : 3}>
            <DatePicker
              selected={endDate}
              onChange={date => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              maxDate={new Date()}
              locale={ptBR}
              dateFormat="dd/MM/yyyy"
              customInput={
                <TextField 
                  label="Data Final" 
                  fullWidth 
                  variant="outlined"
                  disabled={loading}
                />
              }
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                fetchOverviewData();
                if (gaConnected && selectedGaProperty) {
                  fetchGoogleAnalyticsData();
                }
              }}
              disabled={loading || !selectedAccount}
            >
              {loading || loadingGa ? <CircularProgress size={24} /> : 'Atualizar'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Renderizar seção do Google Analytics
  const renderGoogleAnalyticsSection = () => {
    if (!gaConnected) {
      return (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Google Analytics
          </Typography>
          <Typography paragraph>
            Conecte sua conta do Google Analytics para visualizar dados integrados.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            href="/google-analytics"
          >
            Conectar Google Analytics
          </Button>
        </Paper>
      );
    }
    
    if (loadingGa) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (gaError) {
      return (
        <Alert severity="error" sx={{ mb: 3 }}>
          {gaError}
        </Alert>
      );
    }
    
    if (!gaData || !gaData.rows || gaData.rows.length === 0) {
      return (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Google Analytics
          </Typography>
          <Typography paragraph>
            Não há dados disponíveis para o período selecionado.
          </Typography>
        </Paper>
      );
    }
    
    // Calcular totais
    const metricHeaders = gaData.metricHeaders || [];
    const rows = gaData.rows || [];
    
    const usersIndex = metricHeaders.findIndex(h => h.name === 'activeUsers');
    const sessionsIndex = metricHeaders.findIndex(h => h.name === 'sessions');
    const pageViewsIndex = metricHeaders.findIndex(h => h.name === 'screenPageViews');
    
    let totalUsers = 0;
    let totalSessions = 0;
    let totalPageViews = 0;
    
    if (usersIndex !== -1 && sessionsIndex !== -1 && pageViewsIndex !== -1) {
      totalUsers = rows.reduce((sum, row) => sum + parseInt(row.metricValues[usersIndex].value), 0);
      totalSessions = rows.reduce((sum, row) => sum + parseInt(row.metricValues[sessionsIndex].value), 0);
      totalPageViews = rows.reduce((sum, row) => sum + parseInt(row.metricValues[pageViewsIndex].value), 0);
    }
    
    return (
      <>
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Dados do Google Analytics
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Usuários Ativos
                </Typography>
                <Typography variant="h4" component="div">
                  {formatNumber(totalUsers)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Sessões
                </Typography>
                <Typography variant="h4" component="div">
                  {formatNumber(totalSessions)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={2}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Visualizações de Página
                </Typography>
                <Typography variant="h4" component="div">
                  {formatNumber(totalPageViews)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Atividade de Usuários
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {createGaUsersChartData() && (
            <Line 
              data={createGaUsersChartData()} 
              options={{
                responsive: true,
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                }
              }}
            />
          )}
        </Paper>
      </>
    );
  };

  // Renderizar seção de insights detalhados
  const renderDetailedInsights = () => {
    if (!overviewData || !funnelData) return null;
    
    // Handler para mudança de abas de insights
    const handleInsightTabChange = (event, newValue) => {
      setInsightTab(newValue);
    };
    
    return (
      <>
        
        <Typography variant="h5" gutterBottom sx={{ mt: 5, mb: 2 }}>
          Insights Detalhados do Funil
        </Typography>
        
        {/* Abas para separar Meta Ads e Google Analytics */}
        <Tabs 
          value={insightTab} 
          onChange={handleInsightTabChange} 
          sx={{ mb: 3 }}
          TabIndicatorProps={{
            style: {
              backgroundColor: insightTab === 0 ? '#1877F2' : '#E37400'
            }
          }}
        >
          <Tab 
            label="Meta Ads" 
            icon={<img src="/images/meta-logo.svg" alt="Meta" width="20" height="20" />} 
            iconPosition="start"
            sx={{ 
              fontWeight: 'bold',
              color: insightTab === 0 ? '#1877F2' : 'inherit',
              '&.Mui-selected': { color: '#1877F2' }
            }} 
          />
          <Tab 
            label="Google Analytics" 
            icon={<img src="/images/ga-logo.svg" alt="Google Analytics" width="20" height="20" />} 
            iconPosition="start" 
            sx={{ 
              fontWeight: 'bold',
              color: insightTab === 1 ? '#E37400' : 'inherit',
              '&.Mui-selected': { color: '#E37400' }
            }}
          />
          <Tab 
            label="Funil de Conversão" 
            icon={<img src="/images/funnel-icon.svg" alt="Funil" width="20" height="20" />} 
            iconPosition="start"
            sx={{ 
              fontWeight: 'bold' 
            }}
          />
        </Tabs>
        
        {/* MÉTRICAS META ADS */}
        {insightTab === 0 && (
          <Paper sx={{ p: 3, mb: 4, borderTop: '4px solid #1877F2' }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <img src="/images/meta-logo.svg" alt="Meta" width="30" height="30" style={{ marginRight: '10px' }} />
                  <Typography variant="h6" gutterBottom sx={{ color: '#1877F2', fontWeight: 'bold', mb: 0 }}>
                    Meta Ads - Indicadores de Desempenho
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
              </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Impressões
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.metaAdsMetrics?.impressoes || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Alcance
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.metaAdsMetrics?.alcance || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total de Cliques
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.metaAdsMetrics?.cliquesTodos || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Cliques no Link
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.metaAdsMetrics?.cliquesLink || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    CTR (Taxa de Cliques)
                  </Typography>
                  <Typography variant="h5" component="div">
                    {(funnelData?.metaAdsMetrics?.ctr || 0).toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Reações no Post
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.metaAdsMetrics?.reacoesPost || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                Métricas de Vídeo e Conversão
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    ThruPlays
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.metaAdsMetrics?.thruPlays || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Visualizações de Página de Destino
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.metaAdsMetrics?.visualizacoesPaginaDestino || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Conversões
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.metaAdsMetrics?.conversoes || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Taxa de Conversão
                  </Typography>
                  <Typography variant="h5" component="div">
                    {(funnelData?.metaAdsMetrics?.taxaConversao || 0).toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Leads
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.metaAdsMetrics?.leads || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                Métricas de Custo
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    CPC (Custo por Clique)
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(funnelData?.metaAdsMetrics?.cpc || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    CPM (Custo por Mil Impressões)
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(funnelData?.metaAdsMetrics?.cpm || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Custo por Resultado
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(funnelData?.metaAdsMetrics?.custoPorResultado || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Custo por Visualização de Vídeo
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(funnelData?.metaAdsMetrics?.custoPorVisualizacaoVideo || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Custo por Conversão
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(funnelData?.metaAdsMetrics?.custoPorConversao || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
        
        )}

        {/* MÉTRICAS GOOGLE ANALYTICS */}
        {insightTab === 1 && (
          <Paper sx={{ p: 3, mb: 4, borderTop: '4px solid #E37400' }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <img src="/images/ga-logo.svg" alt="Google Analytics" width="30" height="30" style={{ marginRight: '10px' }} />
                  <Typography variant="h6" gutterBottom sx={{ color: '#E37400', fontWeight: 'bold', mb: 0 }}>
                    Google Analytics - Métricas Essenciais
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
              </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Usuários
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.usuarios || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Novos Usuários
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.novosUsuarios || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Usuários Ativos
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.usuariosAtivos || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tempo Médio de Engajamento
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatTime(funnelData?.gaMetrics?.tempoMedioEngajamento || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Visualizações de Página
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.visualizacoesPagina || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Contagem de Eventos
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.contagemEventos || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                Eventos e Conversões
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Cliques
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.eventosEspecificos?.click || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Preenchimento de Formulários
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.eventosEspecificos?.form_submit || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Adição ao Carrinho
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.adicaoCarrinho || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Início de Checkout
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.inicioCheckout || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Compras Completadas
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.comprasCompletadas || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                Canais de Origem
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Orgânico
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.canaisOrigem?.organico || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Social
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.canaisOrigem?.social || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    CPC (Pago)
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.gaMetrics?.canaisOrigem?.cpc || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
        
        )}

        {/* MÉTRICAS DO FUNIL DE CONVERSÃO */}
        {insightTab === 2 && (
          <Paper sx={{ p: 3, mb: 4, borderTop: '4px solid #4CAF50' }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <img src="/images/funnel-icon.svg" alt="Funil" width="30" height="30" style={{ marginRight: '10px' }} />
                  <Typography variant="h6" gutterBottom sx={{ color: '#4CAF50', fontWeight: 'bold', mb: 0 }}>
                    Funil de Conversão - Insights Detalhados
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
              </Grid>
            
            {/* Seção: Página de Captura */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Página de Captura
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total de Acessos
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.capturePageMetrics?.totalAccesses || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Formulários Preenchidos
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.capturePageMetrics?.totalFormsFilled || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Taxa de Conversão
                  </Typography>
                  <Typography variant="h5" component="div">
                    {(funnelData?.capturePageMetrics?.conversionRate || 0).toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Seção: Página de Vendas */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, mt: 3 }}>
                Página de Vendas
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total de Acessos
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.salesPageMetrics?.totalAccesses || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Cliques em Botões de Compra
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.salesPageMetrics?.totalButtonClicks || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Checkouts Iniciados
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.checkoutMetrics?.totalCheckoutsStarted || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Taxa de Conversão
                  </Typography>
                  <Typography variant="h5" component="div">
                    {(funnelData?.salesPageMetrics?.conversionRate || 0).toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Compras Completadas
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.purchaseResults?.totalApproved || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Valor Médio de Compra
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(funnelData?.purchaseResults?.averageValue || 197)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
        
        )}

        {/* MÉTRICAS DE CHECKOUT */}
        {insightTab === 2 && (
          <Paper sx={{ p: 3, mb: 4, borderTop: '4px solid #9C27B0' }}>
            <Grid container spacing={3}>
              {/* Seção: Checkout */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, mt: 3 }}>
                Checkout
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Checkout Iniciado
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.checkoutMetrics?.totalCheckoutsStarted || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Adicionou ao Carrinho
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.checkoutMetrics?.totalAddToCart || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Aguardando Pagamento
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.checkoutMetrics?.totalAwaitingPayment || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Etiquetas Distribuídas
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.checkoutMetrics?.totalCheckoutsStarted || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Seção: Resultados de Compra */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, mt: 3 }}>
                Resultados de Compra
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ backgroundColor: '#e8f5e9' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Compra Aprovada
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.purchaseResults?.totalApproved || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ backgroundColor: '#ffebee' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Compra Expirada
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.purchaseResults?.totalExpired || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ backgroundColor: '#ffebee' }}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Reembolso
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.purchaseResults?.totalRefund || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Taxa de Conversão
                  </Typography>
                  <Typography variant="h5" component="div">
                    {funnelData?.checkoutMetrics?.totalCheckoutsStarted > 0 
                      ? ((funnelData?.purchaseResults?.totalApproved / funnelData?.checkoutMetrics?.totalCheckoutsStarted) * 100).toFixed(2) 
                      : '0.00'}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Seção: Upsells */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, mt: 3 }}>
                Compras Adicionais
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    OB1
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.upsellMetrics?.totalOB1 || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    OB2
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.upsellMetrics?.totalOB2 || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Upsell 1
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.upsellMetrics?.totalUpsell1 || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Upsell 2
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(funnelData?.upsellMetrics?.totalUpsell2 || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
        )}
      </>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {!user && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Você precisa fazer login para visualizar suas contas de anúncios.
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {user && adAccounts.length === 0 && !loading && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Nenhuma conta de anúncios encontrada
          </Typography>
          <Typography paragraph>
            Você precisa conectar sua conta do Meta Ads para visualizar suas campanhas e relatórios.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            href="/connect-meta"
          >
            Conectar Meta Ads
          </Button>
        </Paper>
      )}
      
      {user && adAccounts.length > 0 && (
        <>
          {renderFilters()}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {overviewData && (
                <>
                  {renderKPIs()}
                  
                  <Box sx={{ mt: 4 }}>
                    <Tabs 
                      value={tabValue} 
                      onChange={handleTabChange} 
                      variant="fullWidth"
                      sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
                    >
                      <Tab label="Visão Geral" />
                      <Tab label="Campanhas" />
                      <Tab label="Análise" />
                      {gaConnected && <Tab label="Google Analytics" />}
                    </Tabs>
                    
                    {tabValue === 0 && (
                      <Grid container spacing={4}>
                        <Grid item xs={12} md={8}>
                          <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                              Gastos Diários
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {createDailySpendChartData() && (
                              <Line 
                                data={createDailySpendChartData()} 
                                options={{
                                  responsive: true,
                                  plugins: {
                                    legend: {
                                      position: 'top',
                                    },
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      ticks: {
                                        callback: function(value) {
                                          return 'R$ ' + value;
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            )}
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                              Distribuição de Gastos
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {createSpendDistributionChartData() && (
                              <Pie 
                                data={createSpendDistributionChartData()} 
                                options={{
                                  responsive: true,
                                  plugins: {
                                    legend: {
                                      position: 'bottom',
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: function(context) {
                                          const label = context.label || '';
                                          const value = context.raw || 0;
                                          const total = context.chart._metasets[0].total;
                                          const percentage = Math.round((value / total) * 100);
                                          return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            )}
                          </Paper>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                              Impressões e Cliques
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {createPerformanceChartData() && (
                              <Line 
                                data={createPerformanceChartData()} 
                                options={{
                                  responsive: true,
                                  interaction: {
                                    mode: 'index',
                                    intersect: false,
                                  },
                                  plugins: {
                                    legend: {
                                      position: 'top',
                                    },
                                  },
                                  scales: {
                                    y: {
                                      type: 'linear',
                                      display: true,
                                      position: 'left',
                                    },
                                    y1: {
                                      type: 'linear',
                                      display: true,
                                      position: 'right',
                                      grid: {
                                        drawOnChartArea: false,
                                      },
                                    },
                                  }
                                }}
                              />
                            )}
                          </Paper>
                        </Grid>
                        
                        {/* Exibir seção do Google Analytics na aba principal se conectado */}
                        {gaConnected && gaData && (
                          <Grid item xs={12}>
                            {renderGoogleAnalyticsSection()}
                          </Grid>
                        )}
                      </Grid>
                    )}
                    
                    {tabValue === 1 && (
                      <Grid container spacing={3}>
                        {/* Código da aba de Campanhas */}
                        {/* ... */}
                      </Grid>
                    )}
                    
                    {tabValue === 2 && (
                      <Grid container spacing={3}>
                        {/* Código da aba de Análise */}
                        {/* ... */}
                      </Grid>
                    )}
                    
                    {gaConnected && tabValue === 3 && (
                      <Grid container spacing={3}>
                        {renderGoogleAnalyticsSection()}
                      </Grid>
                    )}
                    
                    {/* Seção de Insights Detalhados - visível em qualquer aba quando dados estão disponíveis */}
                    {selectedAccount && selectedGaProperty && overviewData && funnelData && (
                      renderDetailedInsights()
                    )}
                  </Box>
                </>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default Dashboard;
