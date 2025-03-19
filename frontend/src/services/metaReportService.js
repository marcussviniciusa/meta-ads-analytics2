import axios from 'axios';
import authService from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/**
 * Extrai e formata detalhes do erro para melhor diagnóstico
 * @param {Error} error - Objeto de erro
 * @returns {Object} Objeto com detalhes do erro
 */
const extractErrorDetails = (error) => {
  if (error.response) {
    // A requisição foi feita e o servidor respondeu com status diferente de 2xx
    return {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data,
      message: error.message,
      url: error.config?.url || 'URL desconhecida'
    };
  } else if (error.request) {
    // A requisição foi feita mas não houve resposta
    return {
      type: 'Sem resposta do servidor',
      message: error.message,
      url: error.config?.url || 'URL desconhecida'
    };
  } else {
    // Erro na configuração da requisição
    return {
      type: 'Erro de configuração',
      message: error.message
    };
  }
};

/**
 * Analisa o erro da API do Meta e retorna possíveis causas e soluções
 * @param {Object} errorDetails - Detalhes do erro
 * @param {Object} requestParams - Parâmetros da requisição
 * @returns {Object} Causas e possíveis soluções
 */
const analyzeMetaApiError = (errorDetails, requestParams) => {
  const analysis = {
    possibleCauses: [],
    possibleSolutions: [],
    severity: 'medium',
    diagnosticCode: `META-${errorDetails.status || 'ERR'}`
  };

  // Análise específica para erro 400 (Bad Request)
  if (errorDetails.status === 400) {
    analysis.diagnosticCode = 'META-400';
    
    // Verificar dados de resposta específicos da API do Meta
    const errorData = errorDetails.data;
    
    // Verificar problemas de autenticação
    if (errorData?.error?.type === 'OAuthException') {
      analysis.possibleCauses.push('Erro de autenticação com a API do Meta');
      analysis.possibleSolutions.push('Reconectar a conta do Meta Ads');
      analysis.possibleSolutions.push('Verificar se os tokens de acesso estão atualizados');
      analysis.severity = 'high';
    }
    
    // Verificar problemas com ID de conta
    else if (errorData?.error?.message?.includes('Unknown ad account')) {
      analysis.possibleCauses.push('ID de conta do Meta Ads inválido ou inacessível');
      analysis.possibleSolutions.push('Verificar se o ID da conta está correto');
      analysis.possibleSolutions.push('Confirmar se a conta está ativa');
      analysis.severity = 'high';
    }
    
    // Verificar problemas com intervalo de datas
    else if (errorData?.error?.message?.includes('date')) {
      analysis.possibleCauses.push('Problema com o intervalo de datas');
      
      // Verificar se o período é muito longo
      if (requestParams?.startDate && requestParams?.endDate) {
        const start = new Date(requestParams.startDate);
        const end = new Date(requestParams.endDate);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 90) {
          analysis.possibleCauses.push('Intervalo de datas muito longo (máximo de 90 dias)');
          analysis.possibleSolutions.push('Reduzir o intervalo de datas para menos de 90 dias');
        }
      }
      
      analysis.possibleSolutions.push('Verificar se as datas estão no formato correto (YYYY-MM-DD)');
      analysis.severity = 'medium';
    }
    
    // Causas genéricas se não identificou nada específico
    if (analysis.possibleCauses.length === 0) {
      analysis.possibleCauses.push('Parâmetros de requisição inválidos');
      analysis.possibleCauses.push('Possível mudança na API do Meta Ads');
      analysis.possibleSolutions.push('Verificar os parâmetros da requisição');
      analysis.possibleSolutions.push('Consultar a documentação mais recente da API do Meta Ads');
    }
  } else {
    // Análise para outros tipos de erro (não 400)
    analysis.possibleCauses.push('Erro desconhecido na comunicação com a API do Meta');
    analysis.possibleSolutions.push('Tentar novamente mais tarde');
    analysis.possibleSolutions.push('Verificar a conectividade com a internet');
  }

  return analysis;
};

/**
 * Valida os parâmetros da requisição para a API do Meta Ads
 * @param {string} accountId - ID da conta
 * @param {string} startDate - Data inicial
 * @param {string} endDate - Data final
 * @returns {Object} Resultado da validação
 */
