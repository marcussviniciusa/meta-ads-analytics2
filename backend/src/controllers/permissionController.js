const { validationResult } = require('express-validator');
const PermissionService = require('../services/permissionService');

/**
 * Controlador para gerenciar permissões de acesso a contas de anúncio e propriedades GA
 */
class PermissionController {
  constructor(permissionService) {
    this.permissionService = permissionService;
  }

  /**
   * Obtém todas as permissões de contas de anúncio do Meta para um usuário
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   * @param {Function} next - Próxima função middleware
   */
  async getUserMetaAdAccountPermissions(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Verificar se o usuário atual tem permissão para visualizar
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.userId !== parseInt(userId)) {
        return res.status(403).json({ message: 'Você não tem permissão para ver essas informações' });
      }
      
      const permissions = await this.permissionService.getUserMetaAdAccountPermissions(userId);
      
      res.status(200).json({ permissions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtém todas as permissões de propriedades do Google Analytics para um usuário
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   * @param {Function} next - Próxima função middleware
   */
  async getUserGAPropertyPermissions(req, res, next) {
    try {
      const { userId } = req.params;
      
      // Verificar se o usuário atual tem permissão para visualizar
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.userId !== parseInt(userId)) {
        return res.status(403).json({ message: 'Você não tem permissão para ver essas informações' });
      }
      
      const permissions = await this.permissionService.getUserGAPropertyPermissions(userId);
      
      res.status(200).json({ permissions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adiciona permissão de acesso a uma conta de anúncio do Meta
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   * @param {Function} next - Próxima função middleware
   */
  async addMetaAdAccountPermission(req, res, next) {
    try {
      // Validar request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      // Verificar se o usuário atual tem permissão (apenas admin e super_admin)
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Apenas administradores podem gerenciar permissões' });
      }
      
      const { userId, accountId } = req.body;
      
      await this.permissionService.addMetaAdAccountPermission(
        userId, 
        accountId, 
        req.user.userId
      );
      
      res.status(201).json({ message: 'Permissão adicionada com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove permissão de acesso a uma conta de anúncio do Meta
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   * @param {Function} next - Próxima função middleware
   */
  async removeMetaAdAccountPermission(req, res, next) {
    try {
      // Verificar se o usuário atual tem permissão (apenas admin e super_admin)
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Apenas administradores podem gerenciar permissões' });
      }
      
      const { userId, accountId } = req.params;
      
      await this.permissionService.removeMetaAdAccountPermission(userId, accountId);
      
      res.status(200).json({ message: 'Permissão removida com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adiciona permissão de acesso a uma propriedade do Google Analytics
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   * @param {Function} next - Próxima função middleware
   */
  async addGAPropertyPermission(req, res, next) {
    try {
      // Validar request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      // Verificar se o usuário atual tem permissão (apenas admin e super_admin)
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Apenas administradores podem gerenciar permissões' });
      }
      
      const { userId, propertyId } = req.body;
      
      await this.permissionService.addGAPropertyPermission(
        userId, 
        propertyId, 
        req.user.userId
      );
      
      res.status(201).json({ message: 'Permissão adicionada com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove permissão de acesso a uma propriedade do Google Analytics
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   * @param {Function} next - Próxima função middleware
   */
  async removeGAPropertyPermission(req, res, next) {
    try {
      // Verificar se o usuário atual tem permissão (apenas admin e super_admin)
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Apenas administradores podem gerenciar permissões' });
      }
      
      const { userId, propertyId } = req.params;
      
      await this.permissionService.removeGAPropertyPermission(userId, propertyId);
      
      res.status(200).json({ message: 'Permissão removida com sucesso' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PermissionController;
