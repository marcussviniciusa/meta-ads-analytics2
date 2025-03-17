/**
 * Utilitários de diagnóstico para verificação de configuração e dados
 */

/**
 * Verifica a configuração do Google Analytics e registra os problemas encontrados
 * @returns {Object} Resultado da verificação
 */
export const checkGoogleAnalyticsConfig = () => {
  console.log('=== VERIFICAÇÃO DE CONFIGURAÇÃO DO GOOGLE ANALYTICS ===');
  
  const issues = [];
  
  // Verificar se o arquivo de configuração existe
  try {
    const gtagScript = document.querySelector('script[src*="gtag/js"]');
    if (!gtagScript) {
      issues.push('Script do Google Analytics (gtag.js) não foi encontrado na página');
    } else {
      console.log('✅ Script do Google Analytics encontrado');
    }
  } catch (error) {
    console.error('Erro ao verificar scripts do Google Analytics:', error);
    issues.push('Erro ao verificar a configuração do Google Analytics');
  }
  
  // Verificar a função gtag
  if (typeof window.gtag !== 'function') {
    issues.push('Função gtag não está disponível. A configuração do Google Analytics pode estar incompleta');
  } else {
    console.log('✅ Função gtag está disponível');
  }
  
  // Resultado da verificação
  const result = {
    success: issues.length === 0,
    issues: issues,
    timestamp: new Date().toISOString()
  };
  
  console.log('Resultado da verificação:', result);
  console.log('=== FIM DA VERIFICAÇÃO ===');
  
  return result;
};

/**
 * Testa a API do Google Analytics fazendo uma solicitação mínima
 * @param {Object} googleAnalyticsService - Serviço do Google Analytics
 * @param {string} propertyId - ID da propriedade do Google Analytics
 * @returns {Promise<Object>} Resultado do teste
 */
export const testGoogleAnalyticsAPI = async (googleAnalyticsService, propertyId) => {
  console.log('=== TESTE DA API DO GOOGLE ANALYTICS ===');
  console.log('Testando com propertyId:', propertyId);
  
  try {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const startDate = lastWeek.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    
    console.log('Período de teste:', startDate, 'até', endDate);
    
    // Teste simples para verificar se a API responde
    const testResult = await googleAnalyticsService.getDashboardReport(
      propertyId,
      startDate,
      endDate
    );
    
    console.log('API respondeu com sucesso');
    console.log('Dados recebidos:', {
      temMetricHeaders: !!testResult.metricHeaders,
      temDimensionHeaders: !!testResult.dimensionHeaders,
      temRows: !!testResult.rows,
      quantidadeRows: testResult.rows ? testResult.rows.length : 0,
      temSourceData: !!testResult.sourceData,
      temEngagementData: !!testResult.engagementData
    });
    
    return {
      success: true,
      data: testResult,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao testar a API do Google Analytics:', error);
    
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao acessar a API do Google Analytics',
      timestamp: new Date().toISOString()
    };
  } finally {
    console.log('=== FIM DO TESTE ===');
  }
};

/**
 * Verifica os permisos e configurações da conta do Google Analytics
 * @param {Object} googleAnalyticsService - Serviço do Google Analytics
 * @param {string} propertyId - ID da propriedade do Google Analytics
 * @returns {Promise<Object>} Resultado da verificação de permissões
 */
export const checkGoogleAnalyticsPermissions = async (googleAnalyticsService, propertyId) => {
  console.log('=== VERIFICAÇÃO DE PERMISSÕES DO GOOGLE ANALYTICS ===');
  
  try {
    const permissionsResult = await googleAnalyticsService.checkAccountPermissions(propertyId);
    
    console.log('Resultado da verificação de permissões:', permissionsResult);
    return {
      success: true,
      permissions: permissionsResult,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao verificar permissões',
      timestamp: new Date().toISOString()
    };
  } finally {
    console.log('=== FIM DA VERIFICAÇÃO DE PERMISSÕES ===');
  }
};
