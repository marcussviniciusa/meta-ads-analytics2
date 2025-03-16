const { validationResult } = require('express-validator');
const AuthService = require('../services/authService');

/**
 * Controller for authentication endpoints
 */
class AuthController {
  constructor(pgPool) {
    this.authService = new AuthService(pgPool);
  }

  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async register(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, companyId, role } = req.body;
      
      // Verificar se o usuário atual é super_admin para permitir a definição de role
      let userRole = 'user';
      if (role && req.user && req.user.role === 'super_admin') {
        userRole = role;
      }
      
      // Register user
      const userData = await this.authService.register(email, password, name, companyId, userRole);
      
      res.status(201).json(userData);
    } catch (error) {
      if (error.message === 'Usuário com este email já existe') {
        return res.status(400).json({ message: error.message });
      }
      
      if (error.message === 'Empresa não encontrada') {
        return res.status(404).json({ message: error.message });
      }
      
      next(error);
    }
  }

  /**
   * Login an existing user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async login(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      
      // Login user
      const userData = await this.authService.login(email, password);
      
      res.status(200).json(userData);
    } catch (error) {
      if (error.message === 'Credenciais inválidas') {
        return res.status(401).json({ message: error.message });
      }
      
      next(error);
    }
  }

  /**
   * Get current user information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getMe(req, res, next) {
    try {
      const userId = req.user.userId;
      
      // Get user
      const user = await this.authService.getUserById(userId);
      
      res.status(200).json(user);
    } catch (error) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      
      next(error);
    }
  }
  
  /**
   * Get all users (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllUsers(req, res, next) {
    try {
      const { page, limit, search, companyId } = req.query;
      
      const result = await this.authService.getAllUsers({
        page, 
        limit, 
        search,
        companyId
      });
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get user by ID (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      
      const user = await this.authService.getUserById(id);
      
      res.status(200).json(user);
    } catch (error) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      
      next(error);
    }
  }
  
  /**
   * Update user (admin only for other users)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateUser(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      
      // Verificar se usuário está tentando atualizar a si próprio ou se é admin
      if (id !== req.user.userId && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      // Se não for admin, não pode atualizar role ou company_id
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        delete req.body.role;
        delete req.body.companyId;
      }
      
      const user = await this.authService.updateUser(id, req.body);
      
      res.status(200).json(user);
    } catch (error) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      
      if (error.message === 'Email já está sendo usado por outro usuário') {
        return res.status(400).json({ message: error.message });
      }
      
      if (error.message === 'Empresa não encontrada') {
        return res.status(404).json({ message: error.message });
      }
      
      next(error);
    }
  }
  
  /**
   * Delete user (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      
      // Um usuário não pode excluir a si mesmo
      if (id === req.user.userId) {
        return res.status(400).json({ message: 'Não é possível excluir o próprio usuário' });
      }
      
      await this.authService.deleteUser(id);
      
      res.status(200).json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ message: error.message });
      }
      
      if (error.message === 'Não é possível excluir o último administrador do sistema') {
        return res.status(400).json({ message: error.message });
      }
      
      next(error);
    }
  }
}

module.exports = AuthController;
