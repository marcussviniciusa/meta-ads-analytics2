/**
 * Script de depuração para erros do Google Analytics
 * Para usar: 
 * 1. Copie este código para o arquivo GoogleAnalyticsService.js
 * 2. Substitua o método getReport existente
 * 3. Reinicie o servidor backend
 */

// Exemplo de objeto GoogleAnalyticsService com o método getReport aprimorado
const googleAnalyticsServiceDebug = {
  /**
   * Obtém relatório do GA4 com depuração avançada
   * @param {number} userId - ID do usuário
   * @param {string} propertyId - ID da propriedade GA
   * @param {Object} reportConfig - Configuração do relatório
   * @param {string} userRole - Papel do usuário (opcional)
   * @returns {Promise<Object>} - Dados do relatório
   */
  async getReport(userId, propertyId, reportConfig, userRole) {
    try {
    console.log('=== INÍCIO DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
    console.log(`Usuário ID: ${userId}, Função: ${userRole}, Propriedade ID: ${propertyId}`);
    console.log('Configuração do relatório:', JSON.stringify(reportConfig, null, 2));
    
    // Verificar se a propriedade existe para este usuário
    const propertyQuery = await this.pgPool.query(
      'SELECT * FROM ga_properties WHERE user_id = $1 AND property_id = $2',
      [userId, propertyId]
    );
    
    console.log(`Propriedade encontrada: ${propertyQuery.rows.length > 0 ? 'SIM' : 'NÃO'}`);
    
    if (propertyQuery.rows.length === 0) {
      console.error(`ERRO: Propriedade ${propertyId} não encontrada para o usuário ${userId}`);
      throw new Error(`Propriedade ${propertyId} não encontrada`);
    }
    
    // Verificar permissão de acesso à propriedade
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      const permissionsQuery = await this.pgPool.query(
        'SELECT * FROM user_ga_property_permissions WHERE user_id = $1 AND property_id = $2',
        [userId, propertyId]
      );
      
      console.log(`Permissões específicas encontradas: ${permissionsQuery.rows.length > 0 ? 'SIM' : 'NÃO'}`);
      
      if (permissionsQuery.rows.length === 0) {
        console.error(`ERRO: Usuário ${userId} não tem permissões para a propriedade ${propertyId}`);
        throw new Error('Você não tem permissão para acessar esta propriedade do Google Analytics');
      }
    }
    
    // Obter token de acesso
    try {
      console.log('Buscando token de acesso...');
      const accessToken = await this.getAccessToken(userId);
      console.log('Token de acesso obtido com sucesso');
      
      // Configurar cliente do Google com o token
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      // Executar relatório
      console.log(`Executando relatório para a propriedade ${propertyId}...`);
      
      try {
        const response = await analyticsData.properties.runReport({
          auth: this.oauth2Client,
          property: `properties/${propertyId}`,
          requestBody: reportConfig
        });
        
        console.log('Relatório recebido com sucesso. Tamanho dos dados:', 
          JSON.stringify(response.data).length);
        console.log('=== FIM DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
        
        return response.data;
      } catch (apiError) {
        console.error('ERRO na API do Google Analytics:', apiError);
        console.error('Detalhes do erro:');
        
        if (apiError.response) {
          console.error('Status:', apiError.response.status);
          console.error('Dados:', JSON.stringify(apiError.response.data));
          console.error('Headers:', JSON.stringify(apiError.response.headers));
        } else if (apiError.request) {
          console.error('Sem resposta recebida');
          console.error('Request:', apiError.request);
        } else {
          console.error('Mensagem:', apiError.message);
        }
        
        if (apiError.code) {
          console.error('Código de erro:', apiError.code);
        }
        
        console.log('=== FIM DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
        throw apiError;
      }
    } catch (tokenError) {
      console.error('ERRO ao obter token de acesso:', tokenError);
      console.log('=== FIM DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
      throw tokenError;
    }
  } catch (error) {
    console.error('ERRO ao executar relatório do GA4:', error);
    console.log('=== FIM DE DEPURAÇÃO DETALHADA DO GOOGLE ANALYTICS ===');
    throw error;
  }
}
};

module.exports = googleAnalyticsServiceDebug;
