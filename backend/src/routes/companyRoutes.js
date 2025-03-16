const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authorize } = require('../middleware/authorizationMiddleware');

/**
 * Configura as rotas de empresas
 * @param {Object} app - Express app
 * @param {Object} companyController - Controlador de empresas
 */
module.exports = function(app, companyController) {
  // Rota base para empresas
  const companyRouter = express.Router();
  app.use('/api/companies', companyRouter);
  
  // Middleware de autenticação já deve ser aplicado na app.js para todas as rotas protegidas

  // GET /api/companies
  // Obter todas as empresas
  companyRouter.get(
    '/',
    authorize(['super_admin']),
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1 }).toInt(),
      query('search').optional().isString().trim()
    ],
    companyController.getAllCompanies.bind(companyController)
  );

  // GET /api/companies/:id
  // Obter empresa por ID
  companyRouter.get(
    '/:id',
    authorize(['super_admin']),
    [
      param('id').isInt().toInt()
    ],
    companyController.getCompanyById.bind(companyController)
  );

  // POST /api/companies
  // Criar nova empresa
  companyRouter.post(
    '/',
    authorize(['super_admin']),
    [
      body('name').isString().trim().notEmpty().withMessage('Nome da empresa é obrigatório')
    ],
    companyController.createCompany.bind(companyController)
  );

  // PUT /api/companies/:id
  // Atualizar empresa
  companyRouter.put(
    '/:id',
    authorize(['super_admin']),
    [
      param('id').isInt().toInt(),
      body('name').optional().isString().trim().notEmpty(),
      body('active').optional().isBoolean()
    ],
    companyController.updateCompany.bind(companyController)
  );

  // DELETE /api/companies/:id
  // Excluir empresa
  companyRouter.delete(
    '/:id',
    authorize(['super_admin']),
    [
      param('id').isInt().toInt()
    ],
    companyController.deleteCompany.bind(companyController)
  );

  // GET /api/companies/:id/users
  // Obter usuários de uma empresa
  companyRouter.get(
    '/:id/users',
    authorize(['super_admin', 'admin']),
    [
      param('id').isInt().toInt(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1 }).toInt(),
      query('search').optional().isString().trim()
    ],
    companyController.getUsersByCompanyId.bind(companyController)
  );
};
