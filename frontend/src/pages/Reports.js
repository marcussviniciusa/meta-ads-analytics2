import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Share as ShareIcon,
  Facebook as FacebookIcon,
  Analytics as AnalyticsIcon,
  List as ListIcon
} from '@mui/icons-material';
import metaReportService from '../services/metaReportService';
import { useAuth } from '../context/AuthContext';

/**
 * Página central para acesso a todos os relatórios da aplicação
 */
const Reports = () => {
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchMetaAccounts();
  }, []);

  /**
   * Busca contas do Meta conectadas
   */
  const fetchMetaAccounts = async () => {
    try {
      setLoading(true);
      const { accounts } = await metaReportService.getAccounts();
      setMetaAccounts(accounts || []);
    } catch (err) {
      console.error('Erro ao buscar contas do Meta:', err);
      setError('Não foi possível carregar as contas do Meta Ads. Verifique sua conexão.');
      
      // Usar contas simuladas em caso de erro
      setMetaAccounts([
        { 
          account_id: 'act_simulado1', 
          name: 'Conta Simulada 1',
          status: 'ACTIVE',
          is_mock: true
        },
        { 
          account_id: 'act_simulado2', 
          name: 'Conta Simulada 2',
          status: 'ACTIVE',
          is_mock: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Relatórios
      </Typography>
      
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Meta Ads */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 4, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FacebookIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h5">
                Relatórios do Meta Ads
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {metaAccounts.length > 0 ? (
              <List>
                {metaAccounts.map((account) => (
                  <ListItem 
                    key={account.account_id}
                    component={Link}
                    to={`/reports/meta/${account.account_id}`}
                    button
                    sx={{ 
                      borderRadius: 1,
                      '&:hover': { 
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <ListItemIcon>
                      <ListIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={account.name} 
                      secondary={account.account_id}
                    />
                    {account.is_mock && (
                      <Typography variant="caption" color="warning.main">
                        Simulado
                      </Typography>
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Nenhuma conta do Meta Ads conectada. Conecte uma conta para acessar os relatórios.
              </Typography>
            )}

            <Box sx={{ mt: 2 }}>
              <Button 
                component={Link}
                to="/connect-meta"
                variant="outlined" 
                color="primary"
                sx={{ mt: 2 }}
              >
                Gerenciar Contas do Meta
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Google Analytics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 4, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AnalyticsIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h5">
                Relatórios do Google Analytics
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body1" paragraph>
              Acesse análises detalhadas do seu site com base nos dados do Google Analytics.
            </Typography>
            
            <Button 
              component={Link}
              to="/google-analytics"
              variant="outlined" 
              color="primary"
              sx={{ mt: 2 }}
            >
              Acessar Google Analytics
            </Button>
          </Paper>
        </Grid>
        
        {/* Relatórios Recentes */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Relatórios Recentes
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Desempenho de Anúncios
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gerado em: 17/03/2025
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Conta: {metaAccounts.length > 0 ? metaAccounts[0].name : 'Não disponível'}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<PdfIcon />}>
                      PDF
                    </Button>
                    <Button size="small" startIcon={<ShareIcon />}>
                      Compartilhar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Análise de Campanhas
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gerado em: 16/03/2025
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Período: 01/03/2025 a 15/03/2025
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<PdfIcon />}>
                      PDF
                    </Button>
                    <Button size="small" startIcon={<ShareIcon />}>
                      Compartilhar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Tráfego do Site
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gerado em: 15/03/2025
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fonte: Google Analytics
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<PdfIcon />}>
                      PDF
                    </Button>
                    <Button size="small" startIcon={<ShareIcon />}>
                      Compartilhar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Reports;