const validateMetaApiParameters = (accountId, startDate, endDate) => {
  const issues = [];
  const warnings = [];
  
  // Validar ID da conta
  if (!accountId) {
    issues.push('ID da conta não fornecido');
  } else if (!accountId.startsWith('act_')) {
    issues.push('Formato de ID da conta inválido. Deve começar com "act_"');
  }
  
  // Validar datas
  if (!startDate || !endDate) {
    issues.push('Datas não fornecidas');
  } else {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) {
      issues.push('Data inicial inválida');
    }
    
    if (isNaN(end.getTime())) {
      issues.push('Data final inválida');
    }
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (start > end) {
        issues.push('Data inicial é posterior à data final');
      }
      
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        warnings.push('Intervalo de datas maior que 90 dias pode causar problemas com alguns endpoints da API do Meta');
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
};

/**
 * Gera dados simulados para campanhas quando a API falha
 * @returns {Object} Dados simulados de campanhas
 */
const generateMockCampaigns = () => {
  return {
    campaigns: [],
    is_mock_data: true,
    mock_reason: 'API_ERROR',
    generated_at: new Date().toISOString()
  };
};

/**
 * Gera dados simulados de insights quando a API falha
 * @param {string} startDate - Data inicial no formato YYYY-MM-DD
 * @param {string} endDate - Data final no formato YYYY-MM-DD
 * @returns {Object} Dados simulados de insights
 */
const generateMockInsights = (startDate, endDate) => {
  return {
    insights: [],
    audience_data: {
      gender: [],
      age: []
    },
    summary: {
      impressions: 0,
      reach: 0,
      clicks: 0,
      spend: 0
    },
    is_mock_data: true,
    mock_reason: 'API_ERROR',
    generated_at: new Date().toISOString()
  };
};

/**
 * Serviço para gerenciar as operações de relatórios do Meta Ads
 */
