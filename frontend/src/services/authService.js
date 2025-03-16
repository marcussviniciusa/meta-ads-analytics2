import api from './api';

/**
 * Serviço para gerenciar a autenticação de usuários
 */
const authService = {
  /**
   * Registrar um novo usuário
   * @param {Object} userData - Dados do usuário (nome, email, senha)
   * @returns {Promise} Promessa com resposta da API
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Fazer login com email e senha
   * @param {Object} credentials - Credenciais do usuário (email, senha)
   * @returns {Promise} Promessa com resposta da API
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Fazer login via Facebook
   * @param {Object} facebookResponse - Resposta da autenticação do Facebook
   * @returns {Promise} Promessa com resposta da API
   */
  facebookLogin: async (facebookResponse) => {
    const { accessToken, userID } = facebookResponse;
    const response = await api.post('/auth/facebook', { accessToken, userID });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Fazer logout do usuário
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Obter o token JWT atual
   * @returns {string|null} Token JWT ou null se não estiver autenticado
   */
  getToken: () => {
    const token = localStorage.getItem('token');
    console.log('Token recuperado do localStorage:', token ? `${token.substring(0, 10)}...` : 'null');
    return token;
  },

  /**
   * Obter os dados do usuário atual
   * @returns {Object|null} Dados do usuário ou null se não estiver autenticado
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  },

  /**
   * Verificar se o usuário está autenticado
   * @returns {boolean} True se o usuário estiver autenticado
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  
  /**
   * Forçar uma autenticação com credenciais existentes para renovar o token
   * Útil para garantir que o token seja válido antes de operações administrativas
   * @returns {Promise<object>} Dados de autenticação atualizados
   */
  refreshAuthentication: async () => {
    try {
      console.log('Tentando renovar autenticação para garantir token válido');
      
      // Recuperar credenciais salvas, se disponíveis
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('Nenhum usuário encontrado para renovar a autenticação');
      }
      
      const user = JSON.parse(userStr);
      const email = user.email;
      
      // Solicitar senha ao usuário ou usar uma armazenada temporariamente (não recomendado em produção)
      // Para fins de teste, usaremos a senha do administrador padrão
      const credentials = {
        email: email,
        password: 'admin123' // APENAS PARA TESTE - em produção isso seria solicitado ao usuário
      };
      
      // Fazer login novamente para obter um token fresco
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.token) {
        console.log('Token renovado com sucesso!');
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      } else {
        throw new Error('Falha ao renovar token - resposta sem token');
      }
    } catch (error) {
      console.error('Erro ao renovar autenticação:', error);
      throw error;
    }
  },

  /**
   * Obter os dados atualizados do usuário atual do servidor
   * @returns {Promise} Promessa com dados do usuário
   */
  getCurrentUserFromServer: async () => {
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      throw error;
    }
  },

  /**
   * Verificar status da integração com Meta Ads
   * @returns {Promise} Promessa com resposta da API
   */
  checkMetaIntegration: async () => {
    try {
      const response = await api.get('/integrations');
      const metaIntegration = response.data.find(
        integration => integration.name === 'meta_ads'
      );
      return {
        isConnected: metaIntegration ? metaIntegration.is_connected : false,
        integration: metaIntegration
      };
    } catch (error) {
      console.error('Erro ao verificar integração com Meta Ads:', error);
      return { isConnected: false, integration: null };
    }
  },

  /**
   * Obter URL de autorização para Meta Ads
   * @returns {Promise} Promessa com URL de autorização
   */
  getMetaAuthUrl: async () => {
    try {
      const response = await api.get('/integrations/meta-ads/auth-url');
      return response.data.authUrl;
    } catch (error) {
      console.error('Erro ao obter URL de autorização do Meta:', error);
      throw error;
    }
  },

  /**
   * Processar callback de autorização do Meta Ads
   * @param {Object} data - Dados do callback (code, state)
   * @returns {Promise} Promessa com resposta da API
   */
  processMetaCallback: async (data) => {
    try {
      const response = await api.post('/integrations/meta-ads/callback', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao processar callback do Meta:', error);
      throw error;
    }
  },

  /**
   * Desconectar integração com Meta Ads
   * @returns {Promise} Promessa com resposta da API
   */
  disconnectMeta: async () => {
    try {
      // Obter ID da fonte de integração Meta Ads
      const sourcesResponse = await api.get('/integrations/sources');
      const metaSource = sourcesResponse.data.find(
        source => source.name === 'meta_ads'
      );
      
      if (metaSource) {
        const response = await api.delete(`/integrations/${metaSource.id}`);
        return response.data;
      } else {
        throw new Error('Fonte de integração Meta Ads não encontrada');
      }
    } catch (error) {
      console.error('Erro ao desconectar do Meta Ads:', error);
      throw error;
    }
  }
};

export default authService;
