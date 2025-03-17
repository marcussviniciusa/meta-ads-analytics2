/**
 * Script para corrigir a estrutura de dados no Frontend para exibir corretamente as
 * fontes de tráfego e análise de páginas no dashboard do Google Analytics.
 */

// Este script deve ser incorporado ao Dashboard.js

// 1. Atualizar a função fetchGoogleAnalyticsData para processar melhor os dados

/**
 * Versão melhorada da função fetchGoogleAnalyticsData
 */
const fetchGoogleAnalyticsData = async () => {
  setLoadingGa(true);
  setGaError('');
  
  try {
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');
    
    // Log de diagnóstico antes de chamar a API
    console.log('Buscando dados do Google Analytics com os parâmetros:', {
      propertyId: selectedGaProperty,
      startDate: formattedStartDate,
      endDate: formattedEndDate
    });
    
    const data = await googleAnalyticsService.getDashboardReport(
      selectedGaProperty,
      formattedStartDate,
      formattedEndDate
    );
    
    console.log('Dados do Google Analytics obtidos:', data);
    
    // Diagnosticar estrutura dos dados recebidos
    console.log('Diagnóstico detalhado da estrutura:', {
      hasSourceData: !!data?.sourceData,
      sourceDataRows: data?.sourceData?.rows ? data.sourceData.rows.length : 0,
      firstSourceRow: data?.sourceData?.rows?.[0] ? 'Presente' : 'Ausente',
      sourceDataStructure: data?.sourceData ? Object.keys(data.sourceData) : []
    });
    
    // Log detalhado para diagnóstico
    logGADiagnostics(data, funnelData);
    
    // Corrigir estrutura de dados para garantir que todos os campos necessários existam
    const fixedData = fixGoogleAnalyticsData(data);
    
    // Transformar os dados para garantir que fontes de tráfego estejam no formato esperado
    // NOTA: Esta é a parte crítica que estava faltando antes
    if (!fixedData.trafficSources && fixedData.sourceData && fixedData.sourceData.rows) {
      console.log('Adaptando dados de fontes de tráfego para o formato esperado...');
      
      // Aqui convertemos o formato rows para trafficSources
      fixedData.trafficSources = fixedData.sourceData.rows.map(row => {
        // Verificar se a linha tem a estrutura esperada
        if (!row.dimensionValues || row.dimensionValues.length < 2 || 
            !row.metricValues || row.metricValues.length < 4) {
          console.warn('Linha com estrutura inválida:', row);
          return null;
        }
        
        // Extrair valores
        const source = row.dimensionValues[0].value || 'Direto';
        const medium = row.dimensionValues[1].value || 'Não definido';
        const users = parseInt(row.metricValues[0].value) || 0;
        const sessions = parseInt(row.metricValues[1].value) || 0;
        const conversions = parseInt(row.metricValues[2].value) || 0;
        const engagementRate = parseFloat(row.metricValues[3].value) || 0;
        
        return {
          source,
          medium,
          users,
          sessions,
          conversions,
          engagementRate
        };
      }).filter(item => item !== null);
      
      console.log(`Adaptados ${fixedData.trafficSources.length} registros de fontes de tráfego`);
    }
    
    setGaData(fixedData);
    
    // Também carregar dados detalhados do funil
    fetchFunnelData(formattedStartDate, formattedEndDate);
  } catch (err) {
    setGaError('Não foi possível carregar os dados do Google Analytics.');
    console.error('Erro ao buscar dados do Google Analytics:', err);
  } finally {
    setLoadingGa(false);
  }
};

/**
 * Versão melhorada da função renderGaTrafficSourcesSection
 */
const renderGaTrafficSourcesSection = () => {
  // Log de diagnóstico
  console.log("Renderizando seção de fontes de tráfego, dados disponíveis:", 
              gaData ? `Sim (sourceData: ${gaData.sourceData ? "Sim" : "Não"}, trafficSources: ${gaData.trafficSources ? "Sim" : "Não"})` : "Não");
               
  // Verificar dados detalhados para diagnóstico
  if (gaData) {
    console.log("Estrutura completa de dados GA:", {
      hasSourceData: !!gaData.sourceData,
      sourceDataRowCount: gaData.sourceData?.rows ? gaData.sourceData.rows.length : 0,
      hasTrafficSources: !!gaData.trafficSources,
      trafficSourcesCount: gaData.trafficSources ? gaData.trafficSources.length : 0
    });
  }
  
  // Tentar usar trafficSources primeiro (formato novo), depois sourceData (formato API)
  if (!gaData || 
      (!gaData.trafficSources || gaData.trafficSources.length === 0) && 
      (!gaData.sourceData || !gaData.sourceData.rows || gaData.sourceData.rows.length === 0)) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Dados de fontes de tráfego não disponíveis.
      </Alert>
    );
  }
  
  // Se tivermos trafficSources, usamos esse formato
  if (gaData.trafficSources && gaData.trafficSources.length > 0) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Principais Fontes de Tráfego
        </Typography>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ height: 300, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Fonte</th>
                    <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Meio</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Usuários</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Sessões</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Conversões</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Taxa de Engajamento</th>
                  </tr>
                </thead>
                <tbody>
                  {gaData.trafficSources.map((source, index) => (
                    <tr key={index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {source.source || 'Direto'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {source.medium || 'Não definido'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {source.users ? source.users.toLocaleString() : '0'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {source.sessions ? source.sessions.toLocaleString() : '0'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {source.conversions ? source.conversions.toLocaleString() : '0'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {(source.engagementRate * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }
  
  // Caso contrário, usar o formato da API (sourceData.rows)
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Principais Fontes de Tráfego
      </Typography>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ height: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Fonte</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Meio</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Usuários</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Sessões</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Conversões</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Taxa de Engajamento</th>
                </tr>
              </thead>
              <tbody>
                {gaData.sourceData.rows.map((row, index) => {
                  // Verificar se a linha tem a estrutura esperada
                  if (!row.dimensionValues || row.dimensionValues.length < 2 || 
                      !row.metricValues || row.metricValues.length < 4) {
                    console.warn('Linha com estrutura inválida:', row);
                    return null;
                  }
                  
                  const source = row.dimensionValues[0].value;
                  const medium = row.dimensionValues[1].value;
                  const users = parseInt(row.metricValues[0].value);
                  const sessions = parseInt(row.metricValues[1].value);
                  const conversions = parseInt(row.metricValues[2].value);
                  const engagementRate = parseFloat(row.metricValues[3].value);
                  
                  return (
                    <tr key={index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {source || 'Direto'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {medium || 'Não definido'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {users.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {sessions.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {conversions.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                        {(engagementRate * 100).toFixed(2)}%
                      </td>
                    </tr>
                  );
                }).filter(item => item !== null)}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// Instruções:
// 1. Substituir a função fetchGoogleAnalyticsData existente pela versão acima
// 2. Substituir a função renderGaTrafficSourcesSection existente pela versão acima
// 3. Isso deve resolver o problema de exibição das fontes de tráfego
