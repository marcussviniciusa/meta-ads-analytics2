import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Typography, 
  Paper, 
  Box, 
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../services/api';
import GoogleIcon from '@mui/icons-material/Google';

const ConnectGoogle = () => {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations/google-analytics/status');
      setIsConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking Google Analytics connection:', error);
      setError('Falha ao verificar status da conexão com Google Analytics');
    } finally {
      setLoading(false);
    }
  };

  const startGoogleConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/integrations/google-analytics/auth-url');
      
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        setError('URL de autenticação não encontrada');
      }
    } catch (error) {
      console.error('Error starting Google Analytics connection:', error);
      setError('Falha ao iniciar conexão com Google Analytics');
    } finally {
      setLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      setLoading(true);
      await api.post('/integrations/google-analytics/disconnect');
      setIsConnected(false);
    } catch (error) {
      console.error('Error disconnecting Google Analytics:', error);
      setError('Falha ao desconectar do Google Analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ padding: 3, mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Google Analytics
      </Typography>
      
      <Typography variant="body1" paragraph>
        Conecte sua conta do Google Analytics para importar e analisar dados de tráfego e visualizá-los junto com os dados do Meta Ads.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      ) : isConnected ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Conectado ao Google Analytics
          </Alert>
          <Button
            variant="outlined"
            color="error"
            onClick={disconnectGoogle}
            startIcon={<GoogleIcon />}
          >
            Desconectar
          </Button>
        </Box>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={startGoogleConnection}
          startIcon={<GoogleIcon />}
          sx={{ 
            backgroundColor: '#4285F4',
            '&:hover': {
              backgroundColor: '#357ae8'
            }
          }}
        >
          Conectar Google Analytics
        </Button>
      )}
    </Paper>
  );
};

export default ConnectGoogle;
