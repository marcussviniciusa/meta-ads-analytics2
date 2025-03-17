/**
 * Google Analytics Debugger
 * 
 * Ferramenta para diagnóstico e validação em tempo real dos dados do Google Analytics
 */

import { validateGoogleAnalyticsData, logGADiagnostics, fixGoogleAnalyticsData } from './gaFixUtils';
import { checkGoogleAnalyticsConfig, testGoogleAnalyticsAPI } from './diagnosticUtils';

/**
 * Inicializa o depurador do Google Analytics para monitorar problemas em tempo real
 * @param {Object} googleAnalyticsService - Serviço do Google Analytics
 */
export const initGADebugger = (googleAnalyticsService) => {
  if (process.env.NODE_ENV === 'development' || localStorage.getItem('enableGADebug') === 'true') {
    console.log('🔍 Depurador do Google Analytics inicializado');
    
    // Adicionar ao objeto window para acesso global via console
    window.__gaDebugger = {
      validateData: validateGoogleAnalyticsData,
      logDiagnostics: logGADiagnostics,
      fixData: fixGoogleAnalyticsData,
      checkConfig: checkGoogleAnalyticsConfig,
      testAPI: async (propertyId) => {
        if (!propertyId) {
          console.error('É necessário fornecer um propertyId para testar a API');
          return;
        }
        return await testGoogleAnalyticsAPI(googleAnalyticsService, propertyId);
      },
      monitorGAData: (dashboard) => {
        if (!dashboard) {
          console.error('É necessário fornecer a instância do dashboard');
          return;
        }
        
        // Salvar referência do estado original
        const originalSetState = dashboard.setState.bind(dashboard);
        
        // Sobrescrever setState para monitorar mudanças relacionadas ao GA
        dashboard.setState = function(state, callback) {
          // Chamar setState original
          originalSetState(state, callback);
          
          // Monitorar apenas mudanças relacionadas ao GA
          if (state.gaData) {
            console.log('🔍 Mudança detectada em gaData:', state.gaData);
            const validationResult = validateGoogleAnalyticsData(state.gaData);
            
            if (!validationResult.valid) {
              console.warn('⚠️ Dados do GA inválidos:', validationResult.errors);
              
              // Sugerir correção automática
              console.info('💡 Use window.__gaDebugger.fixData(gaData) para corrigir automaticamente a estrutura dos dados');
            }
          }
          
          if (state.funnelData) {
            console.log('🔍 Mudança detectada em funnelData:', state.funnelData);
          }
        };
        
        console.log('🔍 Monitoramento do estado do dashboard ativado');
      },
      
      help: () => {
        console.log(`
          === Google Analytics Debugger ===
          
          Comandos disponíveis:
          
          window.__gaDebugger.validateData(gaData)
            Valida a estrutura dos dados do GA
          
          window.__gaDebugger.logDiagnostics(gaData, funnelData)
            Exibe informações detalhadas para diagnóstico
          
          window.__gaDebugger.fixData(gaData)
            Corrige automaticamente a estrutura de dados
          
          window.__gaDebugger.checkConfig()
            Verifica a configuração geral do GA
          
          window.__gaDebugger.testAPI(propertyId)
            Testa a conexão com a API do GA
          
          window.__gaDebugger.monitorGAData(dashboard)
            Monitora mudanças no estado do dashboard relacionadas ao GA
        `);
      }
    };
    
    // Exibir instruções de uso
    console.log('🔍 Depurador do GA disponível em window.__gaDebugger');
    console.log('💡 Use window.__gaDebugger.help() para ver os comandos disponíveis');
  }
};

/**
 * Ativa o depurador do Google Analytics
 */
export const enableGADebugger = () => {
  localStorage.setItem('enableGADebug', 'true');
  console.log('🔍 Depurador do Google Analytics ativado. Recarregue a página para inicializar.');
};

/**
 * Desativa o depurador do Google Analytics
 */
export const disableGADebugger = () => {
  localStorage.removeItem('enableGADebug');
  console.log('🔍 Depurador do Google Analytics desativado. Recarregue a página para aplicar a mudança.');
};
