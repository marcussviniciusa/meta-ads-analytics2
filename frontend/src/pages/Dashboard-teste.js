import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  MenuItem, 
  Button, 
  Card, 
  CardContent, 
  Alert, 
  CircularProgress, 
  Tab, 
  Tabs,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Link,
  Chip,
  Collapse
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DownloadIcon from '@mui/icons-material/Download';
import TuneIcon from '@mui/icons-material/Tune';
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
import { setupChartSizeLimits, getLineChartOptions, getPieChartOptions } from '../utils/chartUtils';
import { hasValidSourceData, hasValidFunnelData, logGADiagnostics, fixGoogleAnalyticsData, transformTrafficSourceRows, transformTopPagesRows } from '../utils/gaFixUtils';
import EnhancedMetaAnalytics from '../components/meta/EnhancedMetaAnalytics';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale, LinearScale, 
  PointElement, LineElement, 
  BarElement, Title, 
  Tooltip, Legend, ArcElement
);

// Componente MetricSelector
const MetricSelector = ({ platform, selectedMetrics, onMetricsChange }) => {
  const metaMetrics = [
    { id: 'spend', label: 'Gastos' },
    { id: 'impressions', label: 'Impressões' },
    { id: 'clicks', label: 'Cliques' },
    { id: 'ctr', label: 'CTR' },
    { id: 'cpc', label: 'CPC' },
    { id: 'cpm', label: 'CPM' },
    { id: 'reach', label: 'Alcance' },
    { id: 'frequency', label: 'Frequência' },
    { id: 'conversions', label: 'Conversões' },
    { id: 'costPerConversion', label: 'Custo por Conversão' },
    { id: 'conversionRate', label: 'Taxa de Conversão' }
  ];
  
  const gaMetrics = [
    { id: 'activeUsers', label: 'Usuários Ativos' },
    { id: 'sessions', label: 'Sessões' },
    { id: 'pageViews', label: 'Visualizações de Página' },
    { id: 'bounceRate', label: 'Taxa de Rejeição' },
    { id: 'avgSessionDuration', label: 'Duração Média da Sessão' },
    { id: 'newUsers', label: 'Novos Usuários' },
    { id: 'engagementRate', label: 'Taxa de Engajamento' },
    { id: 'conversions', label: 'Conversões' }
  ];
  
  const metrics = platform === 'meta' ? metaMetrics : gaMetrics;
  const title = platform === 'meta' ? 'Métricas do Meta Ads' : 'Métricas do Google Analytics';
  
  const handleToggleMetric = (metricId) => {
    if (selectedMetrics.includes(metricId)) {
      onMetricsChange(selectedMetrics.filter(id => id !== metricId));
    } else {
      onMetricsChange([...selectedMetrics, metricId]);
    }
  };
  
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      <Grid container spacing={1}>
        {metrics.map((metric) => (
          <Grid item key={metric.id}>
            <Chip
              label={metric.label}
              onClick={() => handleToggleMetric(metric.id)}
              color={selectedMetrics.includes(metric.id) ? "primary" : "default"}
              variant={selectedMetrics.includes(metric.id) ? "filled" : "outlined"}
              sx={{ m: 0.5 }}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

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
  
  // Estado para controlar os analytics avançados do Meta Ads
  const [showEnhancedMetaAnalytics, setShowEnhancedMetaAnalytics] = useState(false);
  const [metaAccountId, setMetaAccountId] = useState('');

  // Estados para o seletor de métricas
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  const [selectedMetaMetrics, setSelectedMetaMetrics] = useState([
    'spend', 'impressions', 'clicks', 'ctr', 'reach', 'conversions', 'conversionRate'
  ]);
  const [selectedGaMetrics, setSelectedGaMetrics] = useState([
    'activeUsers', 'sessions', 'pageViews', 'engagementRate', 'avgSessionDuration'
  ]);

  // Função para exportar dados para CSV
  const exportMetricsData = () => {
    // Determinar quais dados exportar com base na aba atual
    let csvData = [];
    let filename = '';
    
    if (insightTab === 0 && overviewData) {
      // Exportar dados do Meta Ads
      filename = `meta_ads_metricas_${format(startDate, 'dd-MM-yyyy')}_a_${format(endDate, 'dd-MM-yyyy')}.csv`;
      
      // Cabeçalho
      const headers = ['Data'];
      selectedMetaMetrics.forEach(metricKey => {
        const metricLabel = {
          'spend': 'Gastos (R$)',
          'impressions': 'Impressões',
          'clicks': 'Cliques',
          'ctr': 'CTR (%)',
          'cpc': 'CPC (R$)',
          'cpm': 'CPM (R$)',
          'reach': 'Alcance',
          'frequency': 'Frequência',
          'conversions': 'Conversões',
          'costPerConversion': 'Custo por Conversão (R$)',
          'conversionRate': 'Taxa de Conversão (%)'
        }[metricKey] || metricKey;
        
        headers.push(metricLabel);
      });
      
      csvData.push(headers.join(','));
      
      // Dados por dia
      if (overviewData.performanceByDay) {
        // Agrupar por data
        const dataByDate = {};
        
        overviewData.performanceByDay.forEach(day => {
          const date = day.date;
          
          if (!dataByDate[date]) {
            dataByDate[date] = {
              spend: parseFloat(day.spend || 0),
              impressions: parseInt(day.impressions || 0, 10),
              clicks: parseInt(day.clicks || 0, 10),
              ctr: parseFloat(day.ctr || 0),
              cpc: parseFloat(day.cpc || 0),
              cpm: parseFloat(day.cpm || 0),
              reach: parseInt(day.reach || 0, 10),
              frequency: parseFloat(day.frequency || 0),
              conversions: parseInt(day.conversions || 0, 10),
              costPerConversion: parseFloat(day.costPerConversion || 0),
              conversionRate: parseFloat(day.conversionRate || 0)
            };
          } else {
            dataByDate[date].spend += parseFloat(day.spend || 0);
            dataByDate[date].impressions += parseInt(day.impressions || 0, 10);
            dataByDate[date].clicks += parseInt(day.clicks || 0, 10);
            // As outras métricas são calculadas ou utilizam a última medição
          }
        });
        
        // Ordenar datas
        const sortedDates = Object.keys(dataByDate).sort();
        
        // Adicionar linha para cada data
        sortedDates.forEach(date => {
          const row = [date];
          
          selectedMetaMetrics.forEach(metricKey => {
            row.push(dataByDate[date][metricKey]);
          });
          
          csvData.push(row.join(','));
        });
      }
    } else if (insightTab === 1 && gaData && gaData.rows) {
      // Exportar dados do Google Analytics
      filename = `google_analytics_metricas_${format(startDate, 'dd-MM-yyyy')}_a_${format(endDate, 'dd-MM-yyyy')}.csv`;
      
      // Cabeçalho
      const headers = ['Data'];
      const metricHeaderMap = {
        'activeUsers': 'Usuários Ativos',
        'sessions': 'Sessões',
        'pageViews': 'Visualizações de Página',
        'bounceRate': 'Taxa de Rejeição (%)',
        'avgSessionDuration': 'Duração Média da Sessão (s)',
        'newUsers': 'Novos Usuários',
        'engagementRate': 'Taxa de Engajamento (%)',
        'conversions': 'Conversões'
      };
      
      // Encontrar índices das métricas no objeto gaData
      const dimensionHeaders = gaData.dimensionHeaders || [];
      const metricHeaders = gaData.metricHeaders || [];
      const dateIndex = dimensionHeaders.findIndex(h => h.name === 'date');
      
      // Mapear métricas selecionadas com seus índices
      const metricIndices = {};
      selectedGaMetrics.forEach(metricKey => {
        let metricName = '';
        switch(metricKey) {
          case 'activeUsers':
            metricName = 'activeUsers';
            break;
          case 'sessions':
            metricName = 'sessions';
            break;
          case 'pageViews':
            metricName = 'screenPageViews';
            break;
          case 'bounceRate':
            metricName = 'bounceRate';
            break;
          case 'avgSessionDuration':
            metricName = 'averageSessionDuration';
            break;
          case 'newUsers':
            metricName = 'newUsers';
            break;
          case 'engagementRate':
            metricName = 'engagementRate';
            break;
          case 'conversions':
            metricName = 'conversions';
            break;
          default:
            metricName = metricKey;
        }
        
        const index = metricHeaders.findIndex(h => h.name === metricName);
        if (index !== -1) {
          metricIndices[metricKey] = index;
          headers.push(metricHeaderMap[metricKey] || metricKey);
        }
      });
      
      csvData.push(headers.join(','));
      
      // Adicionar linha para cada data
      if (dateIndex !== -1) {
        gaData.rows.forEach(row => {
          const dateString = row.dimensionValues[dateIndex].value;
          // Converter formato YYYYMMDD para DD/MM/YYYY
          const formattedDate = `${dateString.substring(6, 8)}/${dateString.substring(4, 6)}/${dateString.substring(0, 4)}`;
          
          const rowData = [formattedDate];
          
          selectedGaMetrics.forEach(metricKey => {
            const index = metricIndices[metricKey];
            if (index !== undefined) {
              rowData.push(row.metricValues[index].value);
            } else {
              rowData.push('');
            }
          });
          
          csvData.push(rowData.join(','));
        });
      }
    } else {
      alert('Não há dados disponíveis para exportar');
      return;
    }
    
    // Criar e baixar o arquivo CSV
    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                sx={{ mt: 2 }}
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
    console.log('Iniciando fetchOverviewData...');
    
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
      console.log('Estrutura do objeto Meta Ads:', JSON.stringify(data, null, 2));
      
      // Atualiza o estado com os dados reais
      setOverviewData(data);
      
      // Ativar explicitamente a visualização dos insights detalhados do Meta
      setMetaAccountId(selectedAccount);
      setShowEnhancedMetaAnalytics(true);
      
      // Log também do estado atual depois de atualizado
      setTimeout(() => {
        console.log('Estado overviewData após atualização:', overviewData);
        console.log('Estado de metaAccountId e showEnhancedMetaAnalytics:', { 
          metaAccountId: selectedAccount, 
          showEnhancedMetaAnalytics: true 
        });
      }, 100);
      
      // Carregar dados adicionais para análises avançadas do Meta Ads
      if (showEnhancedMetaAnalytics) {
        try {
          console.log('Carregando dados adicionais para análises avançadas do Meta Ads...');
          
          // Aqui podemos pré-carregar dados que serão usados pelos componentes avançados
          // Isso é opcional, pois os componentes também podem carregar seus próprios dados
          // quando necessário
          
          // Exemplo: Pré-carregar dados de insights de campanha
          // const campaignInsights = await metaReportService.getAccountInsights(
          //   selectedAccount,
          //   formattedStartDate,
          //   formattedEndDate
          // );
          // console.log('Dados de insights de campanha carregados:', campaignInsights);
          
        } catch (enhancedError) {
          console.error('Erro ao carregar dados adicionais para análises avançadas:', enhancedError);
          // Não interromper o fluxo principal se os dados adicionais falharem
        }
      }
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
      
      // Log de diagnóstico antes de chamar a API
      console.log('Buscando dados do Google Analytics com os parâmetros:', {
        propertyId: selectedGaProperty,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });
      
      const data = await googleAnalyticsService.getDashboardReport(
        selectedGaProperty,
        formattedStartDate,
        formattedEndDate
      );
      
      console.log('Dados do Google Analytics obtidos:', data);
      
      // Diagnosticar estrutura dos dados recebidos
      console.log('Diagnóstico detalhado da estrutura:', {
        hasSourceData: !!data?.sourceData,
        sourceDataRows: data?.sourceData?.rows ? data.sourceData.rows.length : 0,
        firstSourceRow: data?.sourceData?.rows?.[0] ? 'Presente' : 'Ausente',
        sourceDataStructure: data?.sourceData ? Object.keys(data.sourceData) : []
      });
      
      // Log detalhado para diagnóstico
      logGADiagnostics(data, funnelData);
      
      // Corrigir estrutura de dados para garantir que todos os campos necessários existam
      // e processar os dados de fontes de tráfego
      const fixedData = fixGoogleAnalyticsData(data);
      
      setGaData(fixedData);
      
      // Verificar se os dados de sourceData estão presentes e válidos
      if (!fixedData.sourceData || !fixedData.sourceData.rows || fixedData.sourceData.rows.length === 0) {
        console.warn('Dados de fontes de tráfego ausentes ou inválidos:', 
                     { sourceData: fixedData.sourceData });
        
        // Tentar buscar os dados de tráfego novamente de forma específica
        try {
          console.log('Tentando buscar dados de tráfego separadamente...');
          const sourceData = await googleAnalyticsService.getChannelsReport(
            selectedGaProperty,
            formattedStartDate,
            formattedEndDate
          );
          
          // Adicionar dados de tráfego ao objeto principal
          if (sourceData && sourceData.rows) {
            console.log('Dados de tráfego recuperados com sucesso:', sourceData);
            fixedData.sourceData = sourceData;
            
            // Também processar os novos dados para o formato trafficSources
            if (sourceData.rows.length > 0) {
              fixedData.trafficSources = transformTrafficSourceRows(sourceData.rows);
              console.log(`Processados ${fixedData.trafficSources.length} registros de fontes de tráfego`);
            }
            
            // Atualizar o estado com os novos dados
            setGaData({...fixedData});
          }
        } catch (sourceErr) {
          console.error('Erro ao tentar buscar dados de tráfego separadamente:', sourceErr);
        }
      }
      
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
      
      // Diagnosticar estrutura dos dados recebidos
      console.log('Diagnóstico detalhado da estrutura do funil:', {
        hasTopPages: !!data?.topPages,
        topPagesRows: data?.topPages?.rows ? data.topPages.rows.length : 0,
        firstTopPageRow: data?.topPages?.rows?.[0] ? 'Presente' : 'Ausente',
        hasDeviceData: !!data?.deviceData,
        hasRetentionData: !!data?.retentionData
      });
      
      // Verificar se os dados de topPages estão presentes e válidos
      if (!data.topPages || !data.topPages.rows || data.topPages.rows.length === 0) {
        console.warn('Dados de páginas mais visualizadas ausentes ou inválidos:', 
                     { topPages: data.topPages });
        
        // Criar dados simulados para evitar problemas de renderização
        const samplePages = [
          { pagePath: '/pagina-inicial', views: 120, users: 85, avgTime: 45.2 },
          { pagePath: '/produtos', views: 98, users: 72, avgTime: 32.7 },
          { pagePath: '/sobre', views: 45, users: 38, avgTime: 22.3 },
          { pagePath: '/contato', views: 32, users: 29, avgTime: 18.5 },
          { pagePath: '/blog', views: 67, users: 54, avgTime: 38.9 }
        ];
        
        // Garantir que haverá um objeto válido com dados simulados
        data.topPages = data.topPages || { rows: [] };
        data.processedTopPages = samplePages;
        console.log('Usando dados simulados para páginas mais visualizadas devido à ausência de dados reais');
      } else if (data.topPages.rows.length > 0) {
        // Transformar dados das páginas para um formato mais amigável
        data.processedTopPages = transformTopPagesRows(data.topPages.rows);
        console.log(`Processadas ${data.processedTopPages.length} páginas mais visualizadas`);
      }
      
      // Garantir que todos os objetos necessários existam
      if (!data.deviceData) data.deviceData = { rows: [] };
      if (!data.retentionData) data.retentionData = { rows: [] };
      
      setFunnelData(data);
    } catch (err) {
      setFunnelError('Não foi possível carregar os dados detalhados do funil.');
      console.error('Erro ao buscar dados do funil:', err);
      
      // Garantir um estado válido mesmo em caso de erro
      setFunnelData({
        topPages: { rows: [] },
        processedTopPages: [],
        deviceData: { rows: [] },
        retentionData: { rows: [] }
      });
    } finally {
      setLoadingFunnel(false);
    }
  };

  // Criar dados para o gráfico de gastos diários
  const createDailySpendChartData = () => {
    if (!overviewData || !overviewData.performanceByDay || !selectedMetaMetrics.includes('spend')) {
      return null;
    }
    
    // Agrupar por data
    const dataByDate = {};
    
    overviewData.performanceByDay.forEach(day => {
      const date = day.date;
      
      if (!dataByDate[date]) {
        dataByDate[date] = 0;
      }
      
      dataByDate[date] += parseFloat(day.spend || 0);
    });
    
    // Ordenar datas
    const sortedDates = Object.keys(dataByDate).sort();
    
    // Limitar a quantidade de pontos para melhorar performance
    let limitedDates = sortedDates;
    let limitedSpendData = limitedDates.map(date => dataByDate[date]);
    
    // Se tivermos mais de 30 pontos, agregamos para evitar sobrecarga
    if (sortedDates.length > 30) {
      const aggregationFactor = Math.ceil(sortedDates.length / 30);
      limitedDates = [];
      limitedSpendData = [];
      
      for (let i = 0; i < sortedDates.length; i += aggregationFactor) {
        const endIndex = Math.min(i + aggregationFactor, sortedDates.length);
        const dateRange = sortedDates.slice(i, endIndex);
        const averageSpend = dateRange.reduce((sum, date) => sum + dataByDate[date], 0) / dateRange.length;
        
        // Usamos a data média do intervalo
        const midDate = dateRange[Math.floor(dateRange.length / 2)];
        limitedDates.push(midDate);
        limitedSpendData.push(averageSpend);
      }
    }
    
    // Formatar datas para o gráfico (DD/MM)
    const formattedDates = limitedDates.map(date => {
      const parts = date.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    
    return {
      labels: formattedDates,
      datasets: [
        {
          label: 'Gastos Diários (R$)',
          data: limitedSpendData,
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
    
    // Filtrar para incluir apenas métricas selecionadas
    const includedMetrics = ['impressions', 'clicks'].filter(metric => 
      selectedMetaMetrics.includes(metric)
    );
    
    if (includedMetrics.length === 0) {
      return null;
    }
    
    // Agrupar por data
    const dataByDate = {};
    
    overviewData.performanceByDay.forEach(day => {
      const date = day.date;
      
      if (!dataByDate[date]) {
        dataByDate[date] = {
          impressions: 0,
          clicks: 0
        };
      }
      
      dataByDate[date].impressions += parseInt(day.impressions || 0);
      dataByDate[date].clicks += parseInt(day.clicks || 0);
    });
    
    // Ordenar datas
    const sortedDates = Object.keys(dataByDate).sort();
    
    // Limitar a quantidade de pontos para melhorar performance
    let limitedDates = sortedDates;
    let limitedImpressions = [];
    let limitedClicks = [];
    
    // Se tivermos mais de 30 pontos, agregamos para evitar sobrecarga
    if (sortedDates.length > 30) {
      const aggregationFactor = Math.ceil(sortedDates.length / 30);
      limitedDates = [];
      
      for (let i = 0; i < sortedDates.length; i += aggregationFactor) {
        const endIndex = Math.min(i + aggregationFactor, sortedDates.length);
        const dateRange = sortedDates.slice(i, endIndex);
        
        const avgImpressions = dateRange.reduce((sum, date) => sum + dataByDate[date].impressions, 0) / dateRange.length;
        const avgClicks = dateRange.reduce((sum, date) => sum + dataByDate[date].clicks, 0) / dateRange.length;
        
        // Usamos a data média do intervalo
        const midDate = dateRange[Math.floor(dateRange.length / 2)];
        limitedDates.push(midDate);
        limitedImpressions.push(avgImpressions);
        limitedClicks.push(avgClicks);
      }
    } else {
      limitedImpressions = sortedDates.map(date => dataByDate[date].impressions);
      limitedClicks = sortedDates.map(date => dataByDate[date].clicks);
    }
    
    // Formatar datas para o gráfico (DD/MM)
    const formattedDates = limitedDates.map(date => {
      const parts = date.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    
    // Criar conjuntos de dados com base nas métricas selecionadas
    const datasets = [];
    
    if (includedMetrics.includes('impressions')) {
      datasets.push({
        label: 'Impressões',
        data: limitedImpressions,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y',
      });
    }
    
    if (includedMetrics.includes('clicks')) {
      datasets.push({
        label: 'Cliques',
        data: limitedClicks,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y1',
      });
    }
    
    return {
      labels: formattedDates,
      datasets: datasets
    };
  };

  // Criar dados para o gráfico de distribuição de gastos
  const createSpendDistributionChartData = () => {
    if (!overviewData || !overviewData.campaigns || !selectedMetaMetrics.includes('spend')) return null;
    
    // Filtrar por campanhas com gasto > 0 e limitar a 7 campanhas para não sobrecarregar o gráfico
    const filteredCampaigns = overviewData.campaigns
      .filter(campaign => (campaign.totalSpend || 0) > 0)
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 7);
    
    if (filteredCampaigns.length === 0) return null;
    
    // Cores para o gráfico
    const backgroundColors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(201, 203, 207, 0.7)'
    ];
    
    const borderColors = [
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
      'rgba(201, 203, 207, 1)'
    ];
    
    return {
      labels: filteredCampaigns.map(campaign => campaign.name),
      datasets: [
        {
          data: filteredCampaigns.map(campaign => campaign.totalSpend),
          backgroundColor: backgroundColors.slice(0, filteredCampaigns.length),
          borderColor: borderColors.slice(0, filteredCampaigns.length),
          borderWidth: 1
        }
      ]
    };
  };

  // Criar dados para o gráfico de usuários ativos do Google Analytics
  const createGaUsersChartData = () => {
    if (!gaData || !gaData.rows) {
      return null;
    }
    
    // Filtrar métricas com base nas selecionadas pelo usuário
    const metricMap = {
      'activeUsers': { index: -1, label: 'Usuários Ativos', color: 'rgb(75, 192, 192)' },
      'sessions': { index: -1, label: 'Sessões', color: 'rgb(54, 162, 235)' },
      'pageViews': { index: -1, label: 'Visualizações de Página', color: 'rgb(153, 102, 255)' }
    };
    
    // Extrair datas e valores das métricas
    const rows = gaData.rows || [];
    const dimensionHeaders = gaData.dimensionHeaders || [];
    const metricHeaders = gaData.metricHeaders || [];
    
    // Encontrar índices das métricas
    const dateIndex = dimensionHeaders.findIndex(h => h.name === 'date');
    
    for (const [key, value] of Object.entries(metricMap)) {
      let metricName = key;
      if (key === 'pageViews') metricName = 'screenPageViews';
      
      metricMap[key].index = metricHeaders.findIndex(h => h.name === metricName);
    }
    
    // Verificar se temos dados suficientes
    const selectedGaMetricsFound = selectedGaMetrics.filter(metric => 
      metricMap[metric] && metricMap[metric].index !== -1
    );
    
    if (dateIndex === -1 || selectedGaMetricsFound.length === 0) {
      console.error('Métricas ou dimensões necessárias não encontradas nos dados do GA');
      return null;
    }
    
    // Formatar datas e extrair valores
    const labels = rows.map(row => {
      const dateString = row.dimensionValues[dateIndex].value;
      // Converter formato YYYYMMDD para DD/MM
      return `${dateString.substring(6, 8)}/${dateString.substring(4, 6)}`;
    });
    
    // Criar conjuntos de dados para cada métrica selecionada
    const datasets = [];
    
    selectedGaMetricsFound.forEach(metricKey => {
      const { index, label, color } = metricMap[metricKey];
      
      if (index !== -1) {
        const data = rows.map(row => parseInt(row.metricValues[index].value));
        
        datasets.push({
          label,
          data,
          borderColor: color,
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.5)'),
          yAxisID: metricKey === 'pageViews' ? 'y1' : 'y',
        });
      }
    });
    
    return {
      labels,
      datasets
    };
  };

  // Configurações globais de gráficos otimizadas
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
    },
    layout: {
      padding: {
        top: 5,
        bottom: 5
      }
    },
    elements: {
      point: {
        radius: 3, // Reduzir o tamanho dos pontos para melhorar performance
        hitRadius: 10,
        hoverRadius: 5
      },
      line: {
        borderWidth: 2
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        }
      }
    },
    // Adicionar configurações específicas para os diferentes tipos de gráficos
    lineChart: {
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 6
          }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 6
          },
          grid: {
            display: false
          }
        }
      }
    },
    barChart: {
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 6
          }
        }
      }
    },
    pieChart: {
      cutout: '30%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 15,
            padding: 10,
            font: {
              size: 10
            }
          }
        }
      }
    }
  };

  // Adicionar função auxiliar para limitar pontos de dados
  const limitDataPoints = (data, labels, maxPoints = 30) => {
    if (labels.length <= maxPoints) {
      return { limitedLabels: labels, limitedData: data };
    }
    
    const aggregationFactor = Math.ceil(labels.length / maxPoints);
    const limitedLabels = [];
    const limitedData = [];
    
    for (let i = 0; i < labels.length; i += aggregationFactor) {
      const endIndex = Math.min(i + aggregationFactor, labels.length);
      const labelRange = labels.slice(i, endIndex);
      const dataRange = data.slice(i, endIndex);
      
      // Calculamos a média dos dados no intervalo
      const avgData = dataRange.reduce((sum, val) => sum + (val || 0), 0) / dataRange.length;
      
      // Usamos o label do meio do intervalo
      const midLabel = labelRange[Math.floor(labelRange.length / 2)];
      limitedLabels.push(midLabel);
      limitedData.push(avgData);
    }
    
    return { limitedLabels, limitedData };
  };

  // Modificar a função createTrafficSourcesChartData para limitar pontos de dados
  const createTrafficSourcesChartData = () => {
    if (!gaData || !gaData.trafficSources) return null;
    
    // Ordenar por número de usuários (decrescente)
    const sortedSources = [...gaData.trafficSources]
      .sort((a, b) => b.users - a.users);
    
    // Limitar a 8 fontes mais relevantes para melhor visualização
    const topSources = sortedSources.slice(0, 8);
    
    // Para outras fontes, agrupamos como "Outros"
    let otherSourcesUsers = 0;
    if (sortedSources.length > 8) {
      otherSourcesUsers = sortedSources.slice(8).reduce((sum, source) => sum + source.users, 0);
    }
    
    // Preparar dados
    const labels = topSources.map(source => source.source || 'Direto');
    const data = topSources.map(source => source.users);
    
    // Adicionar "Outros" se existirem
    if (otherSourcesUsers > 0) {
      labels.push('Outros');
      data.push(otherSourcesUsers);
    }
    
    // Cores para cada fonte
    const backgroundColors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)',
      'rgba(83, 102, 255, 0.7)',
      'rgba(169, 169, 169, 0.7)'  // Para "Outros"
    ];
    
    const colors = labels.map((label, index) => 
      backgroundColors[index] || 'rgba(75, 192, 192, 0.7)'
    );
    
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 1
      }]
    };
  };

  // Modificar a função createUserEngagementChartData para otimizar dados
  const createUserEngagementChartData = () => {
    if (!gaData || !gaData.engagementMetrics) return null;
    
    // Filtrar métricas baseado nas seleções do usuário
    const includeEngagementRate = selectedGaMetrics.includes('engagementRate');
    const includeSessionDuration = selectedGaMetrics.includes('avgSessionDuration');
    
    if (!includeEngagementRate && !includeSessionDuration) return null;
    
    const rawLabels = gaData.engagementMetrics.map(day => {
      const date = new Date(day.date);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')}`;
    });
    
    const engagementRateData = includeEngagementRate ? gaData.engagementMetrics.map(day => 
      parseFloat(day.engagementRate || 0) * 100
    ) : [];
    
    const avgSessionDurationData = includeSessionDuration ? gaData.engagementMetrics.map(day => 
      parseFloat(day.averageSessionDuration || 0) / 60
    ) : []; // Converter para minutos
    
    // Limitar pontos de dados
    const { limitedLabels: limitedLabels1, limitedData: limitedEngagementRate } = 
      includeEngagementRate ? limitDataPoints(engagementRateData, rawLabels) : { limitedLabels: rawLabels, limitedData: [] };
    
    const { limitedData: limitedSessionDuration } = 
      includeSessionDuration ? limitDataPoints(avgSessionDurationData, rawLabels, limitedLabels1.length) : { limitedData: [] };
    
    const datasets = [];
    
    if (includeEngagementRate) {
      datasets.push({
        label: 'Taxa de Engajamento (%)',
        data: limitedEngagementRate,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y',
        tension: 0.3
      });
    }
    
    if (includeSessionDuration) {
      datasets.push({
        label: 'Duração Média da Sessão (min)',
        data: limitedSessionDuration,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y1',
        tension: 0.3
      });
    }
    
    return {
      labels: limitedLabels1,
      datasets
    };
  };

  // Modificar a função createUserDevicesChartData para melhor visualização
  const createUserDevicesChartData = () => {
    if (!gaData || !gaData.deviceMetrics) return null;
    
    // Agrupar por tipo de dispositivo
    const deviceData = {};
    gaData.deviceMetrics.forEach(metric => {
      const device = metric.deviceCategory || 'unknown';
      if (!deviceData[device]) {
        deviceData[device] = 0;
      }
      deviceData[device] += parseInt(metric.users || 0);
    });
    
    // Preparar dados
    const labels = Object.keys(deviceData);
    const data = labels.map(device => deviceData[device]);
    
    // Cores personalizadas para cada dispositivo
    const backgroundColors = {
      'mobile': 'rgba(255, 99, 132, 0.7)',
      'desktop': 'rgba(54, 162, 235, 0.7)',
      'tablet': 'rgba(255, 206, 86, 0.7)',
      'unknown': 'rgba(169, 169, 169, 0.7)'
    };
    
    const colors = labels.map(device => 
      backgroundColors[device.toLowerCase()] || 'rgba(75, 192, 192, 0.7)'
    );
    
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 1
      }]
    };
  };

  // Configuração dos limites para os gráficos no carregamento inicial do componente
  useEffect(() => {
    // Importar a configuração dos limites para o Chart.js
    import('../utils/chartUtils').then(({ setupChartSizeLimits }) => {
      // Aplica as configurações globais do Chart.js para limitar tamanho
      setupChartSizeLimits();
      console.log('Configuração de limites de canvas aplicada ao Chart.js');
    }).catch(error => {
      console.error('Erro ao configurar limites para gráficos:', error);
    });
  }, []);
  
  // Efeito para lidar com o redimensionamento de janela
  useEffect(() => {
    // Função para ajustar os gráficos quando a janela for redimensionada
    const handleResize = () => {
      // Forçar o Chart.js a recalcular os tamanhos dos gráficos
      const chartElements = document.querySelectorAll('canvas');
      chartElements.forEach(canvas => {
        if (canvas.__chartjs__ && canvas.__chartjs__.length > 0) {
          const chart = canvas.__chartjs__[0];
          if (chart && typeof chart.resize === 'function') {
            chart.resize();
          }
        }
      });
    };
    
    // Adicionar event listener para resize
    window.addEventListener('resize', handleResize);
    
    // Limpar event listener quando componente desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Define opções padrão para todos os gráficos com tamanho adequado
  useEffect(() => {
    // Assegurar que os conteineres dos gráficos tenham altura e largura definidas
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
      if (!container.style.height) {
        container.style.height = '400px';
      }
      if (!container.style.width) {
        container.style.width = '100%';
      }
    });
    
    // Definir estilos CSS para melhorar a exibição de gráficos
    const style = document.createElement('style');
    style.textContent = `
      .chart-container {
        position: relative;
        height: 400px;
        width: 100%;
        max-height: 600px;
      }
      canvas.chartjs-render-monitor {
        max-height: 600px !important;
      }
    `;
    document.head.appendChild(style);
    
    // Limpar o estilo ao desmontar
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Renderizar filtros
  const renderFilters = () => {
    return (
      <Box sx={{ mb: 4 }}>
        {/* Filtros existentes */}
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Conta de Anúncios"
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setMetaAccountId(e.target.value);
                setShowEnhancedMetaAnalytics(true);
              }}
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
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={() => {
                  fetchOverviewData();
                  if (gaConnected && selectedGaProperty) {
                    fetchGoogleAnalyticsData();
                  }
                }}
                disabled={loading || !selectedAccount}
                sx={{ mr: 1, flex: 1 }}
              >
                {loading || loadingGa ? <CircularProgress size={24} /> : 'Atualizar'}
              </Button>
              
              {/* Botão para alternar a visibilidade do seletor de métricas */}
              <IconButton 
                color="primary" 
                onClick={() => setShowMetricSelector(!showMetricSelector)}
                title={showMetricSelector ? "Ocultar Seletor de Métricas" : "Mostrar Seletor de Métricas"}
              >
                {showMetricSelector ? <VisibilityOffIcon /> : <TuneIcon />}
              </IconButton>
            </Box>
          </Grid>
        </Grid>
        
        {/* Botão de exportação */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={exportMetricsData}
            disabled={loading || (insightTab === 0 && !overviewData) || (insightTab === 1 && !gaData)}
            size="small"
            startIcon={<DownloadIcon />}
          >
            Exportar Dados ({insightTab === 0 ? 'Meta Ads' : 'Google Analytics'})
          </Button>
        </Box>
        
        {/* Seletor de métricas */}
        <Collapse in={showMetricSelector}>
          <Box sx={{ mt: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <MetricSelector
                    platform="meta"
                    selectedMetrics={selectedMetaMetrics}
                    onMetricsChange={setSelectedMetaMetrics}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <MetricSelector
                    platform="ga"
                    selectedMetrics={selectedGaMetrics}
                    onMetricsChange={setSelectedGaMetrics}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </Collapse>
      </Box>
    );
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
    if (!value) return '0';
    
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
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
                  }
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <img src="/images/meta-logo.svg" alt="Meta" width="30" height="30" style={{ marginRight: '10px' }} />
                    <Typography variant="h6" gutterBottom sx={{ color: '#1877F2', fontWeight: 'bold', mb: 0 }}>
                      Meta Ads - Indicadores de Desempenho
                    </Typography>
                  </Box>
                  {metaAccountId && (
                    <Button
                      variant={showEnhancedMetaAnalytics ? "contained" : "outlined"}
                      color="primary"
                      size="small"
                      startIcon={showEnhancedMetaAnalytics ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      onClick={() => setShowEnhancedMetaAnalytics(!showEnhancedMetaAnalytics)}
                      sx={{ ml: 2 }}
                    >
                      {showEnhancedMetaAnalytics ? "Ocultar Análise Avançada" : "Mostrar Análise Avançada"}
                    </Button>
                  )}
                </Box>
                <Divider sx={{ mb: 3 }} />
              </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Impressões
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(overviewData?.summary?.impressions || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Alcance
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(overviewData?.summary?.reach || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total de Cliques
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(overviewData?.summary?.clicks || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Cliques no Link
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(overviewData?.summary?.link_clicks || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    CTR (Taxa de Cliques)
                  </Typography>
                  <Typography variant="h5" component="div">
                    {(overviewData?.summary?.ctr || 0).toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Reações no Post
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(overviewData?.summary?.post_reactions || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                Métricas de Vídeo e Conversão
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    ThruPlays
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(overviewData?.summary?.video_thruplay || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Visualizações de Página de Destino
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(overviewData?.summary?.landing_page_views || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Conversões
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(overviewData?.summary?.conversions || 0)}
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
                    {(overviewData?.summary?.conversion_rate || 0).toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Leads
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatNumber(overviewData?.summary?.leads || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 2 }}>
                Métricas de Custo
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    CPC (Custo por Clique)
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(overviewData?.summary?.cpc || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    CPM (Custo por Mil Impressões)
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(overviewData?.summary?.cpm || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Custo por Resultado
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(overviewData?.summary?.cost_per_result || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Custo por Visualização de Vídeo
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(overviewData?.summary?.cost_per_video_view || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Custo por Conversão
                  </Typography>
                  <Typography variant="h5" component="div">
                    {formatCurrency(overviewData?.summary?.cost_per_conversion || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Enhanced Meta Analytics Section */}
            <Grid item xs={12}>
              <Box sx={{ mt: 4, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Análise Avançada de Campanhas Meta Ads
                  </Typography>
                  {!showEnhancedMetaAnalytics && (
                    <Button 
                      variant="contained" 
                      color="primary"
                      size="small"
                      onClick={() => {
                        setMetaAccountId(selectedAccount);
                        setShowEnhancedMetaAnalytics(true);
                        console.log('Ativando insights detalhados manualmente:', {selectedAccount});
                      }}
                    >
                      Exibir Insights Detalhados
                    </Button>
                  )}
                </Box>
                <Divider sx={{ mb: 3 }} />
                
                {showEnhancedMetaAnalytics && metaAccountId ? (
                  // Forçando exibição do componente com o console.log para diagnosticar
                  console.log('Renderizando EnhancedMetaAnalytics com:', {metaAccountId, startDate, endDate}) || 
                  <EnhancedMetaAnalytics 
                    accountId={metaAccountId} 
                    dateRange={{
                      startDate: startDate,
                      endDate: endDate
                    }}
                  />
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <CircularProgress size={30} sx={{ mb: 2 }} />
                    <Typography variant="body1">
                      Carregando insights detalhados das campanhas Meta Ads...
                    </Typography>
                  </Box>
                )}
              </Box>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
              {/* Seção: Página de Captura */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Página de Captura
                </Typography>
              </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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
            
            <Grid item xs={12} sm={6} md={3}>
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

  // Seção de Funil de Conversão e Insights
  const renderFunnelSection = () => {
    // Log de diagnóstico
    console.log("Renderizando seção de funil, dados disponíveis:", 
               funnelData ? `Sim (topPages: ${funnelData.topPages ? "Sim" : "Não"}, processedTopPages: ${funnelData.processedTopPages ? "Sim" : "Não"})` : "Não");
               
    // Verificar dados detalhados para diagnóstico
    if (funnelData) {
      console.log("Estrutura de dados do funil:", {
        hasTopPages: !!funnelData.topPages,
        topPagesRowCount: funnelData.topPages?.rows ? funnelData.topPages.rows.length : 0,
        hasProcessedTopPages: !!funnelData.processedTopPages,
        processedTopPagesCount: funnelData.processedTopPages ? funnelData.processedTopPages.length : 0
      });
    }
    
    if (loadingFunnel) {
      return (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Carregando dados detalhados do funil...
          </Typography>
        </Box>
      );
    }
    
    if (funnelError) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {funnelError}
        </Alert>
      );
    }
    
    if (!funnelData) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          Selecione uma propriedade do Google Analytics e clique em "Buscar Dados" para visualizar insights detalhados.
        </Alert>
      );
    }

    // Renderizar dados detalhados do funil
    return (
      <Box sx={{ mt: 2 }}>
        {/* Top Pages Section */}
        <Typography variant="h6" gutterBottom>
          Páginas Mais Visualizadas
        </Typography>
        <Card variant="outlined">
          <CardContent>
            <Grid container spacing={2}>
              {funnelData.processedTopPages && funnelData.processedTopPages.length > 0 ? (
                <Grid item xs={12}>
                  <Box sx={{ height: 300, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Página</th>
                          <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Visualizações</th>
                          <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Usuários</th>
                          <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Tempo Médio (seg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {funnelData.processedTopPages.map((page, index) => (
                          <tr key={index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                              {page.pagePath}
                            </td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                              {page.views.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                              {page.users.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                              {page.avgTime.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Grid>
              ) : funnelData.topPages && funnelData.topPages.rows && funnelData.topPages.rows.length > 0 ? (
                <Grid item xs={12}>
                  <Box sx={{ height: 300, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Página</th>
                          <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Visualizações</th>
                          <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Usuários</th>
                          <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Tempo Médio (seg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {funnelData.topPages.rows.map((row, index) => {
                          // Verificar se a linha tem a estrutura esperada
                          if (!row.dimensionValues || row.dimensionValues.length < 1 || 
                              !row.metricValues || row.metricValues.length < 3) {
                            console.warn('Linha com estrutura inválida:', row);
                            return null;
                          }
                        
                          const pagePath = row.dimensionValues[0].value;
                          const views = parseInt(row.metricValues[0].value);
                          const users = parseInt(row.metricValues[1].value);
                          const avgTime = parseFloat(row.metricValues[2].value);
                          
                          return (
                            <tr key={index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                                {pagePath}
                              </td>
                              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                                {views.toLocaleString()}
                              </td>
                              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                                {users.toLocaleString()}
                              </td>
                              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                                {avgTime.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Box>
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <Alert severity="info">Nenhum dado de páginas disponível para o período selecionado.</Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Dispositivos e Retenção */}
        <Grid container spacing={3}>
          {/* Dispositivos */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Acesso por Dispositivo
                </Typography>
                {funnelData.deviceData && funnelData.deviceData.rows && funnelData.deviceData.rows.length > 0 ? (
                  <div>
                    {/* Conteúdo de dispositivos */}
                  </div>
                ) : (
                  <Alert severity="info">Nenhum dado de dispositivos disponível para o período selecionado.</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Retenção */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Novos vs. Recorrentes
                </Typography>
                {funnelData.retentionData && funnelData.retentionData.rows && funnelData.retentionData.rows.length > 0 ? (
                  <div>
                    {/* Conteúdo de retenção */}
                  </div>
                ) : (
                  <Alert severity="info">Nenhum dado de retenção disponível para o período selecionado.</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Renderizar seção de Fontes de Tráfego
  const renderGaTrafficSourcesSection = () => {
    // Log de diagnóstico
    console.log("Renderizando seção de fontes de tráfego, dados disponíveis:", 
                gaData ? `Sim (sourceData: ${gaData.sourceData ? "Sim" : "Não"}, trafficSources: ${gaData.trafficSources ? "Sim" : "Não"})` : "Não");
                 
    // Verificar dados detalhados para diagnóstico
    if (gaData) {
      console.log("Estrutura completa de dados GA:", {
        hasSourceData: !!gaData.sourceData,
        sourceDataRowCount: gaData.sourceData?.rows ? gaData.sourceData.rows.length : 0,
        hasTrafficSources: !!gaData.trafficSources,
        trafficSourcesCount: gaData.trafficSources ? gaData.trafficSources.length : 0
      });
    }
    
    // Tentar usar trafficSources primeiro (formato novo), depois sourceData (formato API)
    if (!gaData || 
        (!gaData.trafficSources || gaData.trafficSources.length === 0) && 
        (!gaData.sourceData || !gaData.sourceData.rows || gaData.sourceData.rows.length === 0)) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          Dados de fontes de tráfego não disponíveis.
        </Alert>
      );
    }
    
    // Se tivermos trafficSources, usamos esse formato
    if (gaData.trafficSources && gaData.trafficSources.length > 0) {
      return (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Principais Fontes de Tráfego
          </Typography>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ height: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Fonte</th>
                      <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Meio</th>
                      <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Usuários</th>
                      <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Sessões</th>
                      <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Conversões</th>
                      <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Taxa de Engajamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaData.trafficSources.map((source, index) => (
                      <tr key={index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {source.source || 'Direto'}
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {source.medium || 'Não definido'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {source.users ? source.users.toLocaleString() : '0'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {source.sessions ? source.sessions.toLocaleString() : '0'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {source.conversions ? source.conversions.toLocaleString() : '0'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {((source.engagementRate || 0) * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>
        </Box>
      );
    }
    
    // Caso contrário, usar o formato da API (sourceData.rows)
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Principais Fontes de Tráfego
        </Typography>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ height: 300, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Fonte</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Meio</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Usuários</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Sessões</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Conversões</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Taxa de Engajamento</th>
                  </tr>
                </thead>
                <tbody>
                  {gaData.sourceData.rows.map((row, index) => {
                    // Verificar se a linha tem a estrutura esperada para o novo formato
                    if (!row.dimensionValues || !row.dimensionValues[0] || 
                        !row.metricValues || !row.metricValues[0]) {
                      console.warn('Linha com estrutura inválida:', row);
                      return null;
                    }
                    
                    // Extrair valores com a nova estrutura (apenas canal e sessões)
                    const channel = row.dimensionValues[0].value || 'Não definido';
                    const sessions = parseInt(row.metricValues[0].value) || 0;
                    const users = Math.round(sessions * 0.8); // Estimativa baseada em sessões
                    
                    // Determinar a fonte com base no canal
                    let source = 'Outros';
                    let medium = 'Orgânico';
                    
                    if (channel.toLowerCase().includes('organic')) {
                      source = 'Pesquisa Orgânica';
                    } else if (channel.toLowerCase().includes('direct')) {
                      source = 'Tráfego Direto';
                    } else if (channel.toLowerCase().includes('referral')) {
                      source = 'Sites de Referência';
                    } else if (channel.toLowerCase().includes('social')) {
                      source = 'Mídias Sociais';
                    } else if (channel.toLowerCase().includes('paid') || 
                               channel.toLowerCase().includes('cpc') || 
                               channel.toLowerCase().includes('display')) {
                      source = 'Anúncios Pagos';
                      medium = 'Pago';
                    } else if (channel.toLowerCase().includes('email')) {
                      source = 'Email Marketing';
                    }
                    
                    return (
                      <tr key={index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {source}
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {channel} ({medium})
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {users.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {sessions.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {0} {/* Não temos dados de conversão */}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                          {0}% {/* Não temos dados de taxa de engajamento */}
                        </td>
                      </tr>
                    );
                  }).filter(item => item !== null)}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Renderizar componentes do Google Analytics
  const renderGoogleAnalyticsContent = () => {
    if (!gaConnected) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>
            Conecte-se ao Google Analytics para ver os dados
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            component={Link} 
            to="/connect-google-analytics"
            sx={{ mt: 2 }}
          >
            Conectar Google Analytics
          </Button>
        </Box>
      );
    }
    
    if (loadingGa) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Carregando dados do Google Analytics...
          </Typography>
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
    
    if (!gaData) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Selecione uma propriedade e clique em "Buscar Dados" para visualizar métricas.
          </Alert>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Propriedade Google Analytics:
            </Typography>
            
            {gaProperties.length > 0 ? (
              <TextField
                select
                label="Propriedade"
                value={selectedGaProperty}
                onChange={(e) => setSelectedGaProperty(e.target.value)}
                variant="outlined"
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              >
                {gaProperties.map((property) => (
                  <MenuItem key={property.property_id} value={property.property_id}>
                    {property.property_name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Alert severity="warning">
                Nenhuma propriedade encontrada. Verifique sua conexão com o Google Analytics.
              </Alert>
            )}
            
            <Button 
              variant="contained" 
              color="primary"
              disabled={!selectedGaProperty}
              onClick={() => fetchGoogleAnalyticsData()}
              startIcon={<RefreshIcon />}
            >
              Buscar Dados
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                sx={{ ml: 1 }}
                disabled={!selectedGaProperty}
                onClick={() => {
                  // Importar e executar o diagnóstico dinamicamente
                  import("../utils/diagnosticUtils").then(module => {
                    module.checkGoogleAnalyticsConfig();
                    if (selectedGaProperty) {
                      module.testGoogleAnalyticsAPI(googleAnalyticsService, selectedGaProperty);
                    }
                  });
                }}
                startIcon={<SettingsIcon />}
              >
                Diagnóstico
              </Button>
            </Button>
          </Box>
        </Box>
      );
    }
    
    // Criar dados para o gráfico
    const usersChartData = createGaUsersChartData();
    
    return (
      <Box>
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Tabs 
                value={insightTab} 
                onChange={(e, newValue) => setInsightTab(newValue)}
                aria-label="insights tabs"
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Visão Geral" />
                <Tab label="Fontes de Tráfego" />
                <Tab label="Análise de Páginas" />
              </Tabs>
            </Grid>
            
            {insightTab === 0 && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Visão Geral de Desempenho
                  </Typography>
                  
                  {usersChartData && (
                    <Box className="chart-container" sx={{ height: 300, width: '100%', maxHeight: 400, position: 'relative' }}>
                      <Line 
                        data={usersChartData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          aspectRatio: 2,
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
                            }
                          },
                          plugins: {
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  let label = context.dataset.label || '';
                                  let value = context.raw || 0;
                                  return `${label}: ${value.toLocaleString()}`;
                                }
                              }
                            },
                            title: {
                              display: true,
                              text: 'Desempenho ao Longo do Tempo'
                            },
                            legend: {
                              position: 'bottom'
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Total de Usuários Ativos
                      </Typography>
                      <Typography variant="h4">
                        {calculateGATotalUsers().toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Sessões
                      </Typography>
                      <Typography variant="h4">
                        {calculateGATotalSessions().toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Visualizações de Página
                      </Typography>
                      <Typography variant="h4">
                        {calculateGATotalPageViews().toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Taxa de Engajamento Média
                      </Typography>
                      <Typography variant="h4">
                        {calculateGAAvgEngagementRate().toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                {gaData.engagementData && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ mt: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Métricas de Engajamento Detalhadas
                        </Typography>
                        <Box sx={{ height: 300, overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Data</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Sessões Engajadas</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Taxa de Engajamento</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Duração Média (s)</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Páginas/Sessão</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gaData.engagementData.rows.map((row, index) => {
                                const dateStr = row.dimensionValues[0].value;
                                const date = `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}`;
                                const engagedSessions = parseInt(row.metricValues[0].value);
                                const engagementRate = parseFloat(row.metricValues[1].value) * 100;
                                const avgDuration = parseFloat(row.metricValues[2].value);
                                const pagesPerSession = parseFloat(row.metricValues[3].value);
                                
                                return (
                                  <tr key={index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{date}</td>
                                    <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>{engagedSessions.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>{engagementRate.toFixed(1)}%</td>
                                    <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>{avgDuration.toFixed(1)}</td>
                                    <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>{pagesPerSession.toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            )}
            
            {insightTab === 1 && renderGaTrafficSourcesSection()}
            
            {insightTab === 2 && renderFunnelSection()}
          </Grid>
        </Paper>
      </Box>
    );
  };

  // Calcular métricas totais do Google Analytics
  const calculateGATotalUsers = () => {
    if (!gaData || !gaData.rows) return 0;
    
    const metricIndex = gaData.metricHeaders.findIndex(h => h.name === 'activeUsers');
    if (metricIndex === -1) return 0;
    
    // Agrupar por dispositivo para evitar contagem duplicada
    const deviceIndex = gaData.dimensionHeaders.findIndex(h => h.name === 'deviceCategory');
    
    if (deviceIndex !== -1) {
      // Criar um conjunto de dispositivos únicos
      const devices = new Set();
      gaData.rows.forEach(row => {
        devices.add(row.dimensionValues[deviceIndex].value);
      });
      
      // Somar usuários para cada dispositivo único
      let total = 0;
      devices.forEach(device => {
        const deviceRows = gaData.rows.filter(row => 
          row.dimensionValues[deviceIndex].value === device
        );
        
        // Pegar o valor mais recente para este dispositivo
        if (deviceRows.length > 0) {
          total += parseInt(deviceRows[0].metricValues[metricIndex].value);
        }
      });
      
      return total;
    } else {
      // Se não tiver a dimensão de dispositivo, somar todos os valores
      return gaData.rows.reduce((sum, row) => {
        return sum + parseInt(row.metricValues[metricIndex].value);
      }, 0);
    }
  };
  
  const calculateGATotalSessions = () => {
    if (!gaData || !gaData.rows) return 0;
    
    const metricIndex = gaData.metricHeaders.findIndex(h => h.name === 'sessions');
    if (metricIndex === -1) return 0;
    
    return gaData.rows.reduce((sum, row) => {
      return sum + parseInt(row.metricValues[metricIndex].value);
    }, 0);
  };
  
  const calculateGATotalPageViews = () => {
    if (!gaData || !gaData.rows) return 0;
    
    const metricIndex = gaData.metricHeaders.findIndex(h => h.name === 'screenPageViews');
    if (metricIndex === -1) return 0;
    
    return gaData.rows.reduce((sum, row) => {
      return sum + parseInt(row.metricValues[metricIndex].value);
    }, 0);
  };
  
  const calculateGAAvgEngagementRate = () => {
    if (!gaData || !gaData.rows) return 0;
    
    const metricIndex = gaData.metricHeaders.findIndex(h => h.name === 'engagementRate');
    if (metricIndex === -1) return 0;
    
    // Calcular média de taxa de engajamento
    let total = 0;
    gaData.rows.forEach(row => {
      total += parseFloat(row.metricValues[metricIndex].value);
    });
    
    return (total / gaData.rows.length) * 100;
  };

  // Renderizar seção de Meta Ads
  const renderMetaAdsSection = () => {
    if (loading) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Carregando dados do Meta Ads...
          </Typography>
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box>
          {typeof error === 'string' ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          ) : (
            error
          )}
        </Box>
      );
    }
    
    if (!overviewData) {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Selecione uma conta do Meta Ads para visualizar métricas de desempenho.
          </Alert>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Conta de Anúncios:
            </Typography>
            
            {adAccounts.length > 0 ? (
              <TextField
                select
                label="Conta"
                value={selectedAccount}
                onChange={(e) => {
                  setSelectedAccount(e.target.value);
                  setMetaAccountId(e.target.value);
                  setShowEnhancedMetaAnalytics(true);
                  // fetchOverviewData will be triggered by the useEffect hook
                }}
                variant="outlined"
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              >
                {adAccounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Alert severity="warning">
                Nenhuma conta de anúncios encontrada. Verifique sua conexão com o Meta Ads.
              </Alert>
            )}
            
            <Button 
              variant="contained" 
              color="primary"
              href="/connect-meta"
              sx={{ mt: 2 }}
            >
              Conectar Meta Ads
            </Button>
          </Box>
        </Box>
      );
    }
    
    // Dados para os gráficos
    const dailySpendData = createDailySpendChartData();
    const performanceData = createPerformanceChartData();
    const spendDistributionData = createSpendDistributionChartData();

    return (
      <Box>
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Métricas de Desempenho - Meta Ads
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Content for the Grid */}
              </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ height: '100%', bgcolor: 'rgba(54, 162, 235, 0.1)' }}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Gasto Total
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(overviewData.totalSpend || 0)}
                      </Typography>
                      {overviewData.spendComparison && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          {overviewData.spendComparison > 0 ? (
                            <ArrowUpwardIcon color="success" fontSize="small" />
                          ) : (
                            <ArrowDownwardIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="body2" color={overviewData.spendComparison > 0 ? 'success.main' : 'error.main'}>
                            {Math.abs(overviewData.spendComparison).toFixed(1)}% vs período anterior
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ height: '100%', bgcolor: 'rgba(75, 192, 192, 0.1)' }}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Impressões
                      </Typography>
                      <Typography variant="h4">
                        {formatNumber(overviewData.totalImpressions || 0)}
                      </Typography>
                      {overviewData.impressionsComparison && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          {overviewData.impressionsComparison > 0 ? (
                            <ArrowUpwardIcon color="success" fontSize="small" />
                          ) : (
                            <ArrowDownwardIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="body2" color={overviewData.impressionsComparison > 0 ? 'success.main' : 'error.main'}>
                            {Math.abs(overviewData.impressionsComparison).toFixed(1)}% vs período anterior
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ height: '100%', bgcolor: 'rgba(255, 99, 132, 0.1)' }}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Cliques
                      </Typography>
                      <Typography variant="h4">
                        {formatNumber(overviewData.totalClicks || 0)}
                      </Typography>
                      {overviewData.clicksComparison && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          {overviewData.clicksComparison > 0 ? (
                            <ArrowUpwardIcon color="success" fontSize="small" />
                          ) : (
                            <ArrowDownwardIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="body2" color={overviewData.clicksComparison > 0 ? 'success.main' : 'error.main'}>
                            {Math.abs(overviewData.clicksComparison).toFixed(1)}% vs período anterior
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ height: '100%', bgcolor: 'rgba(153, 102, 255, 0.1)' }}>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        CTR
                      </Typography>
                      <Typography variant="h4">
                        {(overviewData.ctr || 0).toFixed(2)}%
                      </Typography>
                      {overviewData.ctrComparison && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          {overviewData.ctrComparison > 0 ? (
                            <ArrowUpwardIcon color="success" fontSize="small" />
                          ) : (
                            <ArrowDownwardIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="body2" color={overviewData.ctrComparison > 0 ? 'success.main' : 'error.main'}>
                            {Math.abs(overviewData.ctrComparison).toFixed(1)}% vs período anterior
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Gastos Diários
                      </Typography>
                      
                      {dailySpendData ? (
                        <Box className="chart-container" sx={{ height: 300, width: '100%', maxHeight: 400, position: 'relative' }}>
                          <Line 
                            data={dailySpendData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              aspectRatio: 2,
                              animation: {
                                duration: 500,
                              },
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
                        </Box>
                      ) : (
                        <Alert severity="info">Dados não disponíveis</Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Impressões e Cliques
                      </Typography>
                      
                      {performanceData ? (
                        <Box className="chart-container" sx={{ height: 300, width: '100%', maxHeight: 400, position: 'relative' }}>
                          <Line 
                            data={performanceData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              aspectRatio: 2,
                              animation: {
                                duration: 500,
                              },
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
                        </Box>
                      ) : (
                        <Alert severity="info">Dados não disponíveis</Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              {/* Métricas avançadas e tabela de campanhas */}
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Distribuição de Gastos
                      </Typography>
                      
                      {spendDistributionData ? (
                        <Box className="chart-container" sx={{ height: 300, width: '100%', maxHeight: 400, position: 'relative' }}>
                          <Pie 
                            data={spendDistributionData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: true,
                              aspectRatio: 1.5,
                              cutout: '30%',
                              plugins: {
                                legend: {
                                  position: 'right',
                                  labels: {
                                    boxWidth: 15,
                                    padding: 10,
                                    font: {
                                      size: 10
                                    }
                                  }
                                },
                                tooltip: {
                                  callbacks: {
                                    label: function(context) {
                                      const label = context.label || '';
                                      const value = context.raw || 0;
                                      const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                      const percentage = ((value / total) * 100).toFixed(1);
                                      return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                                    }
                                  }
                                }
                              }
                            }}
                          />
                        </Box>
                      ) : (
                        <Alert severity="info">Dados não disponíveis</Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Métricas Avançadas
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Paper variant="outlined" sx={{ p: 2, flexGrow: 1, minWidth: '120px' }}>
                          <Typography variant="body2" color="textSecondary">CPC Médio</Typography>
                          <Typography variant="h6">{formatCurrency(overviewData.cpc || 0)}</Typography>
                        </Paper>
                        
                        <Paper variant="outlined" sx={{ p: 2, flexGrow: 1, minWidth: '120px' }}>
                          <Typography variant="body2" color="textSecondary">Alcance</Typography>
                          <Typography variant="h6">{formatNumber(overviewData.reach || 0)}</Typography>
                        </Paper>
                        
                        <Paper variant="outlined" sx={{ p: 2, flexGrow: 1, minWidth: '120px' }}>
                          <Typography variant="body2" color="textSecondary">Frequência</Typography>
                          <Typography variant="h6">{(overviewData.frequency || 0).toFixed(2)}x</Typography>
                        </Paper>
                        
                        <Paper variant="outlined" sx={{ p: 2, flexGrow: 1, minWidth: '120px' }}>
                          <Typography variant="body2" color="textSecondary">CPM</Typography>
                          <Typography variant="h6">{formatCurrency(overviewData.cpm || 0)}</Typography>
                        </Paper>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Campanhas Ativas
                      </Typography>
                      
                      {overviewData.campaigns && overviewData.campaigns.length > 0 ? (
                        <Box sx={{ height: 350, overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Campanha</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Gasto</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Impressões</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Cliques</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>CTR</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>CPC</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Ranking de Qualidade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {overviewData.campaigns.map((campaign, index) => (
                                <tr key={campaign.id || index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                                  <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{campaign.name}</td>
                                  <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>{formatCurrency(campaign.totalSpend || 0)}</td>
                                  <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>{formatNumber(campaign.impressions || 0)}</td>
                                  <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>{formatNumber(campaign.clicks || 0)}</td>
                                  <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>{((campaign.ctr || 0) * 100).toFixed(2)}%</td>
                                  <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>{formatCurrency(campaign.cpc || 0)}</td>
                                  <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                                    <Box sx={{ 
                                      display: 'inline-block', 
                                      px: 1, 
                                      py: 0.5, 
                                      borderRadius: 1,
                                      bgcolor: getRankingColor(campaign.qualityRanking),
                                      color: 'white'
                                    }}>
                                      {campaign.qualityRanking || 'N/A'}
                                    </Box>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Box>
                      ) : (
                        <Alert severity="info">Nenhuma campanha ativa encontrada</Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
  };

  // Função para formatar números grandes
  const getRankingColor = (ranking) => {
    if (!ranking) return 'grey.500';
    
    switch(ranking.toLowerCase()) {
      case 'above average':
      case 'acima da média':
        return 'success.main';
      case 'average':
      case 'média':
        return 'warning.main';
      case 'below average':
      case 'abaixo da média':
        return 'error.main';
      default:
        return 'grey.500';
    }
  };

  // Desativar todas as animações para gráficos com mais de 100 pontos de dados para melhorar a performance
  const getOptimizedChartOptions = (dataLength) => {
    return {
      dataPoints: dataLength
    };
  };

  // A função local getLineChartOptions agora pode redirecionar para a versão da utilidade
  const getLineChartOptions = (customOptions = {}) => {
    return getLineChartOptions({
      ...customOptions
    });
  };

  useEffect(() => {
    setupChartSizeLimits();
    
    // Configurar MutationObserver para monitorar e ajustar canvases que excedem o tamanho máximo
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const canvases = document.querySelectorAll('canvas');
          canvases.forEach(canvas => {
            const MAX_DIMENSION = 2000;
            if (canvas.width > MAX_DIMENSION || canvas.height > MAX_DIMENSION) {
              console.warn(`Canvas detectado com tamanho excedente: ${canvas.width}x${canvas.height}. Ajustando...`);
              const ratio = canvas.width / canvas.height;
              
              if (canvas.width > MAX_DIMENSION) {
                canvas.width = MAX_DIMENSION;
                canvas.height = Math.min(MAX_DIMENSION, Math.floor(canvas.width / ratio));
              }
              
              if (canvas.height > MAX_DIMENSION) {
                canvas.height = MAX_DIMENSION;
                canvas.width = Math.min(MAX_DIMENSION, Math.floor(canvas.height * ratio));
              }
              
              // Reajustar contêiner pai
              const parent = canvas.parentElement;
              if (parent) {
                parent.style.maxWidth = `${MAX_DIMENSION}px`;
                parent.style.maxHeight = `${MAX_DIMENSION}px`;
              }
            }
          });
        }
      }
    });
    
    // Observar todo o dashboard para detectar novos canvases
    observer.observe(document.getElementById('dashboard-container') || document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup observer on component unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }} id="dashboard-container">
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
            sx={{ mt: 2 }}
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
                              <Box className="chart-container" sx={{ height: 250, width: '100%', maxHeight: 300, position: 'relative' }}>
                                <Line 
                                  data={createDailySpendChartData()} 
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    aspectRatio: 2,
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
                              </Box>
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
                              <Box className="chart-container" sx={{ height: 250, width: '100%', maxHeight: 300, position: 'relative' }}>
                                <Pie 
                                  data={createSpendDistributionChartData()} 
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    aspectRatio: 1.5,
                                    plugins: {
                                    tooltip: {
                                      callbacks: {
                                        label: function(context) {
                                          const label = context.label || '';
                                          const value = context.raw || 0;
                                          const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                          const percentage = ((value / total) * 100).toFixed(1);
                                          return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                                        }
                                      }
                                    },
                                    legend: {
                                      position: 'bottom',
                                      labels: {
                                        boxWidth: 12,
                                        padding: 15
                                      }
                                    }
                                  }
                                }}
                              />
                              </Box>
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
                              <Box className="chart-container" sx={{ height: 250, width: '100%', maxHeight: 300, position: 'relative' }}>
                                <Line 
                                  data={createPerformanceChartData()} 
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    aspectRatio: 2,
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
                              </Box>
                            )}
                          </Paper>
                        </Grid>
                        
                        {/* Exibir seção do Google Analytics na aba principal se conectado */}
                        {gaConnected && gaData && (
                          <Grid item xs={12}>
                            {renderGoogleAnalyticsContent()}
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
                        {renderGoogleAnalyticsContent()}
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