import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  Button,
  CircularProgress,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Página de gerenciamento de contas Meta Ads
 */
const MetaAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, accountId: null });
  const { isMetaConnected, disconnectMeta, checkMetaIntegration } = useAuth();
  const navigate = useNavigate();

  // Carregar contas ao montar o componente
  useEffect(() => {
    if (!isMetaConnected) {
      navigate('/connect-meta');
      return;
    }
    
    fetchAccounts();
  }, [isMetaConnected, navigate]);

  /**
   * Buscar contas de anúncios do usuário
   */
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/integrations/meta-ads/accounts');
      setAccounts(response.data.accounts || []);
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
      setError('Não foi possível carregar suas contas do Meta Ads. Por favor, tente novamente.');
      setSnackbar({
        open: true,
        message: 'Erro ao carregar contas. ' + (err.response?.data?.message || err.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Desconectar da integração Meta Ads
   */
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await disconnectMeta();
      setSnackbar({
        open: true,
        message: 'Desconectado com sucesso do Meta Ads.',
        severity: 'success'
      });
      navigate('/connect-meta');
    } catch (err) {
      console.error('Erro ao desconectar:', err);
      setSnackbar({
        open: true,
        message: 'Erro ao desconectar. ' + (err.response?.data?.message || err.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verificar status da conta
   * @param {string} status - Status da conta
   * @returns {Object} - Configuração do chip de status
   */
  const getStatusChip = (status) => {
    const statusMap = {
      1: { label: 'Ativo', color: 'success' },
      2: { label: 'Desativado', color: 'error' },
      3: { label: 'Não Publicado', color: 'warning' },
      7: { label: 'Pendente', color: 'info' },
      9: { label: 'Em Análise', color: 'secondary' },
      100: { label: 'Fechado', color: 'default' },
      101: { label: 'Qualquer', color: 'default' }
    };

    return statusMap[status] || { label: 'Desconhecido', color: 'default' };
  };

  /**
   * Confirmar exclusão de conta
   * @param {string} accountId - ID da conta a ser excluída
   */
  const confirmDeleteAccount = (accountId) => {
    setConfirmDialog({ open: true, accountId });
  };

  /**
   * Excluir conta
   */
  const handleDeleteAccount = async () => {
    const accountId = confirmDialog.accountId;
    setConfirmDialog({ open: false, accountId: null });
    
    if (!accountId) return;
    
    try {
      setLoading(true);
      await api.delete(`/integrations/meta-ads/accounts/${accountId}`);
      
      // Atualizar lista de contas
      setAccounts(accounts.filter(acc => acc.account_id !== accountId));
      
      setSnackbar({
        open: true,
        message: 'Conta removida com sucesso.',
        severity: 'success'
      });
    } catch (err) {
      console.error('Erro ao remover conta:', err);
      setSnackbar({
        open: true,
        message: 'Erro ao remover conta. ' + (err.response?.data?.message || err.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ver relatórios da conta
   * @param {string} accountId - ID da conta
   */
  const viewReports = (accountId) => {
    navigate(`/reports/meta/${accountId}`);
  };

  /**
   * Fechar snackbar
   */
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="lg">
      <Box my={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" component="h1" gutterBottom>
          Contas Meta Ads
        </Typography>
        <Box>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={fetchAccounts} 
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Atualizar
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleDisconnect}
            disabled={loading}
          >
            Desconectar
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {accounts.length === 0 ? (
            <Box textAlign="center" my={8}>
              <Typography variant="h6" gutterBottom>
                Nenhuma conta encontrada
              </Typography>
              <Typography color="textSecondary" paragraph>
                Não encontramos nenhuma conta de anúncios vinculada ao seu perfil do Meta.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => navigate('/connect-meta')}
                sx={{ mt: 2 }}
              >
                Reconectar ao Meta Ads
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {accounts.map((account) => (
                <Grid item xs={12} sm={6} md={4} key={account.account_id}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'all 0.3s',
                      '&:hover': {
                        boxShadow: 3
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="h6" component="h2" gutterBottom noWrap>
                          {account.name}
                        </Typography>
                        <Chip
                          label={getStatusChip(account.status).label}
                          color={getStatusChip(account.status).color}
                          size="small"
                        />
                      </Box>
                      
                      <Typography color="textSecondary" gutterBottom>
                        ID: {account.account_id}
                      </Typography>
                      
                      {account.business_name && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Empresa: {account.business_name}
                        </Typography>
                      )}
                      
                      <Box display="flex" justifyContent="space-between" mt={2}>
                        <IconButton 
                          color="primary" 
                          onClick={() => viewReports(account.account_id)}
                          title="Ver relatórios"
                        >
                          <AssessmentIcon />
                        </IconButton>
                        
                        <IconButton 
                          color="error" 
                          onClick={() => confirmDeleteAccount(account.account_id)}
                          title="Remover conta"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Snackbar para mensagens */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Diálogo de confirmação para exclusão */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover esta conta do Meta Ads? Esta ação não poderá ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteAccount} color="error" autoFocus>
            Confirmar exclusão
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MetaAccounts;
