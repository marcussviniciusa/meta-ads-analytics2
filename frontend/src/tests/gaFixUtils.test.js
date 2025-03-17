/**
 * Testes para as funções de correção e diagnóstico do Google Analytics
 */

import { validateGoogleAnalyticsData, logGADiagnostics, fixGoogleAnalyticsData } from '../utils/gaFixUtils';

// Mock da função console.log para testar os logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('Utilitários de correção do Google Analytics', () => {
  let consoleOutput = [];
  
  // Setup para capturar saídas do console
  beforeEach(() => {
    consoleOutput = [];
    console.log = jest.fn((...args) => {
      consoleOutput.push(args);
      originalConsoleLog(...args);
    });
    console.error = jest.fn((...args) => {
      consoleOutput.push(args);
      originalConsoleError(...args);
    });
    console.warn = jest.fn((...args) => {
      consoleOutput.push(args);
      originalConsoleWarn(...args);
    });
  });
  
  // Restaurar console original após testes
  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe('validateGoogleAnalyticsData', () => {
    test('deve identificar dados nulos como inválidos', () => {
      const result = validateGoogleAnalyticsData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dados ausentes');
    });

    test('deve identificar estrutura incompleta como inválida', () => {
      const incompleteData = {
        // Sem propriedade rows
      };
      const result = validateGoogleAnalyticsData(incompleteData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Estrutura de dados incompleta: propriedade "rows" ausente');
    });

    test('deve identificar dados de fontes de tráfego ausentes', () => {
      const dataWithoutSource = {
        rows: [],
        // Sem sourceData
      };
      const result = validateGoogleAnalyticsData(dataWithoutSource);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dados de fontes de tráfego ausentes');
    });

    test('deve validar dados completos corretamente', () => {
      const completeData = {
        rows: [],
        sourceData: { rows: [] },
        engagementData: { rows: [] },
        conversionData: { rows: [] }
      };
      const result = validateGoogleAnalyticsData(completeData);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('logGADiagnostics', () => {
    test('deve registrar mensagens de diagnóstico quando dados estão ausentes', () => {
      logGADiagnostics(null, null);
      
      // Verificar se os logs foram chamados
      expect(console.log).toHaveBeenCalledWith(
        '======== DIAGNÓSTICO DO GOOGLE ANALYTICS ========'
      );
      expect(consoleOutput.length).toBeGreaterThan(1);
    });

    test('deve registrar detalhes dos dados quando disponíveis', () => {
      const gaData = {
        rows: [{ values: [1, 2, 3] }],
        sourceData: { rows: [{ values: [1, 2] }] },
        engagementData: { rows: [] },
        conversionData: { rows: [] }
      };
      
      const funnelData = {
        topPages: { rows: [{ values: [1, 2] }] },
        deviceData: { rows: [] },
        retentionData: { rows: [] }
      };
      
      logGADiagnostics(gaData, funnelData);
      
      // Verificar se os detalhes específicos foram registrados
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DIAGNÓSTICO DO GOOGLE ANALYTICS'), 
        expect.any(Object)
      );
    });
  });

  describe('fixGoogleAnalyticsData', () => {
    test('deve criar estrutura completa para dados nulos', () => {
      const result = fixGoogleAnalyticsData(null);
      
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('sourceData.rows');
      expect(result).toHaveProperty('engagementData.rows');
      expect(result).toHaveProperty('conversionData.rows');
      
      expect(Array.isArray(result.rows)).toBe(true);
      expect(Array.isArray(result.sourceData.rows)).toBe(true);
    });

    test('deve corrigir estrutura incompleta', () => {
      const incompleteData = {
        rows: [{ values: [1, 2, 3] }],
        // Sem sourceData
        engagementData: {} // Sem rows
      };
      
      const result = fixGoogleAnalyticsData(incompleteData);
      
      expect(result.rows).toEqual(incompleteData.rows);
      expect(result).toHaveProperty('sourceData.rows');
      expect(Array.isArray(result.sourceData.rows)).toBe(true);
      expect(result).toHaveProperty('engagementData.rows');
      expect(Array.isArray(result.engagementData.rows)).toBe(true);
    });

    test('não deve modificar dados já completos', () => {
      const completeData = {
        rows: [{ values: [1, 2, 3] }],
        sourceData: { rows: [{ values: [1, 2] }] },
        engagementData: { rows: [] },
        conversionData: { rows: [] }
      };
      
      const result = fixGoogleAnalyticsData(completeData);
      
      expect(result.rows).toBe(completeData.rows); // Mesma referência de objeto
      expect(result.sourceData.rows).toBe(completeData.sourceData.rows);
      expect(result.engagementData.rows).toBe(completeData.engagementData.rows);
      expect(result.conversionData.rows).toBe(completeData.conversionData.rows);
    });
  });
});
