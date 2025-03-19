/**
 * Serviço para gerenciar permissões de usuários
 * Permite limitar acesso a contas de anúncio do Meta e propriedades do Google Analytics
 */
class PermissionService {
  constructor(pgPool) {
    this.pgPool = pgPool;
  }

  /**
   * Verifica se um usuário tem acesso a uma conta de anúncio do Meta
   * @param {number} userId - ID do usuário
   * @param {string} accountId - ID da conta de anúncio
   * @returns {Promise<boolean>} - Retorna true se o usuário tem permissão
   */
  async hasMetaAdAccountAccess(userId, accountId) {
    const client = await this.pgPool.connect();
    
    try {
      // Super admins e admins têm acesso total
      const userRole = await this.getUserRole(userId);
      if (userRole === 'super_admin' || userRole === 'admin') {
        return true;
      }

      const result = await client.query(
        `SELECT EXISTS (
          SELECT 1 FROM user_ad_account_permissions 
          WHERE user_id = $1 AND account_id = $2
        )`,
        [userId, accountId]
      );
      
      return result.rows[0].exists;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica se um usuário tem acesso a uma propriedade do Google Analytics
   * @param {number} userId - ID do usuário
   * @param {string} propertyId - ID da propriedade do GA
   * @returns {Promise<boolean>} - Retorna true se o usuário tem permissão
   */
  async hasGoogleAnalyticsPropertyAccess(userId, propertyId) {
    const client = await this.pgPool.connect();
    
    try {
      // Super admins e admins têm acesso total
      const userRole = await this.getUserRole(userId);
      if (userRole === 'super_admin' || userRole === 'admin') {
        return true;
      }

      const result = await client.query(
        `SELECT EXISTS (
          SELECT 1 FROM user_ga_property_permissions 
          WHERE user_id = $1 AND property_id = $2
        )`,
        [userId, propertyId]
      );
      
      return result.rows[0].exists;
    } finally {
      client.release();
    }
  }

  /**
   * Obtém o papel (role) do usuário
   * @param {number} userId - ID do usuário
   * @returns {Promise<string>} - Papel do usuário (super_admin, admin, user)
   */
  async getUserRole(userId) {
    const client = await this.pgPool.connect();
    
    try {
      const result = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }
      
      return result.rows[0].role;
    } finally {
      client.release();
    }
  }

  /**
   * Obtém todas as contas de anúncio do Meta que um usuário tem acesso
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} - Array de IDs de contas de anúncio
   */
  async getUserAdAccounts(userId) {
    const client = await this.pgPool.connect();
    
    try {
      // Super admins e admins têm acesso total
      const userRole = await this.getUserRole(userId);
      if (userRole === 'super_admin' || userRole === 'admin') {
        // Retornar todas as contas de anúncio
        const result = await client.query(
          'SELECT DISTINCT account_id FROM ad_accounts'
        );
        return result.rows.map(row => row.account_id);
      }

      // Usuários comuns só têm acesso às contas permitidas
      const result = await client.query(
        'SELECT account_id FROM user_ad_account_permissions WHERE user_id = $1',
        [userId]
      );
      
      return result.rows.map(row => row.account_id);
    } finally {
      client.release();
    }
  }

  /**
   * Obtém todas as propriedades do Google Analytics que um usuário tem acesso
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} - Array de IDs de propriedades do GA
   */
  async getUserGAProperties(userId) {
    const client = await this.pgPool.connect();
    
    try {
      console.log(`[PermissionService] Buscando propriedades GA com permissão para usuário ${userId}`);
      
      // Super admins e admins têm acesso total
      try {
        const userRole = await this.getUserRole(userId);
        console.log(`[PermissionService] Papel do usuário ${userId}: ${userRole}`);
        
        if (userRole === 'super_admin' || userRole === 'admin') {
          console.log(`[PermissionService] Usuário é ${userRole}, retornando todas as propriedades`);
          // Retornar todas as propriedades do GA
          const result = await client.query(
            'SELECT DISTINCT property_id FROM ga_properties'
          );
          
          console.log(`[PermissionService] Encontradas ${result.rows.length} propriedades GA no total`);
          return result.rows.map(row => row.property_id);
        }
      } catch (roleError) {
        console.error(`[PermissionService] Erro ao obter papel do usuário:`, roleError);
        // Continuar e buscar permissões específicas
      }

      // Usuários comuns só têm acesso às propriedades permitidas
      console.log(`[PermissionService] Buscando permissões específicas para usuário ${userId}`);
      const result = await client.query(
        'SELECT property_id FROM user_ga_property_permissions WHERE user_id = $1',
        [userId]
      );
      
      const propertyIds = result.rows.map(row => row.property_id);
      console.log(`[PermissionService] Encontradas ${propertyIds.length} permissões para o usuário ${userId}`);
      console.log(`[PermissionService] IDs das propriedades:`, propertyIds);
      
      return propertyIds;
    } catch (error) {
      console.error(`[PermissionService] Erro ao buscar propriedades GA do usuário ${userId}:`, error);
      // Retornar array vazio em caso de erro para não interromper a aplicação
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Adiciona permissão de acesso a uma conta de anúncio do Meta
   * @param {number} userId - ID do usuário
   * @param {string} accountId - ID da conta de anúncio
   * @param {number} createdBy - ID do usuário que criou a permissão
   * @returns {Promise<void>}
   */
  async addMetaAdAccountPermission(userId, accountId, createdBy) {
    const client = await this.pgPool.connect();
    
    try {
      console.log('[PermissionService] Adicionando permissão Meta:', { userId, accountId, createdBy });
      
      // Verificar se a conta de anúncio existe
      const accountCheck = await client.query(
        'SELECT COUNT(*) FROM ad_accounts WHERE account_id = $1',
        [accountId]
      );
      
      const accountExists = parseInt(accountCheck.rows[0].count) > 0;
      console.log('[PermissionService] Conta existe?', accountExists);
      
      // Se a conta não existir, vamos inseri-la para garantir a integridade referencial
      if (!accountExists) {
        console.log('[PermissionService] Conta não existe, criando registro...');
        await client.query(
          'INSERT INTO ad_accounts (account_id, name, created_at) VALUES ($1, $2, NOW())',
          [accountId, `Account ${accountId}`]
        );
      }
      
      // Adicionar permissão
      const result = await client.query(
        `INSERT INTO user_ad_account_permissions 
         (user_id, account_id, created_by, created_at) 
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, account_id) DO NOTHING`,
        [userId, accountId, createdBy]
      );
      
      console.log('[PermissionService] Permissão adicionada, resultado:', {
        rowCount: result.rowCount,
        command: result.command
      });
    } catch (error) {
      console.error('[PermissionService] Erro ao adicionar permissão Meta:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove permissão de acesso a uma conta de anúncio do Meta
   * @param {number} userId - ID do usuário
   * @param {string} accountId - ID da conta de anúncio
   * @returns {Promise<void>}
   */
  async removeMetaAdAccountPermission(userId, accountId) {
    const client = await this.pgPool.connect();
    
    try {
      console.log('[PermissionService] Removendo permissão Meta:', { userId, accountId });
      
      const result = await client.query(
        'DELETE FROM user_ad_account_permissions WHERE user_id = $1 AND account_id = $2',
        [userId, accountId]
      );
      
      console.log('[PermissionService] Permissão removida, resultado:', {
        rowCount: result.rowCount,
        command: result.command
      });
    } catch (error) {
      console.error('[PermissionService] Erro ao remover permissão Meta:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Adiciona permissão de acesso a uma propriedade do Google Analytics
   * @param {number} userId - ID do usuário
   * @param {string} propertyId - ID da propriedade do GA
   * @param {number} createdBy - ID do usuário que criou a permissão
   * @returns {Promise<void>}
   */
  async addGAPropertyPermission(userId, propertyId, createdBy) {
    const client = await this.pgPool.connect();
    
    try {
      await client.query(
        `INSERT INTO user_ga_property_permissions 
         (user_id, property_id, created_by) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, property_id) DO NOTHING`,
        [userId, propertyId, createdBy]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Remove permissão de acesso a uma propriedade do Google Analytics
   * @param {number} userId - ID do usuário
   * @param {string} propertyId - ID da propriedade do GA
   * @returns {Promise<void>}
   */
  async removeGAPropertyPermission(userId, propertyId) {
    const client = await this.pgPool.connect();
    
    try {
      await client.query(
        'DELETE FROM user_ga_property_permissions WHERE user_id = $1 AND property_id = $2',
        [userId, propertyId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Obtém todas as permissões de contas de anúncio do Meta para um usuário
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} - Array de permissões
   */
  async getUserMetaAdAccountPermissions(userId) {
    const client = await this.pgPool.connect();
    
    try {
      console.log(`[PermissionService] Buscando permissões Meta Ads para usuário ${userId}`);
      
      // Obter as permissões do banco de dados com informações de contas e criador
      const result = await client.query(
        `SELECT p.id, p.user_id, p.account_id, p.created_by, p.created_at, 
         a.name as account_name, u.name as created_by_name
         FROM user_ad_account_permissions p
         LEFT JOIN ad_accounts a ON p.account_id = a.account_id
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.user_id = $1`,
        [userId]
      );
      
      const permissions = result.rows;
      console.log(`[PermissionService] Encontradas ${permissions.length} permissões Meta Ads para usuário ${userId}`);
      
      // Processar cada permissão para garantir formato consistente dos dados
      const formattedPermissions = permissions.map(permission => ({
        id: permission.id,
        userId: permission.user_id,
        accountId: permission.account_id,
        accountName: permission.account_name || `Conta ${permission.account_id}`,
        createdBy: permission.created_by,
        createdByName: permission.created_by_name || 'Usuário do sistema',
        createdAt: permission.created_at
      }));
      
      return formattedPermissions;
    } catch (error) {
      console.error(`[PermissionService] Erro ao buscar permissões Meta Ads para usuário ${userId}:`, error);
      // Retornar array vazio em caso de erro para não quebrar a aplicação
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Obtém todas as permissões de propriedades do Google Analytics para um usuário
   * @param {number} userId - ID do usuário
   * @returns {Promise<Array>} - Array de permissões
   */
  async getUserGAPropertyPermissions(userId) {
    const client = await this.pgPool.connect();
    
    try {
      console.log(`[PermissionService] Buscando permissões Google Analytics para usuário ${userId}`);
      
      const result = await client.query(
        `SELECT p.id, p.user_id, p.property_id, p.created_by, p.created_at, 
         g.property_name, u.name as created_by_name
         FROM user_ga_property_permissions p
         LEFT JOIN ga_properties g ON p.property_id = g.property_id
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.user_id = $1`,
        [userId]
      );
      
      const permissions = result.rows;
      console.log(`[PermissionService] Encontradas ${permissions.length} permissões GA para usuário ${userId}`);
      
      // Processar cada permissão para garantir formato consistente dos dados
      const formattedPermissions = permissions.map(permission => ({
        id: permission.id,
        userId: permission.user_id,
        propertyId: permission.property_id,
        propertyName: permission.property_name || `Propriedade ${permission.property_id}`,
        createdBy: permission.created_by,
        createdByName: permission.created_by_name || 'Usuário do sistema',
        createdAt: permission.created_at
      }));
      
      return formattedPermissions;
    } catch (error) {
      console.error(`[PermissionService] Erro ao buscar permissões GA para usuário ${userId}:`, error);
      // Retornar array vazio em caso de erro para não quebrar a aplicação
      return [];
    } finally {
      client.release();
    }
  }
}

module.exports = PermissionService;
