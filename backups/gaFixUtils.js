/**
 * Utilitários para corrigir problemas relacionados ao Google Analytics no Dashboard
 */

/**
 * Verifica se os dados de fontes de tráfego são válidos
 * @param {Object} data - Dados do Google Analytics
 * @returns {boolean} - Verdadeiro se os dados forem válidos
 */
export const hasValidSourceData = (data) => {
  if (!data) return false;
  
  // Verifica se sourceData existe e tem estrutura válida
  if (!data.sourceData) return false;
  
  // Verifica se há linhas de dados disponíveis
  return data.sourceData.rows && data.sourceData.rows.length > 0;
};

/**
 * Verifica se os dados de funil são válidos
 * @param {Object} funnelData - Dados do funil
 * @returns {boolean} - Verdadeiro se os dados forem válidos
 */
export const hasValidFunnelData = (funnelData) => {
  if (!funnelData) return false;
  
  // Verifica se topPages existe e tem estrutura válida
  return funnelData.topPages && 
         funnelData.topPages.rows && 
         funnelData.topPages.rows.length > 0;
};

/**
 * Registra informações de diagnóstico do Google Analytics no console
 * @param {Object} gaData - Dados do Google Analytics
 * @param {Object} funnelData - Dados do funil 
 */
export const logGADiagnostics = (gaData, funnelData) => {
  console.log('=== DIAGNÓSTICO DE DADOS DO GOOGLE ANALYTICS ===');
  console.log('gaData disponível:', gaData ? 'Sim' : 'Não');
  
  if (gaData) {
    console.log('Estrutura de gaData:', {
      temMetricHeaders: !!gaData.metricHeaders,
      temDimensionHeaders: !!gaData.dimensionHeaders,
      temRows: !!gaData.rows,
      quantidadeRows: gaData.rows ? gaData.rows.length : 0,
      temSourceData: !!gaData.sourceData,
      temEngagementData: !!gaData.engagementData,
      temConversionData: !!gaData.conversionData
    });
    
    if (gaData.sourceData) {
      console.log('Estrutura de sourceData:', {
        temRows: !!gaData.sourceData.rows,
        quantidadeRows: gaData.sourceData.rows ? gaData.sourceData.rows.length : 0
      });
    }
  }
  
  console.log('funnelData disponível:', funnelData ? 'Sim' : 'Não');
  
  if (funnelData) {
    console.log('Estrutura de funnelData:', {
      temTopPages: !!funnelData.topPages,
      temDeviceData: !!funnelData.deviceData,
      temRetentionData: !!funnelData.retentionData
    });
    
    if (funnelData.topPages) {
      console.log('Estrutura de topPages:', {
        temRows: !!funnelData.topPages.rows,
        quantidadeRows: funnelData.topPages.rows ? funnelData.topPages.rows.length : 0
      });
    }
  }
  
  console.log('=== FIM DO DIAGNÓSTICO ===');
};
