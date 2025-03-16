const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Service for handling authentication-related functionality
 */
class AuthService {
  constructor(pgPool) {
    this.pgPool = pgPool;
  }

  /**
   * Register a new user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} name - User's name
   * @param {number} companyId - Company ID
   * @param {string} role - User role (default: 'user')
   * @returns {Promise<Object>} User information and token
   */
  async register(email, password, name, companyId = null, role = 'user') {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('Usuário com este email já existe');
      }
      
      // Check if company exists (if companyId is provided)
      if (companyId) {
        const companyCheck = await client.query(
          'SELECT id FROM companies WHERE id = $1',
          [companyId]
        );
        
        if (companyCheck.rows.length === 0) {
          throw new Error('Empresa não encontrada');
        }
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create user
      const result = await client.query(
        'INSERT INTO users (email, password_hash, name, company_id, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, company_id, created_at',
        [email, hashedPassword, name, companyId, role]
      );
      
      const user = result.rows[0];
      
      // Get company name if company_id exists
      let company = null;
      if (user.company_id) {
        const companyResult = await client.query(
          'SELECT id, name FROM companies WHERE id = $1',
          [user.company_id]
        );
        
        if (companyResult.rows.length > 0) {
          company = {
            id: companyResult.rows[0].id,
            name: companyResult.rows[0].name
          };
        }
      }
      
      // Generate JWT token
      const token = this.generateToken(user.id, user.email, user.role);
      
      await client.query('COMMIT');
      
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company,
          created_at: user.created_at
        },
        token
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Login an existing user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} User information and token
   */
  async login(email, password) {
    const client = await this.pgPool.connect();
    
    try {
      // Find user
      const result = await client.query(
        'SELECT id, email, name, password_hash, role, company_id, created_at FROM users WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Credenciais inválidas');
      }
      
      const user = result.rows[0];
      
      // Verify password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!isMatch) {
        throw new Error('Credenciais inválidas');
      }
      
      // Get company name if company_id exists
      let company = null;
      if (user.company_id) {
        const companyResult = await client.query(
          'SELECT id, name FROM companies WHERE id = $1',
          [user.company_id]
        );
        
        if (companyResult.rows.length > 0) {
          company = {
            id: companyResult.rows[0].id,
            name: companyResult.rows[0].name
          };
        }
      }
      
      // Generate JWT token
      const token = this.generateToken(user.id, user.email, user.role);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company,
          created_at: user.created_at
        },
        token
      };
    } finally {
      client.release();
    }
  }

  /**
   * Generate JWT token
   * @param {number} userId - User ID
   * @param {string} email - User's email
   * @param {string} role - User's role
   * @returns {string} JWT token
   */
  generateToken(userId, email, role) {
    return jwt.sign(
      { userId, email, role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User information
   */
  async getUserById(userId) {
    const client = await this.pgPool.connect();
    
    try {
      const result = await client.query(
        'SELECT id, email, name, role, company_id, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }
      
      const user = result.rows[0];
      
      // Get company name if company_id exists
      let company = null;
      if (user.company_id) {
        const companyResult = await client.query(
          'SELECT id, name FROM companies WHERE id = $1',
          [user.company_id]
        );
        
        if (companyResult.rows.length > 0) {
          company = {
            id: companyResult.rows[0].id,
            name: companyResult.rows[0].name
          };
        }
      }
      
      return {
        ...user,
        company
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Get all users (for super admin)
   * @param {Object} options - Query options (pagination, filtering)
   * @returns {Promise<Array>} List of users
   */
  async getAllUsers(options = {}) {
    const { page = 1, limit = 10, search = '', companyId = null } = options;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT u.id, u.email, u.name, u.role, u.company_id, u.created_at, u.updated_at,
             c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;
    
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      paramCount += 1;
    }
    
    if (companyId) {
      queryParams.push(companyId);
      query += ` AND u.company_id = $${paramCount}`;
      paramCount += 1;
    }
    
    // Add count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE 1=1
      ${search ? ` AND (u.name ILIKE $1 OR u.email ILIKE $1)` : ''}
      ${companyId ? ` AND u.company_id = $${search ? 2 : 1}` : ''}
    `;
    
    // Add pagination
    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);
    
    const client = await this.pgPool.connect();
    
    try {
      // Get total count
      const countResult = await client.query(
        countQuery,
        companyId 
          ? search 
            ? [`%${search}%`, companyId] 
            : [companyId]
          : search 
            ? [`%${search}%`] 
            : []
      );
      const total = parseInt(countResult.rows[0].total);
      
      // Get users with pagination
      const result = await client.query(query, queryParams);
      
      // Format the result
      const users = result.rows.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        company: user.company_id ? {
          id: user.company_id,
          name: user.company_name
        } : null
      }));
      
      return {
        users,
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
   * Update user
   * @param {number} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, userData) {
    const { name, email, role, companyId, password } = userData;
    
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user exists
      const existingUser = await client.query(
        'SELECT id, email FROM users WHERE id = $1',
        [userId]
      );
      
      if (existingUser.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }
      
      // Check if email is already used by another user
      if (email && email !== existingUser.rows[0].email) {
        const emailCheck = await client.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );
        
        if (emailCheck.rows.length > 0) {
          throw new Error('Email já está sendo usado por outro usuário');
        }
      }
      
      // Check if company exists (if companyId is provided)
      if (companyId) {
        const companyCheck = await client.query(
          'SELECT id FROM companies WHERE id = $1',
          [companyId]
        );
        
        if (companyCheck.rows.length === 0) {
          throw new Error('Empresa não encontrada');
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
      
      if (email !== undefined) {
        updateFields.push(`email = $${paramCount}`);
        queryParams.push(email);
        paramCount += 1;
      }
      
      if (role !== undefined) {
        updateFields.push(`role = $${paramCount}`);
        queryParams.push(role);
        paramCount += 1;
      }
      
      if (companyId !== undefined) {
        updateFields.push(`company_id = $${paramCount}`);
        queryParams.push(companyId);
        paramCount += 1;
      }
      
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        updateFields.push(`password_hash = $${paramCount}`);
        queryParams.push(hashedPassword);
        paramCount += 1;
      }
      
      // Add updated_at field
      updateFields.push(`updated_at = NOW()`);
      
      // Add the id as the last parameter
      queryParams.push(userId);
      
      // Update user
      const query = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, name, role, company_id, created_at, updated_at
      `;
      
      const result = await client.query(query, queryParams);
      const user = result.rows[0];
      
      // Get company name if company_id exists
      let company = null;
      if (user.company_id) {
        const companyResult = await client.query(
          'SELECT id, name FROM companies WHERE id = $1',
          [user.company_id]
        );
        
        if (companyResult.rows.length > 0) {
          company = {
            id: companyResult.rows[0].id,
            name: companyResult.rows[0].name
          };
        }
      }
      
      await client.query('COMMIT');
      
      return {
        ...user,
        company
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Delete user
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteUser(userId) {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user exists
      const existingUser = await client.query(
        'SELECT id, role FROM users WHERE id = $1',
        [userId]
      );
      
      if (existingUser.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }
      
      // Prevent deletion of super_admin if it's the last one
      if (existingUser.rows[0].role === 'super_admin') {
        const adminCountResult = await client.query(
          'SELECT COUNT(*) as count FROM users WHERE role = $1',
          ['super_admin']
        );
        
        if (parseInt(adminCountResult.rows[0].count) <= 1) {
          throw new Error('Não é possível excluir o último administrador do sistema');
        }
      }
      
      // Delete user
      await client.query(
        'DELETE FROM users WHERE id = $1',
        [userId]
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
}

module.exports = AuthService;
