/**
 * Utilitários para diagnóstico e correção de problemas do Google Analytics
 */

/**
 * Valida a estrutura dos dados do Google Analytics
 * @param {Object} data - Dados do Google Analytics 
 * @returns {Object} Resultado da validação
 */
const validateGoogleAnalyticsData = (data) => {
  if (!data) {
    console.error('Dados do Google Analytics estão vazios ou nulos');
    return { valid: false, errors: ['Dados ausentes'] };
  }

  const errors = [];
  
  // Verificar estrutura básica
  if (!data.rows) {
    errors.push('Estrutura de dados incompleta: propriedade "rows" ausente');
  }
  
  // Verificar dados de fontes de tráfego
  if (!data.sourceData) {
    errors.push('Dados de fontes de tráfego ausentes');
  } else if (!data.sourceData.rows) {
    errors.push('Dados de fontes de tráfego incompletos: propriedade "rows" ausente');
  }
  
  // Verificar dados de conversão
  if (!data.conversionData) {
    errors.push('Dados de conversão ausentes');
  }
  
  // Verificar dados de engajamento
  if (!data.engagementData) {
    errors.push('Dados de engajamento ausentes');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
};

/**
 * Função para registrar diagnósticos detalhados dos dados do GA
 * @param {Object} gaData - Dados do Google Analytics
 * @param {Object} funnelData - Dados do funil
 */
const logGADiagnostics = (gaData, funnelData) => {
  console.log('======== DIAGNÓSTICO DO GOOGLE ANALYTICS ========');
  
  // Verificar dados principais
  console.log('Estrutura de dados principal:', {
    temDados: !!gaData,
    temLinhas: gaData && !!gaData.rows,
    qtdLinhas: gaData && gaData.rows ? gaData.rows.length : 0,
    temSourceData: gaData && !!gaData.sourceData,
    temEngagementData: gaData && !!gaData.engagementData,
    temConversionData: gaData && !!gaData.conversionData,
    temTrafficSources: gaData && !!gaData.trafficSources
  });
  
  // Verificar dados de fontes de tráfego
  if (gaData && gaData.sourceData) {
    console.log('Dados de fontes de tráfego:', {
      temLinhas: !!gaData.sourceData.rows,
      qtdLinhas: gaData.sourceData.rows ? gaData.sourceData.rows.length : 0
    });
  }
  
  // Verificar dados do funil
  console.log('Dados do funil:', {
    temDados: !!funnelData,
    temTopPages: funnelData && !!funnelData.topPages,
    qtdPaginas: funnelData && funnelData.topPages && funnelData.topPages.rows ? funnelData.topPages.rows.length : 0,
    temDeviceData: funnelData && !!funnelData.deviceData,
    temRetentionData: funnelData && !!funnelData.retentionData
  });
  
  console.log('===============================================');
};

/**
 * Corrige a estrutura de dados do Google Analytics caso haja problemas
 * @param {Object} data - Dados do Google Analytics
 * @returns {Object} Dados corrigidos
 */
const fixGoogleAnalyticsData = (data) => {
  if (!data) {
    return {
      rows: [],
      sourceData: { rows: [] },
      engagementData: { rows: [] },
      conversionData: { rows: [] },
      trafficSources: []
    };
  }
  
  // Clonar o objeto para não modificar o original
  const fixedData = { ...data };
  
  // Garantir que a estrutura básica existe
  if (!fixedData.rows) fixedData.rows = [];
  
  // Garantir que as estruturas de dados específicas existem
  if (!fixedData.sourceData) fixedData.sourceData = { rows: [] };
  else if (!fixedData.sourceData.rows) fixedData.sourceData.rows = [];
  
  if (!fixedData.engagementData) fixedData.engagementData = { rows: [] };
  else if (!fixedData.engagementData.rows) fixedData.engagementData.rows = [];
  
  if (!fixedData.conversionData) fixedData.conversionData = { rows: [] };
  else if (!fixedData.conversionData.rows) fixedData.conversionData.rows = [];

  // Processar as fontes de tráfego em um formato mais amigável
  if (!fixedData.trafficSources && fixedData.sourceData && fixedData.sourceData.rows && fixedData.sourceData.rows.length > 0) {
    fixedData.trafficSources = transformTrafficSourceRows(fixedData.sourceData.rows);
  } else if (!fixedData.trafficSources) {
    fixedData.trafficSources = [];
  }
  
  return fixedData;
};

/**
 * Transforma os dados de fontes de tráfego do formato GA4 para um formato mais amigável
 * Adaptada para lidar com a estrutura atual da API que retorna apenas sessionDefaultChannelGroup e sessions
 * @param {Array} rows - Linhas de dados de fontes de tráfego do GA4
 * @returns {Array} Dados de fontes de tráfego transformados
 */
const transformTrafficSourceRows = (rows) => {
  if (!rows || !Array.isArray(rows)) {
    console.warn('transformTrafficSourceRows: rows não é um array válido', rows);
    return [];
  }

  console.log('Processando dados de tráfego com estrutura:', {
    totalRows: rows.length,
    exemplo: rows[0] ? {
      dimensionValues: rows[0].dimensionValues ? rows[0].dimensionValues.length : 'N/A',
      metricValues: rows[0].metricValues ? rows[0].metricValues.length : 'N/A'
    } : 'Sem dados'
  });

  return rows.map(row => {
    // Verificar se a linha tem a estrutura esperada - agora adaptada para estrutura atual
    if (!row.dimensionValues || !row.dimensionValues[0] || 
        !row.metricValues || !row.metricValues[0]) {
      console.warn('Linha com estrutura inválida:', row);
      return null;
    }
    
    // Extrair valores com a nova estrutura (apenas canal e sessões)
    const channel = row.dimensionValues[0].value || 'Não definido';
    const sessions = parseInt(row.metricValues[0].value) || 0;
    
    // Converter canais do GA4 para formato interno
    let source;
    switch(channel.toLowerCase()) {
      case 'organic search':
        source = 'organico';
        break;
      case 'direct':
        source = 'direto';
        break;
      case 'referral':
        source = 'referencia';
        break;
      case 'social':
        source = 'social';
        break;
      case 'paid search':
      case 'paid shopping':
      case 'paid social':
      case 'display':
        source = 'cpc';
        break;
      case 'email':
        source = 'email';
        break;
      default:
        source = 'outros';
    }
    
    return {
      source,
      channel,  // Mantemos o nome original do canal para referência
      sessions,
      users: Math.round(sessions * 0.8),  // Estimativa: 80% das sessões são de usuários únicos
      medium: source === 'cpc' ? 'Pago' : 'Orgânico',
      conversions: 0,  // Valor padrão já que não temos este dado
      engagementRate: 0  // Valor padrão já que não temos este dado
    };
  }).filter(item => item !== null);
};

/**
 * Transforma os dados de páginas mais visualizadas do formato GA4 para um formato mais amigável
 * @param {Array} rows - Linhas de dados de páginas mais visualizadas do GA4
 * @returns {Array} Dados de páginas mais visualizadas transformados
 */
const transformTopPagesRows = (rows) => {
  if (!rows || !Array.isArray(rows)) {
    console.warn('transformTopPagesRows: rows não é um array válido', rows);
    return [];
  }

  return rows.map(row => {
    // Verificar se a linha tem a estrutura esperada
    if (!row.dimensionValues || row.dimensionValues.length < 1 || 
        !row.metricValues || row.metricValues.length < 3) {
      console.warn('Linha com estrutura inválida em topPages:', row);
      return null;
    }
    
    // Extrair valores
    const pagePath = row.dimensionValues[0].value || '(não definido)';
    const views = parseInt(row.metricValues[0].value) || 0;
    const users = parseInt(row.metricValues[1].value) || 0;
    const avgTime = parseFloat(row.metricValues[2].value) || 0;
    
    return {
      pagePath,
      views,
      users,
      avgTime
    };
  }).filter(item => item !== null);
};

export { validateGoogleAnalyticsData, logGADiagnostics, fixGoogleAnalyticsData, transformTrafficSourceRows, transformTopPagesRows };
