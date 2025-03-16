import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Divider
} from '@mui/material';
import ConnectGoogle from '../components/ConnectGoogle';
import GoogleAnalyticsSelector from '../components/GoogleAnalyticsSelector';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const GoogleAnalyticsPage = () => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      checkConnectionStatus();
    }
  }, [isAuthenticated]);

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations/google-analytics/status');
      setIsConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking Google Analytics connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Integração com Google Analytics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ConnectGoogle />
        </Grid>

        {isConnected && (
          <>
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
                <Typography variant="h5" gutterBottom>
                  Selecione uma Propriedade
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Escolha a propriedade do Google Analytics que deseja analisar.
                </Typography>
                
                <GoogleAnalyticsSelector onPropertySelect={handlePropertySelect} />
              </Paper>
            </Grid>

            {selectedProperty && (
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    Propriedade Selecionada
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <Typography variant="subtitle1">
                      <strong>Nome da Propriedade:</strong> {selectedProperty.property_name}
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>ID da Propriedade:</strong> {selectedProperty.property_id}
                    </Typography>
                    <Typography variant="subtitle1">
                      <strong>Conta:</strong> {selectedProperty.account_name}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="h6" gutterBottom>
                    Próximos Passos
                  </Typography>
                  <Typography variant="body1">
                    Agora que você selecionou uma propriedade, você pode visualizar os dados do Google Analytics integrados com suas campanhas do Meta Ads no dashboard principal.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </>
        )}
      </Grid>
    </Container>
  );
};

export default GoogleAnalyticsPage;
