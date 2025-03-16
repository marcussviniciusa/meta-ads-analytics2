import api from './api';

/**
 * Serviço para gerenciamento de empresas
 */
class CompanyService {
  /**
   * Obter lista de empresas com paginação
   * @param {Object} params - Parâmetros de consulta (page, limit, search)
   * @returns {Promise} - Promise com os dados das empresas
   */
  static async getCompanies(params = {}) {
    const { page = 1, limit = 10, search = '' } = params;
    const queryParams = new URLSearchParams();
    
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (search) queryParams.append('search', search);
    
    const queryString = queryParams.toString();
    const url = `/companies${queryString ? `?${queryString}` : ''}`;
    
    return api.get(url);
  }

  /**
   * Obter empresa por ID
   * @param {number} id - ID da empresa
   * @returns {Promise} - Promise com os dados da empresa
   */
  static async getCompanyById(id) {
    return api.get(`/companies/${id}`);
  }

  /**
   * Criar nova empresa
   * @param {Object} companyData - Dados da empresa
   * @returns {Promise} - Promise com os dados da empresa criada
   */
  static async createCompany(companyData) {
    return api.post('/companies', companyData);
  }

  /**
   * Atualizar empresa
   * @param {number} id - ID da empresa
   * @param {Object} companyData - Dados da empresa
   * @returns {Promise} - Promise com os dados da empresa atualizada
   */
  static async updateCompany(id, companyData) {
    return api.put(`/companies/${id}`, companyData);
  }

  /**
   * Excluir empresa
   * @param {number} id - ID da empresa
   * @returns {Promise} - Promise com resultado da exclusão
   */
  static async deleteCompany(id) {
    return api.delete(`/companies/${id}`);
  }

  /**
   * Obter usuários de uma empresa
   * @param {number} id - ID da empresa
   * @param {Object} params - Parâmetros de consulta (page, limit, search)
   * @returns {Promise} - Promise com os usuários da empresa
   */
  static async getCompanyUsers(id, params = {}) {
    const { page = 1, limit = 10, search = '' } = params;
    const queryParams = new URLSearchParams();
    
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (search) queryParams.append('search', search);
    
    const queryString = queryParams.toString();
    const url = `/companies/${id}/users${queryString ? `?${queryString}` : ''}`;
    
    return api.get(url);
  }
}

export default CompanyService;
