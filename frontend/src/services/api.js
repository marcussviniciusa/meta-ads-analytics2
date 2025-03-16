import axios from 'axios';

// Usar a URL da API configurada no ambiente ou o domínio principal do projeto
const API_URL = process.env.REACT_APP_API_URL || 'https://api.speedfunnels.online/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true // Habilitar envio de cookies nas requisições cross-origin
});

// Add request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Adicionando log detalhado para analisar o token
      console.log(`Token atual: ${token.substring(0, 15)}...${token.substring(token.length - 10)}`);
      
      // Verificar se o token é válido (formato básico)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('ALERTA: Token não está no formato JWT válido!', token);
      } else {
        try {
          // Decodificar payload sem verificação
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Payload do token decodificado:', {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Não definido'
          });
          
          // Verificar expiração
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.error('ALERTA: Token possivelmente expirado!');
          }
        } catch (e) {
          console.error('Erro ao decodificar token:', e);
        }
      }
      
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`Enviando requisição autenticada para: ${config.baseURL}${config.url}`);
    } else {
      console.warn(`Enviando requisição SEM autenticação para: ${config.baseURL}${config.url}`);
    }
    
    // Log de detalhes da requisição (exceto dados sensíveis)
    if (config.method === 'post' || config.method === 'put') {
      const dataLog = config.data ? { ...config.data } : {};
      // Remover campos sensíveis dos logs
      if (dataLog.password) dataLog.password = '***';
      console.log(`Dados da requisição: ${JSON.stringify(dataLog)}`);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle 401 unauthorized responses
api.interceptors.response.use(
  (response) => {
    // Log de respostas bem-sucedidas para endpoints críticos
    if (response.config.url.includes('/register') || 
        response.config.url.includes('/login')) {
      console.log(`Resposta bem-sucedida para ${response.config.url}:`, {
        status: response.status,
        statusText: response.statusText
      });
    }
    return response;
  },
  (error) => {
    console.error('Erro na resposta da API:', error.response?.status, error.response?.statusText || error.message);
    
    // Log detalhado para depuração
    if (error.response) {
      console.error('Detalhes do erro da API:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method
      });
    }
    
    if (error.response && error.response.status === 401) {
      console.warn('Erro de autenticação detectado (401). Redirecionando para login...');
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Adicionar atraso para garantir que os logs sejam visíveis no console
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    return Promise.reject(error);
  }
);

export default api;
