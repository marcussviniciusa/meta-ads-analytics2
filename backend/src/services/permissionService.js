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
      // Super admins e admins têm acesso total
      const userRole = await this.getUserRole(userId);
      if (userRole === 'super_admin' || userRole === 'admin') {
        // Retornar todas as propriedades do GA
        const result = await client.query(
          'SELECT DISTINCT property_id FROM ga_properties'
        );
        return result.rows.map(row => row.property_id);
      }

      // Usuários comuns só têm acesso às propriedades permitidas
      const result = await client.query(
        'SELECT property_id FROM user_ga_property_permissions WHERE user_id = $1',
        [userId]
      );
      
      return result.rows.map(row => row.property_id);
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
      await client.query(
        `INSERT INTO user_ad_account_permissions 
         (user_id, account_id, created_by) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, account_id) DO NOTHING`,
        [userId, accountId, createdBy]
      );
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
      await client.query(
        'DELETE FROM user_ad_account_permissions WHERE user_id = $1 AND account_id = $2',
        [userId, accountId]
      );
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
      const result = await client.query(
        `SELECT p.id, p.user_id, p.account_id, p.created_by, p.created_at, 
         a.name as account_name, u.name as created_by_name
         FROM user_ad_account_permissions p
         LEFT JOIN ad_accounts a ON p.account_id = a.account_id
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.user_id = $1`,
        [userId]
      );
      
      return result.rows;
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
      const result = await client.query(
        `SELECT p.id, p.user_id, p.property_id, p.created_by, p.created_at, 
         g.property_name, u.name as created_by_name
         FROM user_ga_property_permissions p
         LEFT JOIN ga_properties g ON p.property_id = g.property_id
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.user_id = $1`,
        [userId]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = PermissionService;
