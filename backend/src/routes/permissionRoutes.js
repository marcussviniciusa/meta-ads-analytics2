const express = require('express');
const { body, param } = require('express-validator');
const PermissionController = require('../controllers/permissionController');
const PermissionService = require('../services/permissionService');
const cors = require('cors');

/**
 * Rotas para gerenciamento de permissões de usuários
 * @param {Object} pgPool - Pool de conexões PostgreSQL
 * @returns {Router} - Router Express
 */
function permissionRoutes(pgPool) {
  const router = express.Router();

  // Configurar CORS para todas as rotas
  router.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Middleware para assegurar que todas as respostas sejam JSON
  router.use((req, res, next) => {
    res.set('Content-Type', 'application/json');
    next();
  });

  // Criar instâncias dos serviços e controladores
  const permissionService = new PermissionService(pgPool);
  const permissionController = new PermissionController(permissionService);

  // Definir as rotas e seus respectivos controllers
  
  // Obter permissões de contas Meta Ads para um usuário
  router.get(
    '/users/:userId/meta-permissions',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro')
    ],
    permissionController.getUserMetaAdAccountPermissions.bind(permissionController)
  );

  // Obter permissões de propriedades Google Analytics para um usuário
  router.get(
    '/users/:userId/google-permissions',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro')
    ],
    permissionController.getUserGAPropertyPermissions.bind(permissionController)
  );

  // Atribuir permissão de conta Meta Ads a um usuário
  router.post(
    '/users/:userId/meta-accounts/:accountId',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro'),
      param('accountId').isString().withMessage('ID da conta deve ser uma string')
    ],
    permissionController.assignMetaAdAccountPermission.bind(permissionController)
  );

  // Atribuir permissão de propriedade GA a um usuário
  router.post(
    '/users/:userId/ga-properties/:propertyId',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro'),
      param('propertyId').isString().withMessage('ID da propriedade deve ser uma string')
    ],
    permissionController.assignGAPropertyPermission.bind(permissionController)
  );

  // Remover permissão de conta Meta Ads de um usuário
  router.delete(
    '/users/:userId/meta-accounts/:accountId',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro'),
      param('accountId').isString().withMessage('ID da conta deve ser uma string')
    ],
    permissionController.removeMetaAdAccountPermission.bind(permissionController)
  );

  // Remover permissão de propriedade GA de um usuário
  router.delete(
    '/users/:userId/ga-properties/:propertyId',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro'),
      param('propertyId').isString().withMessage('ID da propriedade deve ser uma string')
    ],
    permissionController.removeGAPropertyPermission.bind(permissionController)
  );
  
  return router;
}

module.exports = permissionRoutes;
