/**
 * Utilities para gerenciamento de gráficos
 */

import Chart from 'chart.js/auto';

/**
 * Configura limites para o tamanho máximo do canvas para evitar o erro "Canvas exceeds max size"
 */
export const setupChartSizeLimits = () => {
  // Definir valores de limites padrão
  const MAX_DIMENSION = 800; // Reduzido para evitar problemas de tamanho
  const MAX_ASPECT_RATIO = 2.5; // Proporção máxima permitida (largura:altura)
  
  // Adicionar estilo global para todos os canvas de gráficos
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    canvas.chartjs-render-monitor {
      max-width: 100% !important;
      max-height: 400px !important;
    }
    
    .chart-container {
      max-height: 400px !important;
      position: relative;
      height: 300px !important;
    }
    
    .chartjs-size-monitor {
      max-width: 100% !important;
      max-height: 400px !important;
    }
  `;
  document.head.appendChild(styleElement);
  
  // Definir os defaults do Chart.js para evitar áreas extremamente grandes
  if (Chart.defaults) {
    // Garantir que todos os gráficos tenham uma proporção razoável
    Chart.defaults.maintainAspectRatio = true;
    Chart.defaults.aspectRatio = 2;
    Chart.defaults.responsive = true;
    
    // Limitar plugins para os que realmente precisamos
    if (Chart.defaults.plugins) {
      Chart.defaults.plugins.title = Chart.defaults.plugins.title || {};
      Chart.defaults.plugins.title.display = true;
      Chart.defaults.plugins.title.font = {
        size: 14,
        weight: 'bold'
      };
      
      Chart.defaults.plugins.legend = Chart.defaults.plugins.legend || {};
      Chart.defaults.plugins.legend.position = 'bottom';
      Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
      Chart.defaults.plugins.legend.labels.boxWidth = 15;
      Chart.defaults.plugins.legend.labels.padding = 10;
    }
  }
  
  console.log('Limites de tamanho de canvas configurados com sucesso para Chart.js');
  
  // Corrigir todas as instâncias de canvas já existentes
  setTimeout(() => {
    const fixCanvas = () => {
      // Selecionar todos os canvas relacionados ao Chart.js
      const canvases = document.querySelectorAll('canvas.chartjs-render-monitor');
      
      canvases.forEach(canvas => {
        // Aplicar limites diretos no elemento
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '400px';
        
        // Ajustar o contêiner pai
        const parent = canvas.parentElement;
        if (parent) {
          parent.style.maxHeight = '400px';
          parent.style.height = '300px';
          parent.style.position = 'relative';
        }
      });
    };
    
    // Executar imediatamente
    fixCanvas();
    
    // E também após uma pequena espera para garantir que os gráficos foram carregados
    setTimeout(fixCanvas, 500);
  }, 100);
};

/**
 * Aplica correções a todos os elementos canvas existentes na página
 * para evitar problemas de dimensões e proporções inadequadas
 */
export const fixAllCanvasDimensions = () => {
  // Definir dimensões máximas e proporções aceitáveis
  const MAX_DIMENSION = 1500;
  const MAX_ASPECT_RATIO = 3;
  const MIN_WIDTH = 280;  // Valor reduzido para evitar forçar um mínimo muito grande
  const MIN_HEIGHT = 180; // Valor reduzido para evitar forçar um mínimo muito grande
  
  // Seleciona todos os elementos canvas na página
  const canvasElements = document.querySelectorAll('canvas');
  let canvasResized = 0;
  
  canvasElements.forEach(canvas => {
    // Verificar se o canvas tem um Chart.js associado
    const chartInstance = getChartInstance(canvas);
    
    // Obter dimensões atuais do canvas
    const currentWidth = canvas.width;
    const currentHeight = canvas.height;
    
    // Verificar se as dimensões estão válidas
    if (!currentWidth || !currentHeight || isNaN(currentWidth) || isNaN(currentHeight)) {
      return; // Ignorar canvas com dimensões inválidas
    }
    
    // Verificar se o canvas precisa de ajuste
    const ratio = currentWidth / currentHeight;
    let needsResize = false;
    let newWidth = currentWidth;
    let newHeight = currentHeight;
    
    // Regra 1: Verificar proporção extrema
    if (ratio > MAX_ASPECT_RATIO) {
      // Canvas muito largo e baixo
      newHeight = Math.max(MIN_HEIGHT, Math.ceil(newWidth / MAX_ASPECT_RATIO));
      needsResize = true;
    } else if (ratio < 1/MAX_ASPECT_RATIO) {
      // Canvas muito alto e estreito
      newWidth = Math.max(MIN_WIDTH, Math.ceil(newHeight / MAX_ASPECT_RATIO));
      needsResize = true;
    }
    
    // Regra 2: Verificar dimensões máximas
    if (newWidth > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / newWidth;
      newWidth = MAX_DIMENSION;
      newHeight = Math.round(newHeight * scale);
      needsResize = true;
    }
    
    if (newHeight > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / newHeight;
      newHeight = MAX_DIMENSION;
      newWidth = Math.round(newWidth * scale);
      needsResize = true;
    }
    
    // Aplicar ajustes se necessário
    if (needsResize) {
      // Registrar a mudança
      console.log(`Canvas ${currentWidth}x${currentHeight} ajustado para ${newWidth}x${newHeight}`);
      canvasResized++;
      
      // Abordagem 1: Redimensionar o canvas diretamente
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Abordagem 2: Se houver uma instância Chart.js, usar seu método de resize
      if (chartInstance) {
        try {
          // Espaçar a execução para evitar conflitos com outras operações
          setTimeout(() => {
            chartInstance.resize(newWidth, newHeight);
            chartInstance.update();
          }, 0);
        } catch (error) {
          console.error('Erro ao redimensionar gráfico:', error);
        }
      }
    }
  });
  
  if (canvasResized > 0) {
    console.log(`Corrigidos ${canvasResized} de ${canvasElements.length} canvas`);
  }
  
  return canvasResized;
};

/**
 * Função auxiliar para obter a instância Chart.js associada a um canvas
 */
function getChartInstance(canvas) {
  // Chart.js 3.x guarda a instância em canvas.__chartjs__
  if (canvas.__chartjs__ && canvas.__chartjs__.length > 0) {
    return canvas.__chartjs__[0];
  }
  
  // Chart.js 2.x guarda a instância em canvas.chart
  if (canvas.chart) {
    return canvas.chart;
  }
  
  return null;
}

/**
 * Obtém configurações otimizadas para gráficos de linha
 * @param {Object} customOptions - Opções personalizadas a serem mescladas
 * @returns {Object} Configurações do gráfico
 */
export const getLineChartOptions = (customOptions = {}) => {
  const dataPoints = customOptions.dataPoints || 0;
  
  // Desabilitar animações para gráficos com muitos pontos
  const animation = dataPoints > 100 ? { duration: 0 } : { duration: 500 };
  
  // Tamanho de ponto reduzido para melhor performance
  const pointRadius = dataPoints > 50 ? (dataPoints > 200 ? 0 : 1) : 3;
  
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            let value = context.raw || 0;
            return `${label}: ${value}`;
          }
        }
      }
    },
    elements: {
      point: {
        radius: pointRadius,
        hoverRadius: pointRadius + 2
      },
      line: {
        tension: 0.2
      }
    }
  };
  
  // Mesclar opções padrão com opções personalizadas
  return deepMerge(defaultOptions, customOptions);
};

/**
 * Obtém configurações otimizadas para gráficos de pizza/rosca
 * @param {Object} customOptions - Opções personalizadas a serem mescladas
 * @returns {Object} Configurações do gráfico
 */
export const getPieChartOptions = (customOptions = {}) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '30%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 15,
          padding: 10,
          font: {
            size: 10
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${value}`;
          }
        }
      }
    }
  };
  
  // Mesclar opções padrão com opções personalizadas
  return deepMerge(defaultOptions, customOptions);
};

/**
 * Utilitário para mesclar objetos profundamente
 * @private
 */
function deepMerge(target, source) {
  const output = Object.assign({}, target);
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * Verifica se um valor é um objeto
 * @private
 */
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
