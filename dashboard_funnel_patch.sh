#!/bin/bash

# Script para aplicar o patch na função renderFunnelSection
# Este script deve ser executado a partir da raiz do projeto

echo "Aplicando patch para a função renderFunnelSection..."

# Criar arquivo de patch temporário
cat > dashboard_funnel.patch << 'EOL'
--- Dashboard.js.original
+++ Dashboard.js.patched
@@ -2233,13 +2233,15 @@
   const renderFunnelSection = () => {
     // Log de diagnóstico
     console.log("Renderizando seção de funil, dados disponíveis:", 
-                 funnelData ? `Sim (topPages: ${funnelData.topPages ? "Sim" : "Não"})` : "Não");
-                 
+               funnelData ? `Sim (topPages: ${funnelData.topPages ? "Sim" : "Não"}, processedTopPages: ${funnelData.processedTopPages ? "Sim" : "Não"})` : "Não");
+               
     // Verificar dados detalhados para diagnóstico
-    if (funnelData && funnelData.topPages) {
-      console.log("Estrutura de topPages:", {
-        hasRows: !!funnelData.topPages.rows,
-        rowCount: funnelData.topPages.rows ? funnelData.topPages.rows.length : 0
+    if (funnelData) {
+      console.log("Estrutura de dados do funil:", {
+        hasTopPages: !!funnelData.topPages,
+        topPagesRowCount: funnelData.topPages?.rows ? funnelData.topPages.rows.length : 0,
+        hasProcessedTopPages: !!funnelData.processedTopPages,
+        processedTopPagesCount: funnelData.processedTopPages ? funnelData.processedTopPages.length : 0
       });
     }
     
@@ -2281,7 +2283,51 @@
           <CardContent>
             <Grid container spacing={2}>
-              {funnelData.topPages && funnelData.topPages.rows && funnelData.topPages.rows.length > 0 ? (
+              {funnelData.processedTopPages && funnelData.processedTopPages.length > 0 ? (
+                <Grid item xs={12}>
+                  <Box sx={{ height: 300, overflowY: 'auto' }}>
+                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
+                      <thead>
+                        <tr>
+                          <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Página</th>
+                          <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Visualizações</th>
+                          <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Usuários</th>
+                          <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Tempo Médio (seg)</th>
+                        </tr>
+                      </thead>
+                      <tbody>
+                        {funnelData.processedTopPages.map((page, index) => (
+                          <tr key={index} style={{ background: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
+                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
+                              {page.pagePath}
+                            </td>
+                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
+                              {page.views.toLocaleString()}
+                            </td>
+                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
+                              {page.users.toLocaleString()}
+                            </td>
+                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>
+                              {page.avgTime.toFixed(1)}
+                            </td>
+                          </tr>
+                        ))}
+                      </tbody>
+                    </table>
+                  </Box>
+                </Grid>
+              ) : funnelData.topPages && funnelData.topPages.rows && funnelData.topPages.rows.length > 0 ? (
EOL

# Aplicar o patch
echo "Aplicando patch ao arquivo Dashboard.js..."
patch -b frontend/src/pages/Dashboard.js dashboard_funnel.patch

# Verificar resultado
if [ $? -eq 0 ]; then
  echo "✓ Patch aplicado com sucesso"
  echo "Foi criado um arquivo de backup: frontend/src/pages/Dashboard.js.orig"
else
  echo "✗ Ocorreu um erro ao aplicar o patch"
fi

# Remover arquivo temporário
rm dashboard_funnel.patch

echo ""
echo "Para verificar as alterações, compare os arquivos:"
echo "diff frontend/src/pages/Dashboard.js.orig frontend/src/pages/Dashboard.js"
