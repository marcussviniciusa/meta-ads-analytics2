import axios from 'axios';
import { getToken } from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * Serviço para gerenciar as operações de relatórios do Meta Ads
 */
const metaReportService = {
  /**
   * Obter detalhes de uma conta de anúncios específica
   * @param {string} accountId - ID da conta de anúncios
   * @returns {Promise} Promise com dados da conta
   */
  getAccountDetails: async (accountId) => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/integrations/meta-ads/accounts/${accountId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter detalhes da conta:', error);
      throw error;
    }
  },

  /**
   * Obter campanhas de uma conta específica
   * @param {string} accountId - ID da conta de anúncios
   * @returns {Promise} Promise com lista de campanhas
   */
  getCampaigns: async (accountId) => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/integrations/meta-ads/accounts/${accountId}/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter campanhas:', error);
      throw error;
    }
  },

  /**
   * Obter insights de performance de uma conta
   * @param {string} accountId - ID da conta de anúncios
   * @param {string} startDate - Data inicial (formato YYYY-MM-DD)
   * @param {string} endDate - Data final (formato YYYY-MM-DD)
   * @param {string} campaignId - ID da campanha (opcional)
   * @returns {Promise} Promise com dados de insights
   */
  getAccountInsights: async (accountId, startDate, endDate, campaignId = null) => {
    try {
      const token = getToken();
      
      let url = `${API_URL}/integrations/meta-ads/accounts/${accountId}/insights?start_date=${startDate}&end_date=${endDate}`;
      
      if (campaignId) {
        url += `&campaign_id=${campaignId}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao obter insights da conta:', error);
      throw error;
    }
  },

  /**
   * Obter insights de uma campanha específica
   * @param {string} campaignId - ID da campanha
   * @param {string} startDate - Data inicial (formato YYYY-MM-DD)
   * @param {string} endDate - Data final (formato YYYY-MM-DD)
   * @returns {Promise} Promise com dados de insights da campanha
   */
  getCampaignInsights: async (campaignId, startDate, endDate) => {
    try {
      const token = getToken();
      const response = await axios.get(
        `${API_URL}/integrations/meta-ads/campaigns/${campaignId}/insights?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao obter insights da campanha:', error);
      throw error;
    }
  },

  /**
   * Remover associação de uma conta de anúncios
   * @param {string} accountId - ID da conta de anúncios
   * @returns {Promise} Promise com resultado da operação
   */
  removeAdAccount: async (accountId) => {
    try {
      const token = getToken();
      const response = await axios.delete(
        `${API_URL}/integrations/meta-ads/accounts/${accountId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao remover conta de anúncios:', error);
      throw error;
    }
  }
};

export default metaReportService;
