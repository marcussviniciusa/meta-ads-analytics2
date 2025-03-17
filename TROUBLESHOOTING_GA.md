# Guia de Solução de Problemas do Google Analytics

## Instruções para Diagnóstico e Correção de Problemas no Dashboard

Este guia fornece passos detalhados para identificar e corrigir problemas relacionados ao Google Analytics no dashboard, especialmente nas seções de fontes de tráfego e análise de páginas.

## Ferramentas de Diagnóstico Disponíveis

Foram implementadas várias ferramentas de diagnóstico no sistema:

### 1. Funções de Validação e Correção de Dados

```javascript
// Importar as funções
import { 
  validateGoogleAnalyticsData, 
  logGADiagnostics, 
  fixGoogleAnalyticsData 
} from '../utils/gaFixUtils';

// Verificar a estrutura dos dados
const validationResult = validateGoogleAnalyticsData(gaData);
if (!validationResult.valid) {
  console.error('Problemas com os dados do GA:', validationResult.errors);
}

// Registrar informações detalhadas de diagnóstico
logGADiagnostics(gaData, funnelData);

// Corrigir automaticamente a estrutura de dados
const fixedData = fixGoogleAnalyticsData(gaData);
```

### 2. Ferramentas de Diagnóstico Avançado

```javascript
// Importar as funções
import {
  checkGoogleAnalyticsConfig,
  testGoogleAnalyticsAPI,
  checkUserPermissions
} from '../utils/diagnosticUtils';

// Verificar a configuração do GA
checkGoogleAnalyticsConfig();

// Testar a conexão com a API
await testGoogleAnalyticsAPI(googleAnalyticsService, propertyId);

// Verificar permissões do usuário
const hasAccess = await checkUserPermissions(
  googleAnalyticsService, 
  userId, 
  propertyId
);
```

## Passos para Solução de Problemas

### 1. Verificar Logs de Console

A primeira etapa é verificar os logs de diagnóstico no console do navegador:

1. Abra o dashboard no navegador
2. Abra as ferramentas de desenvolvimento (F12)
3. Selecione a aba "Console"
4. Procure por logs com o prefixo "DIAGNÓSTICO DO GOOGLE ANALYTICS"

### 2. Verificar Estrutura de Dados

Se os logs indicarem problemas na estrutura de dados:

1. Verifique se os dados retornados pela API são válidos
2. Confirme que todas as dimensões e métricas solicitadas estão disponíveis na propriedade do GA
3. Verifique se há filtros ativos que podem estar reduzindo o conjunto de dados

### 3. Testar Permissões e Configurações

Se o problema persistir:

1. Execute a função `checkUserPermissions` para verificar se o usuário tem acesso à propriedade
2. Execute a função `checkGoogleAnalyticsConfig` para verificar a configuração geral
3. Verifique as datas do período selecionado para garantir que estejam dentro de um intervalo válido

### 4. Solução Manual

Se os passos automáticos não resolverem o problema:

1. Insira o seguinte código no console para obter uma visão completa dos dados:

```javascript
// No console do navegador, após carregar o dashboard:
const dashboardComponent = document.querySelector('[data-testid="dashboard-component"]');
const dashboardInstance = dashboardComponent?.__react$instance;
console.log('Estado do dashboard:', dashboardInstance?.state);
console.log('Props do dashboard:', dashboardInstance?.props);
```

2. Verifique se há tokens ou credenciais expiradas:

```javascript
// Verificar token no localStorage
console.log('Token:', localStorage.getItem('authToken'));
```

## Problemas Comuns e Soluções

### Dados de Fontes de Tráfego Ausentes

**Sintoma**: A seção "Principais Fontes de Tráfego" está vazia ou mostra mensagem de erro.

**Solução**:
1. Verifique se `sourceData` está presente na resposta da API
2. Confirme que a conta do GA tem dados de fontes de tráfego para o período selecionado
3. Aplique a função `fixGoogleAnalyticsData` para garantir que a estrutura seja válida

### Análise de Páginas Ausente

**Sintoma**: A seção de funil está vazia ou mostra mensagem de erro.

**Solução**:
1. Verifique se `topPages` está presente nos dados de funil
2. Confirme que a propriedade do GA tem dados de páginas para o período selecionado
3. Tente aumentar o período de análise para capturar mais dados

## Contato para Suporte Adicional

Se os problemas persistirem após tentar todos os passos acima, entre em contato com a equipe de desenvolvimento para suporte adicional.

---

*Documentação atualizada em 17 de março de 2025*
