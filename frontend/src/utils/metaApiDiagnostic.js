import axios from 'axios';
import authService from '../services/authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * Utilitário para diagnosticar problemas com a API do Meta Ads
 */
const metaApiDiagnostic = {
  /**
   * Testa uma série de chamadas à API para identificar problemas
   * @param {string} accountId - ID da conta Meta Ads
   * @returns {Promise<Object>} Relatório de diagnóstico
   */
  runDiagnostics: async (accountId) => {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        apiUrl: API_URL,
        userAgent: navigator.userAgent,
      },
      tests: [],
      overallStatus: 'pending'
    };

    try {
      // Teste 1: Verificar token de autenticação
      const token = authService.getToken();
      const tokenTest = {
        name: 'Token de autenticação',
        status: token ? 'success' : 'failure',
        details: token 
          ? `Token presente (${token.substring(0, 10)}...${token.substring(token.length - 5)})` 
          : 'Token não encontrado'
      };
      report.tests.push(tokenTest);

      if (!token) {
        report.overallStatus = 'failure';
        return report;
      }

      // Teste 2: Verificar conexão básica com a API
      try {
        const pingResponse = await axios.get(`${API_URL}/health-check`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        });
        
        report.tests.push({
          name: 'Conexão básica com a API',
          status: 'success',
          details: `Status: ${pingResponse.status}, Resposta: ${JSON.stringify(pingResponse.data).substring(0, 100)}`
        });
      } catch (pingError) {
        report.tests.push({
          name: 'Conexão básica com a API',
          status: 'failure',
          details: `Erro: ${pingError.message}`
        });
      }

      // Teste 3: Verificar detalhes da conta Meta Ads
      try {
        const accountResponse = await axios.get(`${API_URL}/integrations/meta-ads/accounts/${accountId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        report.tests.push({
          name: 'Detalhes da conta Meta Ads',
          status: 'success',
          details: `ID da conta: ${accountId}, Nome: ${accountResponse.data.name || 'N/A'}`
        });
      } catch (accountError) {
        report.tests.push({
          name: 'Detalhes da conta Meta Ads',
          status: 'failure',
          details: `Erro: ${accountError.message}`
        });
      }

      // Teste 4: Verificar diferentes formatos de data
      const dateFormats = [
        { format: 'YYYY-MM-DD', start: '2023-01-01', end: '2023-01-31' },
        { format: 'MM/DD/YYYY', start: '01/01/2023', end: '01/31/2023' }
      ];

      for (const dateFormat of dateFormats) {
        try {
          const insightsUrl = `${API_URL}/integrations/meta-ads/accounts/${accountId}/insights?start_date=${dateFormat.start}&end_date=${dateFormat.end}`;
          const insightsResponse = await axios.get(insightsUrl, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          report.tests.push({
            name: `Insights com formato de data ${dateFormat.format}`,
            status: 'success',
            details: `Start: ${dateFormat.start}, End: ${dateFormat.end}, Resposta recebida: ${insightsResponse.data ? 'Sim' : 'Não'}`
          });
        } catch (insightsError) {
          report.tests.push({
            name: `Insights com formato de data ${dateFormat.format}`,
            status: 'failure',
            details: `Erro: ${insightsError.message}`
          });
        }
      }

      // Determinar status geral
      const successfulTests = report.tests.filter(test => test.status === 'success').length;
      const totalTests = report.tests.length;
      
      if (successfulTests === totalTests) {
        report.overallStatus = 'success';
        report.summary = 'Todos os testes foram bem-sucedidos';
      } else if (successfulTests > 0) {
        report.overallStatus = 'partial';
        report.summary = `${successfulTests} de ${totalTests} testes foram bem-sucedidos`;
      } else {
        report.overallStatus = 'failure';
        report.summary = 'Todos os testes falharam';
      }

      return report;
    } catch (error) {
      report.overallStatus = 'error';
      report.summary = `Erro ao executar diagnóstico: ${error.message}`;
      return report;
    }
  },

  /**
   * Verifica o status geral da API do Meta Ads
   * @returns {Promise<Object>} Status da API
   */
  checkApiStatus: async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        return { 
          success: false, 
          message: 'Token de autenticação não encontrado' 
        };
      }
      
      const response = await axios.get(`${API_URL}/integrations/meta-ads/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return { 
        success: true, 
        data: response.data,
        message: 'Conexão com a API do Meta Ads está funcionando'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        message: 'Não foi possível conectar à API do Meta Ads'
      };
    }
  }
};

export default metaApiDiagnostic;
