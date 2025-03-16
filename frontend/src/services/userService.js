import api from './api';

/**
 * Serviço para gerenciamento de usuários
 */
class UserService {
  /**
   * Obter lista de todos os usuários (apenas super admin)
   * @param {Object} params - Parâmetros de consulta (page, limit, search)
   * @returns {Promise} - Promise com os dados dos usuários
   */
  static async getUsers(params = {}) {
    const { page = 1, limit = 10, search = '' } = params;
    const queryParams = new URLSearchParams();
    
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (search) queryParams.append('search', search);
    
    const queryString = queryParams.toString();
    const url = `/auth/users${queryString ? `?${queryString}` : ''}`;
    
    return api.get(url);
  }

  /**
   * Obter usuário por ID
   * @param {number} id - ID do usuário
   * @returns {Promise} - Promise com os dados do usuário
   */
  static async getUserById(id) {
    return api.get(`/auth/users/${id}`);
  }

  /**
   * Criar novo usuário
   * @param {Object} userData - Dados do usuário
   * @returns {Promise} - Promise com os dados do usuário criado
   */
  static async createUser(userData) {
    // Verifica token atual (deve ter sido atualizado pelo login manual na tela de usuários)
    const token = localStorage.getItem('token');
    
    console.log('[UserService] Verificando token para criação de usuário:', token ? `${token.substring(0, 15)}...` : 'Nenhum');
    
    if (!token) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }
    
    try {
      // Envia requisição diretamente com o token atual (renovado pelo login manual)
      console.log('[UserService] Enviando dados para criação de usuário:', { ...userData, password: '***' });
      
      // Adiciona log especial para debugging da criação de usuários
      console.log('[UserService] Headers da requisição:', {
        Authorization: `Bearer ${token.substring(0, 10)}...`
      });
      
      const response = await api.post('/auth/register', userData);
      console.log('[UserService] Resposta bem-sucedida da criação de usuário:', response.data);
      return response;
    } catch (error) {
      console.error('[UserService] Erro na requisição de criação de usuário:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Mensagens de erro mais específicas de acordo com o problema
      if (error.response?.status === 401) {
        throw new Error('Erro de autenticação ao criar usuário. Por favor, faça login novamente.');
      } else if (error.response?.status === 400) {
        const errorMsg = error.response.data.message || error.response.data.error || 'Dados inválidos';
        throw new Error(`Erro ao criar usuário: ${errorMsg}`);
      } else if (error.response?.status === 409) {
        throw new Error('Usuário com este email já existe no sistema.');
      }
      
      throw error;
    }
  }

  /**
   * Atualizar usuário
   * @param {number} id - ID do usuário
   * @param {Object} userData - Dados do usuário
   * @returns {Promise} - Promise com os dados do usuário atualizado
   */
  static async updateUser(id, userData) {
    return api.put(`/auth/users/${id}`, userData);
  }

  /**
   * Excluir usuário
   * @param {number} id - ID do usuário
   * @returns {Promise} - Promise com resultado da exclusão
   */
  static async deleteUser(id) {
    return api.delete(`/auth/users/${id}`);
  }
}

export default UserService;
