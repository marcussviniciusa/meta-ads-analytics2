const express = require('express');
const { body, param, query } = require('express-validator');
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorizationMiddleware');

const router = express.Router();

/**
 * Create routes for authentication
 * @param {Object} redisClient - Redis client
 * @param {Object} pgPool - PostgreSQL connection pool
 * @returns {Object} Express router
 */
module.exports = function(redisClient, pgPool) {
  const authController = new AuthController(pgPool);

  // Register a new user
  router.post(
    '/register',
    [
      body('email').isEmail().withMessage('Forneça um email válido'),
      body('password').isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres'),
      body('name').notEmpty().withMessage('O nome é obrigatório'),
      body('companyId').optional().isInt().withMessage('ID da empresa deve ser um número inteiro'),
      body('role').optional().isIn(['user', 'admin', 'super_admin']).withMessage('Papel inválido')
    ],
    authMiddleware,
    authController.register.bind(authController)
  );

  // Login a user
  router.post(
    '/login',
    [
      body('email').isEmail().withMessage('Forneça um email válido'),
      body('password').notEmpty().withMessage('A senha é obrigatória')
    ],
    authController.login.bind(authController)
  );

  // Get current user
  router.get('/me', authMiddleware, authController.getMe.bind(authController));
  
  // === NOVAS ROTAS PARA GERENCIAMENTO DE USUÁRIOS ===
  
  // Get all users (admin only)
  router.get(
    '/users',
    authMiddleware,
    authorize(['super_admin', 'admin']),
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1 }).toInt(),
      query('search').optional().isString().trim(),
      query('companyId').optional().isInt().toInt()
    ],
    authController.getAllUsers.bind(authController)
  );
  
  // Get user by ID (admin or próprio usuário)
  router.get(
    '/users/:id',
    authMiddleware,
    [
      param('id').isInt().toInt()
    ],
    (req, res, next) => {
      // Permitir acesso se for o próprio usuário ou um admin
      if (req.params.id == req.user.userId || 
          req.user.role === 'super_admin' || 
          req.user.role === 'admin') {
        return next();
      }
      return res.status(403).json({ message: 'Acesso negado' });
    },
    authController.getUserById.bind(authController)
  );
  
  // Update user (admin ou próprio usuário)
  router.put(
    '/users/:id',
    authMiddleware,
    [
      param('id').isInt().toInt(),
      body('email').optional().isEmail().withMessage('Forneça um email válido'),
      body('name').optional().isString().trim().notEmpty().withMessage('Nome inválido'),
      body('password').optional().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres'),
      body('companyId').optional().isInt().withMessage('ID da empresa deve ser um número inteiro'),
      body('role').optional().isIn(['user', 'admin', 'super_admin']).withMessage('Papel inválido')
    ],
    authController.updateUser.bind(authController)
  );
  
  // Delete user (super_admin only)
  router.delete(
    '/users/:id',
    authMiddleware,
    authorize(['super_admin']),
    [
      param('id').isInt().toInt()
    ],
    authController.deleteUser.bind(authController)
  );

  return router;
};
