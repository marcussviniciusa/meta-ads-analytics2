import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Container, Paper, Typography, Box, Button, 
  CircularProgress, Alert, Stepper, Step, StepLabel,
  List, ListItem, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ConnectMeta = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [metaAuthUrl, setMetaAuthUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [adAccounts, setAdAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Etapas do processo de conexão
  const steps = [
    'Autenticação',
    'Permissões de Anúncios',
    'Conexão Completa'
  ];

  // Verificar status da conexão ao carregar a página
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Verifica se há um código de autorização na URL (callback do Meta Ads)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      console.log('Authorization code received:', { code, state });
      handleMetaAuthCallback(code, state);
    }
  }, [location]);


  // Verifica status atual da conexão
  const checkConnectionStatus = async () => {
    try {
      const response = await api.get('/integrations');
      const metaIntegration = response.data.find(
        integration => integration.name === 'meta_ads'
      );
      
      if (metaIntegration && metaIntegration.is_connected) {
        setConnected(true);
        setActiveStep(2);
        fetchAdAccounts();
      } else {
        setConnected(false);
      }
    } catch (err) {
      console.error('Error checking connection status:', err);
    }
  };

  // Busca contas de anúncios do usuário
  const fetchAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await api.get('/integrations/meta-ads/accounts');
      setAdAccounts(response.data);
    } catch (err) {
      console.error('Error fetching ad accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Inicia o processo de conexão
  const startMetaConnection = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Obter URL de autorização do backend
      const response = await api.get('/integrations/meta-ads/auth-url');
      const url = response.data.authUrl;
      
      if (url) {
        setMetaAuthUrl(url);
        setActiveStep(1);
        // Redirecionar para a URL de autorização
        window.location.href = url;
      } else {
        throw new Error('URL de autorização inválida');
      }
    } catch (err) {
      setError('Não foi possível iniciar o processo de conexão. Por favor, tente novamente.');
      console.error('Error starting Meta connection:', err);
    } finally {
      setLoading(false);
    }
  };

  // Processa o callback de autorização do Meta
  const handleMetaAuthCallback = async (code, state) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Sending code to backend:', { code, state });
      // Enviar código para o backend processar
      const redirectUri = `${window.location.origin}/connect-meta/callback`;
      console.log('Using redirect URI:', redirectUri);
      
      // Enviar código e estado para o backend processar
      const tokenResponse = await api.post('/integrations/meta-ads/callback', {
        code,
        state,
        redirectUri
      });
      
      if (tokenResponse.data.isConnected) {
        setConnected(true);
        setActiveStep(2);
        // Limpar parâmetros da URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Buscar contas de anúncios
        fetchAdAccounts();
      } else {
        throw new Error('Falha na conexão');
      }
    } catch (err) {
      setError('Falha ao conectar com o Meta Ads. Por favor, tente novamente.');
      console.error('Meta connection error:', err);
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };

  // Desconecta a integração
  const disconnectMeta = async () => {
    try {
      // Obter ID da fonte de integração Meta Ads
      const sourcesResponse = await api.get('/integrations/sources');
      const metaSource = sourcesResponse.data.find(
        source => source.name === 'meta_ads'
      );
      
      if (metaSource) {
        await api.delete(`/integrations/${metaSource.id}`);
        setConnected(false);
        setActiveStep(0);
        setAdAccounts([]);
      }
    } catch (err) {
      setError('Erro ao desconectar do Meta Ads.');
      console.error('Error disconnecting Meta:', err);
    }
  };

  // Conclui o processo e vai para o dashboard
  const goToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Conectar ao Meta Ads
        </Typography>
        
        <Box sx={{ width: '100%', mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          {activeStep === 0 && !connected && (
            <>
              <Typography variant="body1" paragraph>
                Para começar a usar a ferramenta de análise de Meta Ads, você precisa conectar sua conta do Meta Ads.
              </Typography>
              <Typography variant="body1" paragraph>
                Ao clicar no botão abaixo, você será redirecionado para o Meta para autorizar o acesso às suas contas de anúncios.
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={startMetaConnection}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Conectar ao Meta Ads'}
                </Button>
              </Box>
            </>
          )}
          
          {activeStep === 1 && (
            <>
              <Typography variant="body1" paragraph>
                Você está sendo redirecionado para o Meta...
              </Typography>
              <CircularProgress />
            </>
          )}
          
          {activeStep === 2 && connected && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
              </Box>
              <Typography variant="h5" gutterBottom>
                Conexão com Meta Ads estabelecida com sucesso!
              </Typography>
              <Typography variant="body1" paragraph>
                Sua conta está conectada e você pode acessar seus dados de anúncios.
              </Typography>
              
              {loadingAccounts ? (
                <Box sx={{ my: 3 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Carregando suas contas de anúncios...
                  </Typography>
                </Box>
              ) : (
                adAccounts.length > 0 && (
                  <Box sx={{ mt: 3, mb: 4, textAlign: 'left' }}>
                    <Typography variant="h6" gutterBottom>
                      Contas de Anúncios Disponíveis:
                    </Typography>
                    <List>
                      {adAccounts.map((account) => (
                        <ListItem key={account.id}>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={account.name} 
                            secondary={`ID: ${account.accountId} | Status: ${account.status} | ${account.businessName || 'Conta Pessoal'}`} 
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )
              )}
              
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={disconnectMeta}
                  startIcon={<ErrorIcon />}
                >
                  Desconectar Conta
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={goToDashboard}
                  startIcon={<ArrowBackIcon />}
                >
                  Ir para o Dashboard
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ConnectMeta;
