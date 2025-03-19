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
import ApiErrorDiagnostic from './ApiErrorDiagnostic';

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
  const [metaApiError, setMetaApiError] = useState(null);
  const [gaApiError, setGaApiError] = useState(null);

  // Buscar todas as contas de anúncio do Meta
  const fetchMetaAccounts = async () => {
    try {
      console.log('Buscando contas Meta...');
      // Limpar erros anteriores
      setMetaApiError(null);
      
      const response = await axios.get(`${API_BASE_URL}/api/integrations/meta-ads/accounts`, getAuthHeaders());
      console.log('Resposta da API Meta:', response.data);
      
      // Verificar se a resposta é HTML em vez de JSON
      if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
        console.error('Resposta HTML recebida em vez de JSON:', response.data.substring(0, 200) + '...');
        
        // Configurar diagnóstico de erro
        setMetaApiError({
          type: 'format_error',
          message: 'Resposta em formato HTML recebida em vez de JSON',
          details: response.data.substring(0, 500) + '...',
          contentType: response.headers['content-type'],
          timestamp: new Date().toISOString()
        });
        
        toast.error('Erro no formato de resposta da API Meta Ads');
        return [];
      }
      
      // Verificar se a resposta tem o formato esperado
      if (response.data && Array.isArray(response.data.accounts)) {
        console.log('Contas Meta encontradas:', response.data.accounts.length);
        return response.data.accounts;
      }
      
      console.warn('Formato de resposta não reconhecido para contas Meta:', response.data);
      
      // Configurar diagnóstico de erro para formato desconhecido
      setMetaApiError({
        type: 'unknown_format',
        message: 'Formato de resposta não reconhecido',
        details: JSON.stringify(response.data),
        timestamp: new Date().toISOString()
      });
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar contas Meta:', error.response?.data || error.message);
      
      // Configurar diagnóstico de erro
      const errorDiagnostic = {
        type: 'api_error',
        status: error.response?.status,
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Verificar se o erro é de autenticação
      if (error.response?.status === 401 || error.response?.data?.error === 'authentication_error') {
        errorDiagnostic.type = 'auth_error';
        errorDiagnostic.specificError = 'authentication_failure';
      }
      
      // Verificar se o erro é de limite de taxa
      if (error.response?.status === 429 || error.response?.data?.error?.type === 'OAuthException') {
        errorDiagnostic.type = 'rate_limit_error';
        errorDiagnostic.specificError = 'rate_limit_exceeded';
      }
      
      // Verificar se o erro é de token
      if (error.response?.data?.error?.message?.includes('token')) {
        errorDiagnostic.type = 'token_error';
        errorDiagnostic.specificError = 'invalid_token';
      }
      
      // Verificar se a resposta contém HTML
      if (error.response?.headers?.['content-type']?.includes('text/html')) {
        errorDiagnostic.type = 'html_error';
        errorDiagnostic.details = error.response?.data?.substring(0, 500) + '...';
        errorDiagnostic.contentType = error.response?.headers['content-type'];
      }
      
      // Definir o objeto de erro para usar no painel de diagnóstico
      setMetaApiError(errorDiagnostic);
      
      // Para todos os erros, retornar array vazio
      return [];
    }
  };

  // Buscar todas as propriedades do GA
  const fetchGaProperties = async () => {
    try {
      console.log('Buscando propriedades GA...');
      // Limpar erros anteriores
      setGaApiError(null);
      
      const response = await axios.get(`${API_BASE_URL}/api/integrations/google-analytics/properties`, getAuthHeaders());
      console.log('Resposta da API GA:', response.data);
      
      // Verificar se a resposta é HTML em vez de JSON
      if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
        console.error('Resposta HTML recebida em vez de JSON:', response.data.substring(0, 200) + '...');
        
        // Configurar diagnóstico de erro
        setGaApiError({
          type: 'format_error',
          message: 'Resposta em formato HTML recebida em vez de JSON',
          details: response.data.substring(0, 500) + '...',
          contentType: response.headers['content-type'],
          timestamp: new Date().toISOString()
        });
        
        toast.error('Erro no formato de resposta da API Google Analytics');
        return [];
      }
      
      // Verificar se a resposta tem o formato esperado
      if (response.data && Array.isArray(response.data.properties)) {
        console.log('Propriedades GA encontradas:', response.data.properties.length);
        return response.data.properties;
      }
      
      console.warn('Formato de resposta não reconhecido para propriedades GA:', response.data);
      
      // Configurar diagnóstico de erro para formato desconhecido
      setGaApiError({
        type: 'unknown_format',
        message: 'Formato de resposta não reconhecido',
        details: JSON.stringify(response.data),
        timestamp: new Date().toISOString()
      });
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar propriedades GA:', error.response?.data || error.message);
      
      // Configurar diagnóstico de erro
      const errorDiagnostic = {
        type: 'api_error',
        status: error.response?.status,
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Verificar se o erro é de autenticação
      if (error.response?.status === 401 || error.response?.data?.error === 'authentication_error') {
        errorDiagnostic.type = 'auth_error';
        errorDiagnostic.specificError = 'authentication_failure';
      }
      
      // Verificar se o erro é de limite de taxa
      if (error.response?.status === 429 || error.response?.data?.error?.type === 'OAuthException') {
        errorDiagnostic.type = 'rate_limit_error';
        errorDiagnostic.specificError = 'rate_limit_exceeded';
      }
      
      // Verificar se o erro é de token
      if (error.response?.data?.error?.message?.includes('token')) {
        errorDiagnostic.type = 'token_error';
        errorDiagnostic.specificError = 'invalid_token';
      }
      
      // Verificar se a resposta contém HTML
      if (error.response?.headers?.['content-type']?.includes('text/html')) {
        errorDiagnostic.type = 'html_error';
        errorDiagnostic.details = error.response?.data?.substring(0, 500) + '...';
        errorDiagnostic.contentType = error.response?.headers['content-type'];
      }
      
      // Definir o objeto de erro para usar no painel de diagnóstico
      setGaApiError(errorDiagnostic);
      
      // Para todos os erros, retornar array vazio
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
    if (!propertyId || !Array.isArray(userGaPermissions)) {
      return false;
    }
    
    // Converter para string para comparação consistente
    const propertyIdStr = String(propertyId);
    
    return userGaPermissions.some(permission => {
      // Verificar diferentes formatos de ID nas permissões
      const permPropertyId = permission.property_id || permission.propertyId;
      
      if (!permPropertyId) {
        return false;
      }
      
      // Converter para string para comparação consistente
      return String(permPropertyId) === propertyIdStr;
    });
  };

  // Adicionar/remover permissão Meta
  const toggleMetaPermission = async (accountId, isCurrentlySelected) => {
    setSaving(true);
    console.log('[UserPermissions] Iniciando alteração de permissão Meta:', { 
      userId, 
      accountId, 
      isCurrentlySelected, 
      token: getAuthToken()?.substring(0, 10) + '...' // mostrar apenas parte do token por segurança
    });
    try {
      if (isCurrentlySelected) {
        // Remover permissão
        console.log('[UserPermissions] Removendo permissão Meta...');
        const deleteUrl = `${API_BASE_URL}/api/permissions/meta-permissions/${userId}/${accountId}`;
        console.log('[UserPermissions] URL de requisição:', deleteUrl);
        
        const response = await axios.delete(deleteUrl, getAuthHeaders());
        console.log('[UserPermissions] Resposta ao remover permissão:', response.data);
        
        // Atualizar estado local
        setUserMetaPermissions(userMetaPermissions.filter(
          permission => permission.account_id !== accountId && permission.account_id !== String(accountId)
        ));
        
        toast.success('Permissão removida com sucesso');
      } else {
        // Adicionar permissão
        console.log('[UserPermissions] Adicionando permissão Meta...');
        const postUrl = `${API_BASE_URL}/api/permissions/meta-permissions`;
        console.log('[UserPermissions] URL de requisição:', postUrl);
        console.log('[UserPermissions] Dados enviados:', { userId, accountId });
        
        const response = await axios.post(postUrl, { userId, accountId }, getAuthHeaders());
        console.log('[UserPermissions] Resposta ao adicionar permissão:', response.data);
        
        // Atualizar estado local
        setUserMetaPermissions([...userMetaPermissions, { user_id: userId, account_id: accountId }]);
        
        toast.success('Permissão adicionada com sucesso');
      }
    } catch (error) {
      console.error('[UserPermissions] Erro ao atualizar permissão Meta:', error);
      console.error('[UserPermissions] Detalhes do erro:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      toast.error(`Erro ao atualizar permissão: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Adicionar/remover permissão GA
  const toggleGaPermission = async (propertyId, isCurrentlySelected) => {
    setSaving(true);
    console.log('[UserPermissions] Iniciando alteração de permissão GA:', { 
      userId, 
      propertyId, 
      isCurrentlySelected 
    });
    try {
      if (isCurrentlySelected) {
        // Remover permissão
        console.log('[UserPermissions] Removendo permissão GA...');
        const deleteUrl = `${API_BASE_URL}/api/permissions/ga-permissions/${userId}/${propertyId}`;
        console.log('[UserPermissions] URL de requisição:', deleteUrl);
        
        const response = await axios.delete(deleteUrl, getAuthHeaders());
        console.log('[UserPermissions] Resposta ao remover permissão GA:', response.data);
        
        // Atualizar estado local - garantir que remova todas as ocorrências do propertyId
        setUserGaPermissions(userGaPermissions.filter(permission => {
          const permPropertyId = permission.property_id || permission.propertyId;
          
          if (!permPropertyId) {
            return false;
          }
          
          // Converter para string para comparação consistente
          return String(permPropertyId) !== String(propertyId);
        }));
        
        toast.success('Permissão removida com sucesso');
      } else {
        // Adicionar permissão
        console.log('[UserPermissions] Adicionando permissão GA...');
        const postUrl = `${API_BASE_URL}/api/permissions/ga-permissions`;
        console.log('[UserPermissions] URL de requisição:', postUrl);
        console.log('[UserPermissions] Dados enviados:', { userId, propertyId });
        
        const response = await axios.post(postUrl, { userId, propertyId }, getAuthHeaders());
        console.log('[UserPermissions] Resposta ao adicionar permissão GA:', response.data);
        
        // Atualizar estado local
        setUserGaPermissions([...userGaPermissions, { user_id: userId, property_id: propertyId }]);
        
        toast.success('Permissão adicionada com sucesso');
      }
    } catch (error) {
      console.error('[UserPermissions] Erro ao atualizar permissão GA:', error);
      console.error('[UserPermissions] Detalhes do erro:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      toast.error(`Erro ao atualizar permissão GA: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
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
  
  // Função para atualizar manualmente as propriedades GA
  const refreshGaProperties = async () => {
    try {
      setLoading(true);
      const properties = await fetchGaProperties();
      setGaProperties(properties);
      toast.success('Propriedades do Google Analytics atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar propriedades GA:', error);
      toast.error('Erro ao atualizar propriedades do Google Analytics');
    } finally {
      setLoading(false);
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
          Permissões de Usuário: {username || `ID ${userId}`}
        </Typography>
        
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Contas Meta Ads" id="tab-0" />
          <Tab label="Propriedades Google Analytics" id="tab-1" />
        </Tabs>
        
        {/* Tab de Contas Meta Ads */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">Contas Meta Ads disponíveis</Typography>
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

          {/* Componente de diagnóstico de erros da API Meta */}
          {metaApiError && <ApiErrorDiagnostic error={metaApiError} apiType="meta" onRetry={refreshMetaAccounts} />}
          
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
                <Grid item xs={12}>
                  <Alert severity="info">
                    Não foram encontradas contas de anúncio Meta. Conecte uma conta Meta para gerenciar permissões.
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>
        
        {/* Tab de Propriedades Google Analytics */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">Propriedades do Google Analytics disponíveis</Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={refreshGaProperties} 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
              size="small"
            >
              Atualizar Propriedades GA
            </Button>
          </Box>
          
          {/* Componente de diagnóstico de erros da API GA */}
          {gaApiError && <ApiErrorDiagnostic error={gaApiError} apiType="ga" onRetry={refreshGaProperties} />}
          
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
                // Garantir compatibilidade com ambos os formatos de IDs de propriedade
                const propertyId = property.property_id || property.propertyId || property.id;
                const isSelected = isGaPropertySelected(propertyId);
                return (
                  <Grid item xs={12} sm={6} md={4} key={propertyId}>
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
                        {property.property_name || property.name}
                      </Typography>
                      
                      <Box display="flex" mb={1}>
                        <Chip 
                          label={`ID: ${propertyId}`} 
                          size="small" 
                          sx={{ mr: 1 }}
                        />
                        <Chip 
                          label={property.account_name || property.accountName || 'GA4'} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      
                      <Button
                        variant={isSelected ? "outlined" : "contained"}
                        color={isSelected ? "error" : "primary"}
                        size="small"
                        onClick={() => toggleGaPermission(propertyId, isSelected)}
                        disabled={saving}
                      >
                        {saving ? <CircularProgress size={24} /> : isSelected ? 'Remover Acesso' : 'Conceder Acesso'}
                      </Button>
                    </Paper>
                  </Grid>
                );
              }) : (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Não foram encontradas propriedades do Google Analytics. Conecte uma conta GA para gerenciar permissões.
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>
      </Box>
    </Paper>
  );
};

export default UserPermissions;
