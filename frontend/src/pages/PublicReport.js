import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { PictureAsPdf, Lock, Error, GetApp } from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * Página para visualização de relatórios públicos compartilhados
 */
const PublicReport = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  useEffect(() => {
    fetchReportData();
  }, [shareId]);
  
  /**
   * Busca os dados do relatório
   * @param {string} pwd - Senha opcional para relatórios protegidos
   */
  const fetchReportData = async (pwd = null) => {
    setLoading(true);
    try {
      // Verificar se é um ID simulado (começa com 'sim-')
      if (shareId.startsWith('sim-')) {
        console.log('Detectado relatório simulado com ID:', shareId);
        
        // Buscar do localStorage
        const simulatedLinks = JSON.parse(localStorage.getItem('simulatedPublicLinks') || '[]');
        const reportLink = simulatedLinks.find(link => link.shareId === shareId);
        
        if (!reportLink) {
          throw new Error('Relatório simulado não encontrado. O link pode ter expirado ou ser inválido.');
        }
        
        // Verificar senha se necessário
        if (reportLink.options.requirePassword) {
          if (!pwd) {
            setPasswordRequired(true);
            setLoading(false);
            return;
          }
          
          if (pwd !== reportLink.options.password) {
            setPasswordError(true);
            setLoading(false);
            return;
          }
        }
        
        // Verificar expiração
        const expirationDate = new Date(reportLink.expiresAt);
        if (expirationDate < new Date()) {
          throw new Error('Este link de relatório expirou.');
        }
        
        setReportData({
          ...reportLink.reportData,
          isSimulated: true,
          allowDownload: reportLink.options.allowDownload
        });
        
        setLoading(false);
        return;
      }
      
      // Comportamento normal para relatórios não simulados
      const response = await axios.get(`${API_URL}/reports/public/${shareId}`, {
        params: pwd ? { password: pwd } : {}
      });
      
      setReportData(response.data);
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      
      // Se for um erro de senha
      if (error.response && error.response.status === 401) {
        setPasswordRequired(true);
        setPasswordError(true);
      } else {
        setError(error.response?.data?.message || error.message || 'Erro ao carregar o relatório');
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Submete a senha para acessar o relatório
   */
  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      setPasswordError(true);
      return;
    }
    
    fetchReportData(password);
  };
  
  /**
   * Baixa o relatório em PDF
   */
  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      
      // Verificar se é um relatório simulado
      if (reportData.isSimulated) {
        // Para relatórios simulados, criamos um arquivo JSON como no ReportManager
        const jsonData = JSON.stringify(reportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Criar um link e simular o clique para download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportData.title || 'relatorio-simulado'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setLoading(false);
        return;
      }
      
      // Para relatórios normais, buscar da API
      const response = await axios.get(`${API_URL}/reports/public/${shareId}/download`, {
        responseType: 'blob',
        params: passwordRequired ? { password } : {}
      });
      
      // Criar URL do blob e link para download
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportData.title || 'relatorio'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      setError('Não foi possível baixar o relatório. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Renderiza o conteúdo do relatório
   */
  const renderReportContent = () => {
    if (!reportData) return null;
    
    const { title, date, type, data } = reportData;
    
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" gutterBottom>{title}</Typography>
          {reportData.allowDownload && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<GetApp />}
              onClick={handleDownloadPDF}
            >
              Download {reportData.isSimulated ? 'JSON' : 'PDF'}
            </Button>
          )}
        </Box>
        
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          Relatório gerado em: {new Date(date).toLocaleString()}
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Box mt={4}>
          {type === 'meta-ads' && renderMetaAdsReport(data)}
          {type === 'google-analytics' && renderGoogleAnalyticsReport(data)}
          {type === 'combined' && renderCombinedReport(data)}
          {!type && <Alert severity="warning">Tipo de relatório desconhecido</Alert>}
        </Box>
      </Box>
    );
  };
  
  /**
   * Renderiza relatório do Meta Ads
   */
  const renderMetaAdsReport = (data) => {
    if (!data || !data.summary) {
      return <Alert severity="warning">Dados insuficientes para exibir o relatório</Alert>;
    }
    
    const { summary, insights } = data;
    
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Relatório Meta Ads</Typography>
        
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Resumo de Performance</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Impressões</Typography>
                <Typography variant="h5">{summary.impressions?.toLocaleString() || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Cliques</Typography>
                <Typography variant="h5">{summary.clicks?.toLocaleString() || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">CTR</Typography>
                <Typography variant="h5">{summary.ctr?.toFixed(2) || 0}%</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Custo</Typography>
                <Typography variant="h5">R$ {summary.spend?.toLocaleString() || 0}</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        {data.audienceData && (
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>Dados de Audiência</Typography>
            <Typography variant="body1">
              Os dados detalhados de audiência estão disponíveis no PDF.
            </Typography>
          </Paper>
        )}
        
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Métricas Adicionais</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">CPC Médio</Typography>
                <Typography variant="h6">R$ {summary.cpc?.toFixed(2) || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Conversões</Typography>
                <Typography variant="h6">{summary.conversions?.toLocaleString() || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Taxa de Conversão</Typography>
                <Typography variant="h6">{summary.conversion_rate?.toFixed(2) || 0}%</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };
  
  /**
   * Renderiza relatório do Google Analytics
   */
  const renderGoogleAnalyticsReport = (data) => {
    if (!data || !data.summary) {
      return <Alert severity="warning">Dados insuficientes para exibir o relatório</Alert>;
    }
    
    const { summary } = data;
    
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Relatório Google Analytics</Typography>
        
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Resumo de Tráfego</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Usuários</Typography>
                <Typography variant="h5">{summary.users?.toLocaleString() || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Sessões</Typography>
                <Typography variant="h5">{summary.sessions?.toLocaleString() || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Tempo Médio</Typography>
                <Typography variant="h5">{summary.avgSessionDuration || '0:00'}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Taxa de Rejeição</Typography>
                <Typography variant="h5">{summary.bounceRate?.toFixed(2) || 0}%</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        <Typography variant="body1" sx={{ mt: 4, mb: 2 }}>
          Para visualizar os gráficos detalhados e análises completas, faça o download do relatório em PDF.
        </Typography>
      </Box>
    );
  };
  
  /**
   * Renderiza relatório combinado
   */
  const renderCombinedReport = (data) => {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Relatório Combinado</Typography>
        
        {data.metaAds && (
          <Box mb={5}>
            <Typography variant="h6" gutterBottom>Meta Ads</Typography>
            {renderMetaAdsReport(data.metaAds)}
          </Box>
        )}
        
        {data.googleAnalytics && (
          <Box>
            <Typography variant="h6" gutterBottom>Google Analytics</Typography>
            {renderGoogleAnalyticsReport(data.googleAnalytics)}
          </Box>
        )}
      </Box>
    );
  };
  
  // Dialog para senha
  const renderPasswordDialog = () => {
    return (
      <Dialog open={passwordRequired} onClose={() => navigate('/')} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Lock sx={{ mr: 1 }} />
            Relatório Protegido
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Este relatório está protegido por senha. Por favor, digite a senha para acessá-lo.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Senha"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordError}
            helperText={passwordError ? "Senha incorreta. Tente novamente." : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/')} color="primary">
            Cancelar
          </Button>
          <Button onClick={handlePasswordSubmit} color="primary" variant="contained">
            Acessar
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  // Conteúdo principal
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={5}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Carregando relatório...
            </Typography>
          </Box>
        ) : error ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={5}>
            <Error color="error" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              {error}
            </Typography>
            <Button variant="contained" color="primary" onClick={() => navigate('/')} sx={{ mt: 3 }}>
              Voltar para a página inicial
            </Button>
          </Box>
        ) : (
          renderReportContent()
        )}
      </Paper>
      
      {renderPasswordDialog()}
    </Container>
  );
};

export default PublicReport;
