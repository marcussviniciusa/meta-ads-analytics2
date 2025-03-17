/**
 * Utilitários para diagnóstico e resolução de problemas
 */

/**
 * Verifica a configuração do Google Analytics
 * Registra no console informações detalhadas sobre a configuração
 */
const checkGoogleAnalyticsConfig = () => {
  console.log('Iniciando diagnóstico da configuração do Google Analytics...');
  
  // Verificar se a API do GA está disponível (frontend)
  const gaApiPresent = typeof window !== 'undefined' && window.gtag;
  console.log('API do Google Analytics (gtag) disponível no frontend:', gaApiPresent ? 'Sim' : 'Não');
  
  // Verificar variáveis de ambiente
  if (typeof process !== 'undefined' && process.env) {
    const requiredEnvVars = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingEnvVars.length > 0) {
      console.warn('Variáveis de ambiente ausentes:', missingEnvVars.join(', '));
    } else {
      console.log('Todas as variáveis de ambiente necessárias estão configuradas');
    }
  }
  
  console.log('Diagnóstico da configuração do Google Analytics concluído');
};

/**
 * Testa a API do Google Analytics fazendo uma requisição simples
 * @param {Object} service - Serviço do Google Analytics
 * @param {string} propertyId - ID da propriedade
 */
const testGoogleAnalyticsAPI = async (service, propertyId) => {
  if (!service || !propertyId) {
    console.error('Serviço ou propertyId não fornecidos para o teste');
    return;
  }
  
  console.log('Iniciando teste de conexão com a API do Google Analytics...');
  console.log(`Property ID: ${propertyId}`);
  
  try {
    // Obter data atual e de 7 dias atrás para um teste simples
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    console.log(`Período de teste: ${formattedStartDate} a ${formattedEndDate}`);
    
    // Fazer uma requisição básica
    console.log('Fazendo requisição de teste para a API...');
    const testResult = await service.getBasicReport(
      propertyId,
      formattedStartDate,
      formattedEndDate
    );
    
    if (testResult && testResult.rows && testResult.rows.length > 0) {
      console.log('Teste bem-sucedido! Dados recebidos da API do Google Analytics');
      console.log(`Quantidade de linhas recebidas: ${testResult.rows.length}`);
    } else {
      console.warn('Requisição concluída, mas sem dados retornados');
      console.log('Resposta:', testResult);
    }
  } catch (error) {
    console.error('Erro ao testar a API do Google Analytics:', error);
    
    if (error.response) {
      console.error('Código de status HTTP:', error.response.status);
      console.error('Mensagem de erro:', error.response.data);
    }
  }
};

/**
 * Verifica se o usuário tem as permissões necessárias para acessar os dados do GA
 * @param {Object} service - Serviço do Google Analytics
 * @param {string} userId - ID do usuário
 * @param {string} propertyId - ID da propriedade
 * @returns {Promise<boolean>} - True se o usuário tem permissão
 */
const checkUserPermissions = async (service, userId, propertyId) => {
  if (!service || !userId || !propertyId) {
    console.error('Parâmetros incompletos para verificação de permissões');
    return false;
  }
  
  try {
    console.log('Verificando permissões do usuário...');
    const hasAccess = await service.hasPropertyAccess(userId, propertyId);
    
    if (hasAccess) {
      console.log('Usuário tem acesso à propriedade do Google Analytics');
    } else {
      console.warn('Usuário NÃO tem acesso à propriedade do Google Analytics');
    }
    
    return hasAccess;
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return false;
  }
};

/**
 * Formata uma data para o formato yyyy-MM-dd
 * @param {Date} date - Objeto de data
 * @returns {string} - Data formatada
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export { 
  checkGoogleAnalyticsConfig, 
  testGoogleAnalyticsAPI, 
  checkUserPermissions 
};
