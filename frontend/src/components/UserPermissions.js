import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tab,
  Tabs,
  FormControlLabel,
  Checkbox,
  Button,
  CircularProgress,
  Divider,
  Alert,
  Grid,
  Chip
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';

// API base URL para garantir que as requisições vão para o backend correto
const API_BASE_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'https://api.speedfunnels.online';

// Função para obter o token JWT do localStorage
const getAuthToken = () => {
  // O token é armazenado diretamente no localStorage com a chave 'token'
  return localStorage.getItem('token');
};

// Configuração de headers com o token JWT para autenticação
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

// Componente para o botão de atualização
const RefreshButton = ({ onClick, disabled, label }) => {
  return (
    <Button 
      variant="outlined" 
      color="primary" 
      onClick={onClick} 
      disabled={disabled}
      startIcon={<CircularProgress size={16} sx={{ display: disabled ? 'inline-flex' : 'none' }} />}
      size="small"
      sx={{ ml: 1 }}
    >
      {label}
    </Button>
  );
};

const UserPermissions = ({ userId, username }) => {
  const [tabValue, setTabValue] = useState(0);
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [gaProperties, setGaProperties] = useState([]);
  const [userMetaPermissions, setUserMetaPermissions] = useState([]);
  const [userGaPermissions, setUserGaPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Buscar todas as contas de anúncio do Meta
  const fetchMetaAccounts = async () => {
    try {
      console.log('Buscando contas Meta...');
      // Atualizar o endpoint para o correto e incluir parâmetro de atualização forçada
      const response = await axios.get(`${API_BASE_URL}/api/integrations/meta-ads/accounts?forceRefresh=true`, getAuthHeaders());
      console.log('Resposta da API Meta:', response.data);
      
      // Registrar headers da resposta para debug
      console.log('Headers da resposta Meta:', response.headers);
      
      // Verificar se a resposta é um array ou tem um formato específico
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.accounts)) {
        return response.data.accounts;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // Se nenhum formato reconhecido, retorna array vazio
      console.warn('Formato de resposta não reconhecido para contas Meta:', response.data);
      return [];
    } catch (error) {
      console.error('Erro ao buscar contas Meta:', error.response?.data || error.message);
      
      // Se o erro for de integração necessária, retornar array vazio sem lançar erro
      if (error.response?.data?.error === 'integration_required') {
        console.log('Integração com Meta Ads necessária');
        return [];
      }
      
      // Para outros erros, retornar array vazio mas não lançar exceção
      return [];
    }
  };
  
  // Função para atualizar manualmente as contas Meta
  const refreshMetaAccounts = async () => {
    try {
      setLoading(true);
      const accounts = await fetchMetaAccounts();
      setMetaAccounts(accounts);
      toast.success('Contas do Meta atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar contas Meta:', error);
      toast.error('Erro ao atualizar contas do Meta');
    } finally {
      setLoading(false);
    }
  };

  // Buscar todas as propriedades do GA
  const fetchGaProperties = async () => {
    try {
      console.log('Buscando propriedades GA...');
      // Usar URL completa com base URL e incluir headers de autenticação
      const response = await axios.get(`${API_BASE_URL}/api/integrations/google-analytics/properties`, getAuthHeaders());
      console.log('Resposta da API GA:', response.data);
      
      // Registrar headers da resposta para debug
      console.log('Headers da resposta GA:', response.headers);
      
      // Verificar se a resposta é um array ou tem um formato específico
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.properties)) {
        return response.data.properties;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // Se nenhum formato reconhecido, retorna array vazio
      console.warn('Formato de resposta não reconhecido para propriedades GA:', response.data);
      return [];
    } catch (error) {
      console.error('Erro ao buscar propriedades GA:', error.response?.data || error.message);
      
      // Se o erro for de integração necessária, retornar array vazio sem lançar erro
      if (error.response?.data?.error === 'integration_required') {
        console.log('Integração com Google Analytics necessária');
        return [];
      }
      
      // Para outros erros, retornar array vazio mas não lançar exceção
      return [];
    }
  };

  // Buscar permissões Meta do usuário
  const fetchUserMetaPermissions = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/permissions/users/${userId}/meta-permissions`, getAuthHeaders());
      // Verificar se a resposta tem a estrutura esperada (objeto com propriedade permissions)
      if (response.data && response.data.permissions) {
        return response.data.permissions;
      }
      // Caso seja um array, retornar diretamente
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erro ao buscar permissões Meta:', error);
      return [];
    }
  };

  // Buscar permissões GA do usuário
  const fetchUserGaPermissions = async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/permissions/users/${userId}/ga-permissions`, getAuthHeaders());
      // Verificar se a resposta tem a estrutura esperada (objeto com propriedade permissions)
      if (response.data && response.data.permissions) {
        return response.data.permissions;
      }
      // Caso seja um array, retornar diretamente
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Erro ao buscar permissões GA:', error);
      return [];
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [accounts, properties, metaPermissions, gaPermissions] = await Promise.all([
          fetchMetaAccounts(),
          fetchGaProperties(),
          fetchUserMetaPermissions(userId),
          fetchUserGaPermissions(userId)
        ]);
        
        setMetaAccounts(accounts);
        setGaProperties(properties);
        setUserMetaPermissions(metaPermissions);
        setUserGaPermissions(gaPermissions);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Falha ao carregar dados de permissões. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadData();
    }
  }, [userId]);

  // Alternar tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Verificar se a conta Meta está selecionada
  const isMetaAccountSelected = (accountId) => {
    return userMetaPermissions.some(permission => 
      permission.account_id === accountId || permission.account_id === String(accountId));
  };

  // Verificar se a propriedade GA está selecionada
  const isGaPropertySelected = (propertyId) => {
    return userGaPermissions.some(permission => 
      permission.property_id === propertyId || permission.property_id === String(propertyId));
  };

  // Adicionar/remover permissão Meta
  const toggleMetaPermission = async (accountId, isCurrentlySelected) => {
    setSaving(true);
    try {
      if (isCurrentlySelected) {
        // Remover permissão
        await axios.delete(`${API_BASE_URL}/api/permissions/meta-permissions/${userId}/${accountId}`, getAuthHeaders());
        
        // Atualizar estado local
        setUserMetaPermissions(userMetaPermissions.filter(
          permission => permission.account_id !== accountId && permission.account_id !== String(accountId)
        ));
        
        toast.success('Permissão removida com sucesso');
      } else {
        // Adicionar permissão
        await axios.post(`${API_BASE_URL}/api/permissions/meta-permissions`, { userId, accountId }, getAuthHeaders());
        
        // Atualizar estado local
        setUserMetaPermissions([...userMetaPermissions, { user_id: userId, account_id: accountId }]);
        
        toast.success('Permissão adicionada com sucesso');
      }
    } catch (error) {
      console.error('Erro ao atualizar permissão Meta:', error);
      toast.error('Erro ao atualizar permissão');
    } finally {
      setSaving(false);
    }
  };

  // Adicionar/remover permissão GA
  const toggleGaPermission = async (propertyId, isCurrentlySelected) => {
    setSaving(true);
    try {
      if (isCurrentlySelected) {
        // Remover permissão
        await axios.delete(`${API_BASE_URL}/api/permissions/ga-permissions/${userId}/${propertyId}`, getAuthHeaders());
        
        // Atualizar estado local
        setUserGaPermissions(userGaPermissions.filter(
          permission => permission.property_id !== propertyId && permission.property_id !== String(propertyId)
        ));
        
        toast.success('Permissão removida com sucesso');
      } else {
        // Adicionar permissão
        await axios.post(`${API_BASE_URL}/api/permissions/ga-permissions`, { userId, propertyId }, getAuthHeaders());
        
        // Atualizar estado local
        setUserGaPermissions([...userGaPermissions, { user_id: userId, property_id: propertyId }]);
        
        toast.success('Permissão adicionada com sucesso');
      }
    } catch (error) {
      console.error('Erro ao atualizar permissão GA:', error);
      toast.error('Erro ao atualizar permissão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Paper elevation={2} sx={{ mt: 2, mb: 3 }}>
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Gerenciar Permissões de {username || `Usuário #${userId}`}
        </Typography>
      </Box>
      
      <Divider />
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="permissões tabs">
          <Tab label="Contas de Anúncio Meta" />
          <Tab label="Propriedades Google Analytics" />
        </Tabs>
      </Box>
      
      {/* Tab de Contas Meta Ads */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1">Contas de anúncio disponíveis</Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={refreshMetaAccounts} 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            size="small"
          >
            Atualizar Contas Meta
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {Array.isArray(metaAccounts) && metaAccounts.length > 0 ? metaAccounts.map((account) => {
              const isSelected = isMetaAccountSelected(account.account_id || account.id);
              return (
                <Grid item xs={12} sm={6} md={4} key={account.account_id || account.id}>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      flexDirection: 'column',
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'white',
                      border: isSelected ? '1px solid rgba(25, 118, 210, 0.5)' : '1px solid #e0e0e0'
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom noWrap>
                      {account.name}
                    </Typography>
                    
                    <Box display="flex" mb={1}>
                      <Chip 
                        label={`ID: ${account.account_id || account.id}`} 
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      {account.status === 1 && (
                        <Chip 
                          label="Ativa" 
                          size="small" 
                          color="success" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                    
                    <Button
                      variant={isSelected ? "outlined" : "contained"}
                      color={isSelected ? "error" : "primary"}
                      size="small"
                      onClick={() => toggleMetaPermission(account.account_id || account.id, isSelected)}
                      disabled={saving}
                    >
                      {saving ? <CircularProgress size={24} /> : isSelected ? 'Remover Acesso' : 'Conceder Acesso'}
                    </Button>
                  </Paper>
                </Grid>
              );
            }) : (
              <Alert severity="info">
                Não foram encontradas contas de anúncio Meta. Conecte uma conta Meta para gerenciar permissões.
              </Alert>
            )}
          </Grid>
        )}
      </TabPanel>
      
      {/* Tab de Propriedades Google Analytics */}
      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {Array.isArray(gaProperties) && gaProperties.length > 0 ? gaProperties.map((property) => {
              const isSelected = isGaPropertySelected(property.property_id);
              return (
                <Grid item xs={12} sm={6} md={4} key={property.property_id}>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      flexDirection: 'column',
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'white',
                      border: isSelected ? '1px solid rgba(25, 118, 210, 0.5)' : '1px solid #e0e0e0'
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom noWrap>
                      {property.property_name}
                    </Typography>
                    
                    <Box display="flex" mb={1}>
                      <Chip 
                        label={`ID: ${property.property_id}`} 
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={property.account_name} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                    
                    <Button
                      variant={isSelected ? "outlined" : "contained"}
                      color={isSelected ? "error" : "primary"}
                      size="small"
                      onClick={() => toggleGaPermission(property.property_id, isSelected)}
                      disabled={saving}
                    >
                      {saving ? <CircularProgress size={24} /> : isSelected ? 'Remover Acesso' : 'Conceder Acesso'}
                    </Button>
                  </Paper>
                </Grid>
              );
            }) : (
              <Alert severity="info">
                Não foram encontradas propriedades do Google Analytics. Conecte uma conta GA para gerenciar permissões.
              </Alert>
            )}
          </Grid>
        )}
      </TabPanel>
    </Paper>
  );
};

export default UserPermissions;
