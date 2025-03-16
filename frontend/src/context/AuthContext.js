import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';

// Create context
const AuthContext = createContext();

/**
 * Provider component for authentication context
 * @param {Object} props - Component props
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMetaConnected, setIsMetaConnected] = useState(false);

  // Initialize authentication state on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Get user from localStorage for immediate UI update
          const storageUser = authService.getCurrentUser();
          
          // Debug: Log user object and role
          console.log('Current user from localStorage:', storageUser);
          console.log('User role:', storageUser?.role);
          
          setUser(storageUser);
          
          // Verificar se o objeto do usuário possui a propriedade 'role'
          if (!storageUser?.role) {
            console.warn('Usuário não possui um papel (role) definido. Recarregando informações do usuário...');
            try {
              // Recarregar informações do usuário para garantir que o papel esteja presente
              const { data } = await authService.getCurrentUserFromServer();
              console.log('Dados atualizados do usuário:', data);
              
              // Atualizar localStorage com os dados mais recentes
              localStorage.setItem('user', JSON.stringify(data.user));
              setUser(data.user);
            } catch (refreshErr) {
              console.error('Erro ao recarregar informações do usuário:', refreshErr);
            }
          }
          
          // Check Meta Ads integration status
          checkMetaIntegration();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Check Meta Ads integration status
   */
  const checkMetaIntegration = async () => {
    try {
      const { isConnected } = await authService.checkMetaIntegration();
      setIsMetaConnected(isConnected);
    } catch (err) {
      console.error('Error checking Meta integration:', err);
    }
  };

  /**
   * Login user
   * @param {Object} credentials - Login credentials
   */
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.login(credentials);
      setUser(data.user);
      await checkMetaIntegration();
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register new user
   * @param {Object} userData - User registration data
   */
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.register(userData);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Facebook login
   * @param {Object} response - Facebook login response
   */
  const handleFacebookLogin = async (response) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.facebookLogin(response);
      setUser(data.user);
      await checkMetaIntegration();
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get Meta Ads authorization URL
   */
  const getMetaAuthUrl = async () => {
    try {
      return await authService.getMetaAuthUrl();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  };

  /**
   * Process Meta Ads authorization callback
   * @param {Object} callbackData - Callback data (code, state)
   */
  const processMetaCallback = async (callbackData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authService.processMetaCallback(callbackData);
      if (result.isConnected) {
        setIsMetaConnected(true);
      }
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disconnect from Meta Ads
   */
  const disconnectMeta = async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.disconnectMeta();
      setIsMetaConnected(false);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsMetaConnected(false);
  };

  // Value object to be provided by context
  const value = {
    user,
    isAuthenticated: !!user,
    isMetaConnected,
    loading,
    error,
    login,
    register,
    logout,
    handleFacebookLogin,
    getMetaAuthUrl,
    processMetaCallback,
    disconnectMeta,
    checkMetaIntegration
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use the auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
