import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tabs,
  Tab,
  Chip,
  Divider,
  IconButton,
  Snackbar,
  Alert,
  Card,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ptBR } from 'date-fns/locale';
import { format, subDays, parseISO, isValid } from 'date-fns';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import metaReportService from '../services/metaReportService';

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Formatador de valores monetários
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Componente de Relatórios do Meta Ads
 */
const MetaReports = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [insights, setInsights] = useState([]);
  const [selectedDate, setSelectedDate] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [showFilters, setShowFilters] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    reach: 0
  });
  const [tableData, setTableData] = useState([]);
  const [downloadingData, setDownloadingData] = useState(false);

  // Buscar dados da conta ao montar o componente
  useEffect(() => {
    if (!accountId) {
      navigate('/meta-accounts');
      return;
    }
    
    fetchAccountInfo();
    fetchCampaigns();
  }, [accountId, navigate]);

  // Buscar insights quando datas ou campanha mudar
  useEffect(() => {
    if (campaigns.length > 0) {
      fetchInsights();
    }
  }, [selectedDate, selectedCampaign, campaigns]);

  /**
   * Buscar informações da conta
   */
  const fetchAccountInfo = async () => {
    try {
      const { account } = await metaReportService.getAccountDetails(accountId);
      setAccountInfo(account);
    } catch (err) {
      console.error('Erro ao buscar informações da conta:', err);
      showSnackbar('Erro ao buscar informações da conta.', 'error');
    }
  };

  /**
   * Buscar campanhas da conta
   */
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { campaigns: campaignList } = await metaReportService.getCampaigns(accountId);
      setCampaigns(campaignList || []);
    } catch (err) {
      console.error('Erro ao buscar campanhas:', err);
      showSnackbar('Erro ao buscar campanhas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buscar insights de performance
   */
  const fetchInsights = async () => {
    try {
      setLoading(true);
      const startDateStr = format(selectedDate.startDate, 'yyyy-MM-dd');
      const endDateStr = format(selectedDate.endDate, 'yyyy-MM-dd');
      const campaignId = selectedCampaign !== 'all' ? selectedCampaign : null;
      
      const { insights: insightData } = await metaReportService.getAccountInsights(
        accountId, 
        startDateStr, 
        endDateStr,
        campaignId
      );
      
      // Processar e formatar dados para visualização
      const formattedInsights = processInsightsData(insightData || []);
      setInsights(formattedInsights);
      
      // Preparar dados para tabela
      prepareTableData(insightData || []);
      
      // Calcular métricas de performance
      calculatePerformanceMetrics(insightData || []);
    } catch (err) {
      console.error('Erro ao buscar insights:', err);
      showSnackbar('Erro ao buscar dados de performance.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Processa dados de insights para uso nos gráficos
   */
  const processInsightsData = (data) => {
    if (!data || data.length === 0) return [];
    
    // Organizar dados por data
    return data.map(item => ({
      date: format(new Date(item.date), 'dd/MM'),
      impressoes: parseInt(item.impressions) || 0,
      cliques: parseInt(item.clicks) || 0,
      ctr: parseFloat(item.ctr) || 0,
      custo: parseFloat(item.spend) || 0,
      cpc: parseFloat(item.cpc) || 0,
      alcance: parseInt(item.reach) || 0,
      campanha: item.campaign_name || 'Desconhecida',
      campaign_id: item.campaign_id || ''
    }));
  };

  /**
   * Prepara dados para a tabela de detalhes
   */
  const prepareTableData = (data) => {
    if (!data || data.length === 0) {
      setTableData([]);
      return;
    }
    
    // Agrupar dados por campanha
    const campaignData = {};
    
    data.forEach(item => {
      const campaignId = item.campaign_id || 'unknown';
      const campaignName = item.campaign_name || 'Desconhecida';
      
      if (!campaignData[campaignId]) {
        campaignData[campaignId] = {
          campaign_id: campaignId,
          campaign_name: campaignName,
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          days: 0
        };
      }
      
      // Somar métricas
      campaignData[campaignId].impressions += parseInt(item.impressions) || 0;
      campaignData[campaignId].clicks += parseInt(item.clicks) || 0;
      campaignData[campaignId].spend += parseFloat(item.spend) || 0;
      campaignData[campaignId].reach += parseInt(item.reach) || 0;
      campaignData[campaignId].days += 1;
    });
    
    // Converter para array e calcular métricas derivadas
    const tableRows = Object.values(campaignData).map(campaign => ({
      ...campaign,
      ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
      cpc: campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0,
      avg_daily_spend: campaign.days > 0 ? campaign.spend / campaign.days : 0
    }));
    
    setTableData(tableRows);
  };

  /**
   * Calcular métricas de performance
   */
  const calculatePerformanceMetrics = (data) => {
    if (!data || data.length === 0) {
      setPerformanceMetrics({
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        reach: 0
      });
      return;
    }
    
    // Somar métricas de todos os dias
    const totals = data.reduce((acc, item) => {
      return {
        spend: acc.spend + (parseFloat(item.spend) || 0),
        impressions: acc.impressions + (parseInt(item.impressions) || 0),
        clicks: acc.clicks + (parseInt(item.clicks) || 0),
        reach: acc.reach + (parseInt(item.reach) || 0)
      };
    }, { spend: 0, impressions: 0, clicks: 0, reach: 0 });
    
    // Calcular métricas derivadas
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    
    setPerformanceMetrics({
      ...totals,
      ctr,
      cpc
    });
  };

  /**
   * Atualizar datas selecionadas
   */
  const handleDateChange = (type, newDate) => {
    setSelectedDate(prev => ({
      ...prev,
      [type]: newDate
    }));
  };

  /**
   * Atualizar campanha selecionada
   */
  const handleCampaignChange = (event) => {
    setSelectedCampaign(event.target.value);
  };

  /**
   * Alternar visualização de filtros
   */
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  /**
   * Atualizar aba ativa
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  /**
   * Exibir mensagem na snackbar
   */
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  /**
   * Fechar snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  /**
   * Formatar valores de CTR
   */
  const formatCTR = (value) => {
    return `${value.toFixed(2)}%`;
  };

  /**
   * Exportar dados para CSV
   */
  const exportToCSV = async () => {
    try {
      setDownloadingData(true);
      
      // Coletar dados
      const startDateStr = format(selectedDate.startDate, 'yyyy-MM-dd');
      const endDateStr = format(selectedDate.endDate, 'yyyy-MM-dd');
      const campaignId = selectedCampaign !== 'all' ? selectedCampaign : null;
      
      const { insights: exportData } = await metaReportService.getAccountInsights(
        accountId, 
        startDateStr, 
        endDateStr,
        campaignId
      );
      
      if (!exportData || exportData.length === 0) {
        showSnackbar('Não há dados para exportar.', 'warning');
        setDownloadingData(false);
        return;
      }
      
      // Criar cabeçalho do CSV
      const headers = [
        'Data',
        'ID da Campanha',
        'Nome da Campanha',
        'Impressões',
        'Cliques',
        'CTR (%)',
        'Custo',
        'CPC',
        'Alcance',
        'Frequência'
      ].join(',');
      
      // Formatar dados para CSV
      const rows = exportData.map(item => [
        item.date,
        item.campaign_id || '',
        item.campaign_name || 'Desconhecida',
        item.impressions || 0,
        item.clicks || 0,
        item.ctr ? parseFloat(item.ctr).toFixed(2) : '0.00',
        item.spend || 0,
        item.cpc ? parseFloat(item.cpc).toFixed(2) : '0.00',
        item.reach || 0,
        item.frequency ? parseFloat(item.frequency).toFixed(2) : '0.00'
      ].join(','));
      
      // Combinar cabeçalho e linhas
      const csvContent = [headers, ...rows].join('\n');
      
      // Criar blob e link para download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `meta-ads-report-${startDateStr}-to-${endDateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSnackbar('Relatório exportado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      showSnackbar('Erro ao exportar relatório.', 'error');
    } finally {
      setDownloadingData(false);
    }
  };

  /**
   * Renderizar métricas de performance
   */
  const renderPerformanceMetrics = () => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Gastos
              </Typography>
              <Typography variant="h6">
                {formatCurrency(performanceMetrics.spend)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Impressões
              </Typography>
              <Typography variant="h6">
                {performanceMetrics.impressions.toLocaleString('pt-BR')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Cliques
              </Typography>
              <Typography variant="h6">
                {performanceMetrics.clicks.toLocaleString('pt-BR')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                CTR
              </Typography>
              <Typography variant="h6">
                {formatCTR(performanceMetrics.ctr)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                CPC
              </Typography>
              <Typography variant="h6">
                {formatCurrency(performanceMetrics.cpc)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Alcance
              </Typography>
              <Typography variant="h6">
                {performanceMetrics.reach.toLocaleString('pt-BR')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  /**
   * Renderizar gráfico de linha de tendências
   */
  const renderTrendChart = () => {
    if (insights.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            Não há dados para exibir no período selecionado.
          </Typography>
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={insights}
          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="impressoes" 
            stroke="#8884d8" 
            name="Impressões"
            activeDot={{ r: 8 }} 
          />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="cliques" 
            stroke="#82ca9d" 
            name="Cliques" 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="custo" 
            stroke="#ff7300" 
            name="Custo" 
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  /**
   * Renderizar gráfico de barras de comparação
   */
  const renderComparisonChart = () => {
    if (tableData.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            Não há dados de campanhas para comparar no período selecionado.
          </Typography>
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={tableData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="campaign_name" 
            angle={-45} 
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip formatter={(value, name) => {
            if (name === 'spend' || name === 'avg_daily_spend') {
              return [formatCurrency(value), name === 'spend' ? 'Custo Total' : 'Custo Diário Médio'];
            }
            return [value, name];
          }} />
          <Legend />
          <Bar dataKey="impressions" name="Impressões" fill="#8884d8" />
          <Bar dataKey="clicks" name="Cliques" fill="#82ca9d" />
          <Bar dataKey="spend" name="Custo Total" fill="#ff7300" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /**
   * Renderizar tabela de dados detalhados
   */
  const renderDataTable = () => {
    if (tableData.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            Não há dados para exibir no período selecionado.
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table aria-label="tabela de dados de campanhas">
          <TableHead>
            <TableRow>
              <TableCell>Campanha</TableCell>
              <TableCell align="right">Impressões</TableCell>
              <TableCell align="right">Cliques</TableCell>
              <TableCell align="right">CTR (%)</TableCell>
              <TableCell align="right">Custo Total</TableCell>
              <TableCell align="right">CPC</TableCell>
              <TableCell align="right">Alcance</TableCell>
              <TableCell align="right">Custo Diário Médio</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.campaign_id || Math.random()}>
                <TableCell component="th" scope="row">
                  {row.campaign_name}
                </TableCell>
                <TableCell align="right">{row.impressions.toLocaleString('pt-BR')}</TableCell>
                <TableCell align="right">{row.clicks.toLocaleString('pt-BR')}</TableCell>
                <TableCell align="right">{formatCTR(row.ctr)}</TableCell>
                <TableCell align="right">{formatCurrency(row.spend)}</TableCell>
                <TableCell align="right">{formatCurrency(row.cpc)}</TableCell>
                <TableCell align="right">{row.reach.toLocaleString('pt-BR')}</TableCell>
                <TableCell align="right">{formatCurrency(row.avg_daily_spend)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <IconButton 
          color="primary" 
          aria-label="voltar" 
          onClick={() => navigate('/meta-accounts')}
          sx={{ mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          Relatórios do Meta Ads
        </Typography>
      </Box>

      {/* Informações da conta */}
      {accountInfo && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {accountInfo.name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            ID da Conta: {accountInfo.account_id}
          </Typography>
          {accountInfo.business_name && (
            <Typography variant="body2" color="textSecondary">
              Empresa: {accountInfo.business_name}
            </Typography>
          )}
          {accountInfo.currency && (
            <Typography variant="body2" color="textSecondary">
              Moeda: {accountInfo.currency}
            </Typography>
          )}
        </Paper>
      )}

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Filtros
            <IconButton 
              size="small" 
              onClick={toggleFilters}
              sx={{ ml: 1 }}
            >
              <FilterListIcon />
            </IconButton>
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={fetchInsights}
              sx={{ mr: 2 }}
            >
              Atualizar
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              disabled={downloadingData || insights.length === 0}
            >
              {downloadingData ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </Box>
        </Box>

        {(showFilters || campaigns.length === 0) && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Inicial"
                  value={selectedDate.startDate}
                  onChange={(newDate) => handleDateChange('startDate', newDate)}
                  format="dd/MM/yyyy"
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Final"
                  value={selectedDate.endDate}
                  onChange={(newDate) => handleDateChange('endDate', newDate)}
                  format="dd/MM/yyyy"
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="campaign-select-label">Campanha</InputLabel>
                <Select
                  labelId="campaign-select-label"
                  id="campaign-select"
                  value={selectedCampaign}
                  label="Campanha"
                  onChange={handleCampaignChange}
                >
                  <MenuItem value="all">Todas as Campanhas</MenuItem>
                  {campaigns.map((campaign) => (
                    <MenuItem 
                      key={campaign.id} 
                      value={campaign.id}
                    >
                      {campaign.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Estado de carregamento */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Métricas de performance */}
          <Box sx={{ mb: 4 }}>
            {renderPerformanceMetrics()}
          </Box>

          {/* Abas de visualização */}
          <Paper sx={{ mb: 4 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              centered
            >
              <Tab label="Tendências" />
              <Tab label="Comparação" />
              <Tab label="Dados" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* Conteúdo da aba */}
              {activeTab === 0 && renderTrendChart()}
              {activeTab === 1 && renderComparisonChart()}
              {activeTab === 2 && renderDataTable()}
            </Box>
          </Paper>
        </>
      )}

      {/* Snackbar para mensagens */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MetaReports;