const metaReportService = {
  // Armazena o último erro encontrado para diagnóstico
  lastErrorDetails: null,
  
  /**
   * Realizar diagnóstico detalhado de erro da API
   * @param {string} accountId - ID da conta de anúncios
   * @param {string} startDate - Data inicial
   * @param {string} endDate - Data final
   * @returns {Promise} Promise com resultado do diagnóstico
   */
  diagnoseApiError: async (accountId, startDate, endDate) => {
    try {
      // Validar parâmetros
      const validation = validateMetaApiParameters(accountId, startDate, endDate);
      
      if (!validation.valid) {
        return {
          success: false,
          type: 'PARAMETER_ERROR',
          issues: validation.issues,
          warnings: validation.warnings,
          recommendations: ['Corrigir os parâmetros antes de tentar novamente']
        };
      }
      
      // Testar conexão básica
      const token = authService.getToken();
      
      try {
        await axios.get(`${API_URL}/integrations/meta-ads/status`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (error) {
        return {
          success: false,
          type: 'CONNECTION_ERROR',
          message: 'Não foi possível conectar ao servidor da API',
          error: extractErrorDetails(error)
        };
      }
      
      // Testar acesso à conta
      try {
        await axios.get(`${API_URL}/integrations/meta-ads/accounts/${accountId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (error) {
        const errorDetails = extractErrorDetails(error);
        const analysis = analyzeMetaApiError(errorDetails, { accountId });
        
        return {
          success: false,
          type: 'ACCOUNT_ACCESS_ERROR',
          message: 'Não foi possível acessar a conta do Meta Ads',
          error: errorDetails,
          analysis
        };
      }
      
      // Testar com intervalo mínimo (1 dia)
      try {
        await axios.get(`${API_URL}/integrations/meta-ads/accounts/${accountId}/insights?start_date=${startDate}&end_date=${startDate}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Se chegou até aqui, o problema pode ser com o intervalo de datas
        if (startDate !== endDate) {
          return {
            success: false,
            type: 'DATE_RANGE_ERROR',
            message: 'Teste com um único dia funcionou, mas o intervalo completo falha',
            recommendations: [
              'O intervalo de datas pode ser muito grande',
              'Tente reduzir o intervalo para no máximo 90 dias',
              'Divida a consulta em múltiplos períodos menores'
            ]
          };
        }
      } catch (error) {
        const errorDetails = extractErrorDetails(error);
        const analysis = analyzeMetaApiError(errorDetails, { accountId, startDate, endDate: startDate });
        
        return {
          success: false,
          type: 'INSIGHTS_ERROR',
          message: 'Não foi possível obter insights mesmo com intervalo mínimo',
          error: errorDetails,
          analysis
        };
      }
      
      // Se chegou até aqui mas ainda temos lastErrorDetails, é um caso não coberto
      if (metaReportService.lastErrorDetails) {
        return {
          success: false,
          type: 'UNKNOWN_ERROR',
          message: 'Diagnóstico não conseguiu identificar a causa específica',
          lastError: metaReportService.lastErrorDetails,
          recommendations: [
            'Verificar logs do servidor para detalhes adicionais',
            'Confirmar permissões da conta do Meta Ads',
            'Verificar se a conta tem dados no período solicitado'
          ]
        };
      }
      
      return {
        success: true,
        message: 'Diagnóstico não encontrou problemas'
      };
    } catch (error) {
      return {
        success: false,
        type: 'DIAGNOSTIC_ERROR',
        message: 'Erro ao realizar diagnóstico',
        error: extractErrorDetails(error)
      };
    }
  },

  /**
   * Obter detalhes de uma conta de anúncios específica
   * @param {string} accountId - ID da conta de anúncios
   * @returns {Promise} Promise com dados da conta
   */
  getAccountDetails: async (accountId) => {
    try {
      const token = authService.getToken();
      const response = await axios.get(`${API_URL}/integrations/meta-ads/accounts/${accountId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      const errorDetails = extractErrorDetails(error);
      console.error('Erro ao obter detalhes da conta:', errorDetails);
      
      // Armazenar detalhes do erro para diagnóstico
      metaReportService.lastErrorDetails = {
        operation: 'getAccountDetails',
        accountId,
        ...errorDetails,
        analysis: analyzeMetaApiError(errorDetails, { accountId })
      };
      
      // Retorna um objeto simulado como fallback
      return {
        id: accountId,
        name: 'Conta Meta Ads (simulado)',
        status: 'ACTIVE',
        currency: 'BRL',
        timezone: 'America/Sao_Paulo',
        is_mock_data: true
      };
    }
  },

  /**
   * Obter campanhas de uma conta específica
   * @param {string} accountId - ID da conta de anúncios
   * @returns {Promise} Promise com lista de campanhas
   */
  getCampaigns: async (accountId) => {
    // Validar parâmetros primeiro
    if (!accountId) {
      console.warn('Erro: ID da conta não fornecido');
      throw new Error('ID da conta é obrigatório');
    }
    
    try {
      const token = authService.getToken();
      
      const response = await axios.get(`${API_URL}/integrations/meta-ads/accounts/${accountId}/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      const errorDetails = extractErrorDetails(error);
      console.error('Erro ao obter campanhas:', errorDetails);
      
      // Armazenar detalhes do erro para diagnóstico
      metaReportService.lastErrorDetails = {
        operation: 'getCampaigns',
        accountId,
        ...errorDetails,
        analysis: analyzeMetaApiError(errorDetails, { accountId })
      };
      
      // Em vez de retornar dados simulados, lançamos um erro
      throw new Error('Falha ao obter dados de campanhas do Meta Ads');
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
    // Validar parâmetros primeiro
    const validation = validateMetaApiParameters(accountId, startDate, endDate);
    if (!validation.valid) {
      console.warn('Validação de parâmetros falhou:', validation.issues);
      
      metaReportService.lastErrorDetails = {
        operation: 'getAccountInsights',
        status: 400,
        message: 'Parâmetros inválidos',
        issues: validation.issues,
        requestParams: { accountId, startDate, endDate, campaignId }
      };
      
      throw new Error('Parâmetros inválidos para obter insights do Meta Ads: ' + validation.issues.join(', '));
    }
    
    try {
      const token = authService.getToken();
      
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
      const errorDetails = extractErrorDetails(error);
      console.error('Erro ao obter insights da conta:', errorDetails);
      
      // Armazenar detalhes do erro para diagnóstico
      metaReportService.lastErrorDetails = {
        operation: 'getAccountInsights',
        accountId,
        startDate,
        endDate,
        campaignId,
        ...errorDetails,
        analysis: analyzeMetaApiError(errorDetails, { accountId, startDate, endDate, campaignId })
      };
      
      // Em vez de retornar dados simulados, lançamos um erro
      throw new Error('Falha ao obter insights do Meta Ads');
    }
  },

  /**
   * Verifica se os dados são simulados
   * @param {Object} data - Dados recebidos
   * @returns {boolean} True se forem dados simulados
   */
  isMockData: (data) => {
    return data && data.is_mock_data === true;
  },
  
  /**
   * Retorna detalhes do último erro para diagnóstico
   * @returns {Object} Detalhes do último erro ou null
   */
  getLastErrorDetails: () => {
    return metaReportService.lastErrorDetails;
  },
  
  /**
   * Limpa o registro do último erro
   */
  clearLastErrorDetails: () => {
    metaReportService.lastErrorDetails = null;
  }
};

export default metaReportService;
