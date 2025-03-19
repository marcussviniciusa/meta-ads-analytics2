import api from './api';
import authService from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * Service for handling report-related API calls
 */
class ReportService {
  /**
   * Get all saved reports for the current user
   * @returns {Promise} - API response
   */
  async getSavedReports() {
    const response = await api.get('/reports/saved');
    return response.data;
  }

  /**
   * Get a specific saved report
   * @param {number} reportId - The report ID
   * @returns {Promise} - API response
   */
  async getSavedReport(reportId) {
    const response = await api.get(`/reports/saved/${reportId}`);
    return response.data;
  }

  /**
   * Save a new report
   * @param {Object} reportData - The report data
   * @returns {Promise} - API response
   */
  async saveReport(reportData) {
    const response = await api.post('/reports/save', reportData);
    return response.data;
  }

  /**
   * Generate a custom report based on criteria
   * @param {Object} criteria - Report criteria (filters, date range, etc.)
   * @returns {Promise} - API response
   */
  async generateCustomReport(criteria) {
    const response = await api.post('/reports/generate', criteria);
    return response.data;
  }
  
  /**
   * Gera um relatório em formato PDF
   * @param {Object} reportData - Dados do relatório a ser gerado
   * @param {Object} options - Opções de formatação para o PDF
   * @returns {Promise} - Blob do PDF gerado ou URL para download
   */
  async generatePDF(reportData, options = {}) {
    try {
      console.log('Gerando PDF com dados:', { 
        reportType: reportData.type,
        hasMeta: !!reportData.metaAds,
        hasGA: !!reportData.googleAnalytics
      });
      
      const token = authService.getToken();
      
      const response = await fetch(`${API_URL}/reports/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportData,
          options
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resposta da API de geração de PDF não foi bem-sucedida:', {
          status: response.status,
          statusText: response.statusText,
          errorDetails: errorText
        });
        throw new Error(`Erro ao gerar PDF (${response.status}): ${response.statusText}`);
      }
      
      const blob = await response.blob();
      return {
        blob,
        downloadUrl: URL.createObjectURL(blob)
      };
    } catch (error) {
      console.error('Erro detalhado ao gerar PDF:', error);
      
      // Criar um relatório de erro para facilitar o diagnóstico
      const errorReport = {
        message: `Erro ao gerar PDF: ${error.message || 'Erro desconhecido'}`,
        timestamp: new Date().toISOString(),
        stack: error.stack
      };
      
      // Log do erro para debugging
      console.log('Relatório de erro:', errorReport);
      
      throw error;
    }
  }
  
  /**
   * Cria um link público para compartilhamento do relatório
   * @param {Object} reportData - Dados do relatório a ser compartilhado
   * @param {Object} options - Opções para o link compartilhado (expiração, permissões, etc.)
   * @returns {Promise} - URL pública para acesso ao relatório
   */
  async createPublicLink(reportData, options = {}) {
    try {
      const token = authService.getToken();
      
      const response = await fetch(`${API_URL}/reports/create-public-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportData,
          options: {
            expirationDays: options.expirationDays || 30,
            allowDownload: options.allowDownload !== false,
            requirePassword: !!options.password,
            password: options.password || null,
            ...options
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resposta da API de criação de link público não foi bem-sucedida:', {
          status: response.status,
          statusText: response.statusText,
          errorDetails: errorText
        });
        throw new Error(`Erro ao criar link público (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        publicUrl: data.publicUrl,
        expiresAt: data.expiresAt,
        shareId: data.shareId
      };
    } catch (error) {
      console.error('Erro detalhado ao criar link público:', error);
      
      // Criar um relatório de erro para facilitar o diagnóstico
      const errorReport = {
        message: `Erro ao criar link público: ${error.message || 'Erro desconhecido'}`,
        timestamp: new Date().toISOString(),
        stack: error.stack
      };
      
      // Log do erro para debugging
      console.log('Relatório de erro de link público:', errorReport);
      
      throw error;
    }
  }
  
  /**
   * Verifica o status de um link público
   * @param {string} shareId - ID do compartilhamento
   * @returns {Promise} - Informações sobre o status do compartilhamento
   */
  async getPublicLinkStatus(shareId) {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/reports/public-link-status/${shareId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao verificar status do link: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao verificar status do link público:', error);
      throw error;
    }
  }
  
  /**
   * Revoga um link público compartilhado
   * @param {string} shareId - ID do compartilhamento a ser revogado
   * @returns {Promise} - Confirmação da revogação
   */
  async revokePublicLink(shareId) {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/reports/revoke-public-link/${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao revogar link público: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao revogar link público:', error);
      throw error;
    }
  }
  
  /**
   * Lista todos os links públicos criados pelo usuário
   * @returns {Promise} - Lista de links públicos
   */
  async listPublicLinks() {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/reports/public-links`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao listar links públicos: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao listar links públicos:', error);
      throw error;
    }
  }
}

export default new ReportService();
