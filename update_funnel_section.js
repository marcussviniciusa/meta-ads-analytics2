/**
 * Instruções para atualizar a função renderFunnelSection no Dashboard.js
 * 
 * Substitua a parte inicial da função renderFunnelSection (linhas ~2233-2242) por:
 */

const renderFunnelSection = () => {
  // Log de diagnóstico
  console.log("Renderizando seção de funil, dados disponíveis:", 
               funnelData ? `Sim (topPages: ${funnelData.topPages ? "Sim" : "Não"}, processedTopPages: ${funnelData.processedTopPages ? "Sim" : "Não"})` : "Não");
               
  // Verificar dados detalhados para diagnóstico
  if (funnelData) {
    console.log("Estrutura de dados do funil:", {
      hasTopPages: !!funnelData.topPages,
      topPagesRowCount: funnelData.topPages?.rows ? funnelData.topPages.rows.length : 0,
      hasProcessedTopPages: !!funnelData.processedTopPages,
      processedTopPagesCount: funnelData.processedTopPages ? funnelData.processedTopPages.length : 0
    });
  }
  
  // O restante da função permanece igual até a parte da renderização da tabela
};
  
/**
 * Substitua o trecho que renderiza as páginas (por volta da linha 2282) por:
 */

{funnelData.processedTopPages && funnelData.processedTopPages.length > 0 ? (
  <Grid item xs={12}>
    <Box sx={{ height: 300, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Página</th>
            <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Visualizações</th>
            <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Usuários</th>
            <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Tempo Médio (seg)</th>
          </tr>
        </thead>
        <tbody>
          {funnelData.processedTopPages.map((page, index) => (
            <tr key={index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
              <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                {page.pagePath}
              </td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                {page.views.toLocaleString()}
              </td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                {page.users.toLocaleString()}
              </td>
              <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
                {page.avgTime.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  </Grid>
) : funnelData.topPages && funnelData.topPages.rows && funnelData.topPages.rows.length > 0 ? (
  // Manter o código original para o caso de fallback
  <Grid item xs={12}>
    {/* O código existente para renderizar usando funnelData.topPages.rows fica aqui */}
  </Grid>
) : (
  <Grid item xs={12}>
    <Alert severity="info">Nenhum dado de páginas disponível para o período selecionado.</Alert>
  </Grid>
)}
