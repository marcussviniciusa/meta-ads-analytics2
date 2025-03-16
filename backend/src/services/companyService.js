/**
 * Service for managing companies
 */
class CompanyService {
  constructor(pgPool) {
    this.pgPool = pgPool;
  }

  /**
   * Get all companies
   * @param {Object} options - Query options (pagination, filtering)
   * @returns {Promise<Array>} List of companies
   */
  async getAllCompanies(options = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, name, active, created_at, updated_at,
             (SELECT COUNT(*) FROM users WHERE company_id = companies.id) as user_count
      FROM companies
      WHERE 1=1
    `;
    const queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND name ILIKE $${queryParams.length}`;
    }
    
    // Add count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM companies
      WHERE 1=1
      ${search ? ` AND name ILIKE $1` : ''}
    `;
    
    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const client = await this.pgPool.connect();
    
    try {
      // Get total count
      const countResult = await client.query(countQuery, search ? [`%${search}%`] : []);
      const total = parseInt(countResult.rows[0].total);
      
      // Get companies with pagination
      const result = await client.query(query, queryParams);
      
      return {
        companies: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get company by ID
   * @param {number} id - Company ID
   * @returns {Promise<Object>} Company information
   */
  async getCompanyById(id) {
    const query = `
      SELECT c.id, c.name, c.active, c.created_at, c.updated_at,
             (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count
      FROM companies c
      WHERE c.id = $1
    `;
    
    const result = await this.pgPool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Empresa não encontrada');
    }
    
    return result.rows[0];
  }

  /**
   * Create a new company
   * @param {Object} companyData - Company data
   * @returns {Promise<Object>} Created company
   */
  async createCompany(companyData) {
    const { name } = companyData;
    
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if company with the same name already exists
      const existingCompany = await client.query(
        'SELECT id FROM companies WHERE name = $1',
        [name]
      );
      
      if (existingCompany.rows.length > 0) {
        throw new Error('Empresa com este nome já existe');
      }
      
      // Insert company
      const result = await client.query(
        'INSERT INTO companies (name) VALUES ($1) RETURNING id, name, active, created_at, updated_at',
        [name]
      );
      
      await client.query('COMMIT');
      
      return {
        ...result.rows[0],
        user_count: 0
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update company
   * @param {number} id - Company ID
   * @param {Object} companyData - Company data to update
   * @returns {Promise<Object>} Updated company
   */
  async updateCompany(id, companyData) {
    const { name, active } = companyData;
    
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if company exists
      const existingCompany = await client.query(
        'SELECT id FROM companies WHERE id = $1',
        [id]
      );
      
      if (existingCompany.rows.length === 0) {
        throw new Error('Empresa não encontrada');
      }
      
      // Check if name is already used by another company
      if (name) {
        const nameCheck = await client.query(
          'SELECT id FROM companies WHERE name = $1 AND id != $2',
          [name, id]
        );
        
        if (nameCheck.rows.length > 0) {
          throw new Error('Empresa com este nome já existe');
        }
      }
      
      // Prepare update fields
      const updateFields = [];
      const queryParams = [];
      let paramCount = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        queryParams.push(name);
        paramCount += 1;
      }
      
      if (active !== undefined) {
        updateFields.push(`active = $${paramCount}`);
        queryParams.push(active);
        paramCount += 1;
      }
      
      // Add updated_at field
      updateFields.push(`updated_at = NOW()`);
      
      // Add the id as the last parameter
      queryParams.push(id);
      
      // Update company
      const query = `
        UPDATE companies
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, name, active, created_at, updated_at
      `;
      
      const result = await client.query(query, queryParams);
      
      // Get user count
      const countResult = await client.query(
        'SELECT COUNT(*) as user_count FROM users WHERE company_id = $1',
        [id]
      );
      
      await client.query('COMMIT');
      
      return {
        ...result.rows[0],
        user_count: parseInt(countResult.rows[0].user_count)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete company
   * @param {number} id - Company ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCompany(id) {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if company exists
      const existingCompany = await client.query(
        'SELECT id FROM companies WHERE id = $1',
        [id]
      );
      
      if (existingCompany.rows.length === 0) {
        throw new Error('Empresa não encontrada');
      }
      
      // Check if company has users
      const usersCheck = await client.query(
        'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
        [id]
      );
      
      if (parseInt(usersCheck.rows[0].count) > 0) {
        throw new Error('Não é possível excluir uma empresa que possui usuários');
      }
      
      // Delete company
      await client.query(
        'DELETE FROM companies WHERE id = $1',
        [id]
      );
      
      await client.query('COMMIT');
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get users by company ID
   * @param {number} companyId - Company ID
   * @param {Object} options - Query options (pagination, filtering)
   * @returns {Promise<Array>} List of users
   */
  async getUsersByCompanyId(companyId, options = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, email, name, role, created_at, updated_at
      FROM users
      WHERE company_id = $1
    `;
    const queryParams = [companyId];
    
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (name ILIKE $${queryParams.length} OR email ILIKE $${queryParams.length})`;
    }
    
    // Add count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE company_id = $1
      ${search ? ` AND (name ILIKE $2 OR email ILIKE $2)` : ''}
    `;
    
    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);
    
    const client = await this.pgPool.connect();
    
    try {
      // Check if company exists
      const companyCheck = await client.query(
        'SELECT id FROM companies WHERE id = $1',
        [companyId]
      );
      
      if (companyCheck.rows.length === 0) {
        throw new Error('Empresa não encontrada');
      }
      
      // Get total count
      const countResult = await client.query(
        countQuery,
        search ? [companyId, `%${search}%`] : [companyId]
      );
      const total = parseInt(countResult.rows[0].total);
      
      // Get users with pagination
      const result = await client.query(query, queryParams);
      
      return {
        users: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      };
    } finally {
      client.release();
    }
  }
}

module.exports = CompanyService;
