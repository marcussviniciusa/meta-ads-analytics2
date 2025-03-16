const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const PermissionController = require('../controllers/permissionController');
const PermissionService = require('../services/permissionService');

/**
 * Rotas para gerenciamento de permissões de usuários
 * @param {Object} pgPool - Pool de conexões PostgreSQL
 * @returns {Router} - Router Express
 */
function permissionRoutes(pgPool) {
  const router = express.Router();

  // Criar instâncias dos serviços e controladores
  const permissionService = new PermissionService(pgPool);
  const permissionController = new PermissionController(permissionService);

  // Obter permissões de contas Meta Ads para um usuário
  router.get(
    '/users/:userId/meta-permissions',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro')
    ],
    permissionController.getUserMetaAdAccountPermissions.bind(permissionController)
  );

  // Obter permissões de propriedades GA para um usuário
  router.get(
    '/users/:userId/ga-permissions',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro')
    ],
    permissionController.getUserGAPropertyPermissions.bind(permissionController)
  );

  // Adicionar permissão de conta Meta Ads
  router.post(
    '/meta-permissions',
    [
      body('userId').isInt().withMessage('ID de usuário deve ser um número inteiro'),
      body('accountId').notEmpty().withMessage('ID da conta de anúncio é obrigatório')
    ],
    permissionController.addMetaAdAccountPermission.bind(permissionController)
  );

  // Remover permissão de conta Meta Ads
  router.delete(
    '/meta-permissions/:userId/:accountId',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro'),
      param('accountId').notEmpty().withMessage('ID da conta de anúncio é obrigatório')
    ],
    permissionController.removeMetaAdAccountPermission.bind(permissionController)
  );

  // Adicionar permissão de propriedade GA
  router.post(
    '/ga-permissions',
    [
      body('userId').isInt().withMessage('ID de usuário deve ser um número inteiro'),
      body('propertyId').notEmpty().withMessage('ID da propriedade GA é obrigatório')
    ],
    permissionController.addGAPropertyPermission.bind(permissionController)
  );

  // Remover permissão de propriedade GA
  router.delete(
    '/ga-permissions/:userId/:propertyId',
    [
      param('userId').isInt().withMessage('ID de usuário deve ser um número inteiro'),
      param('propertyId').notEmpty().withMessage('ID da propriedade GA é obrigatório')
    ],
    permissionController.removeGAPropertyPermission.bind(permissionController)
  );

  return router;
}

module.exports = permissionRoutes;
