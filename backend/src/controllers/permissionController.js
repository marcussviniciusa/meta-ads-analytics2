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
      console.log('[PermissionController] Buscando permissões Meta para usuário:', req.params.userId);
      // Definir cabeçalho de resposta explicitamente
      res.set('Content-Type', 'application/json');
      
      const { userId } = req.params;
      
      // Verificar se o usuário atual tem permissão para visualizar
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.userId !== parseInt(userId)) {
        console.log('[PermissionController] Acesso negado. Usuário sem permissão.', { 
          currentUser: req.user.userId, 
          requestedUser: userId,
          role: req.user.role 
        });
        return res.status(403).json({ message: 'Você não tem permissão para ver essas informações' });
      }
      
      const permissions = await this.permissionService.getUserMetaAdAccountPermissions(userId);
      console.log(`[PermissionController] Encontradas ${permissions.length} permissões Meta para usuário ${userId}`);
      
      res.status(200).json({ permissions });
    } catch (error) {
      console.error('[PermissionController] Erro ao buscar permissões Meta:', error);
      // Definir cabeçalho de resposta mesmo em caso de erro
      res.set('Content-Type', 'application/json');
      res.status(500).json({ 
        message: 'Erro ao obter permissões Meta',
        error: error.message,
        permissions: [] 
      });
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
      console.log('[PermissionController] Buscando permissões GA para usuário:', req.params.userId);
      // Definir cabeçalho de resposta explicitamente
      res.set('Content-Type', 'application/json');
      
      const { userId } = req.params;
      
      // Verificar se o usuário atual tem permissão para visualizar
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin' && req.user.userId !== parseInt(userId)) {
        console.log('[PermissionController] Acesso negado. Usuário sem permissão.', { 
          currentUser: req.user.userId, 
          requestedUser: userId,
          role: req.user.role 
        });
        return res.status(403).json({ message: 'Você não tem permissão para ver essas informações' });
      }
      
      const permissions = await this.permissionService.getUserGAPropertyPermissions(userId);
      console.log(`[PermissionController] Encontradas ${permissions.length} permissões GA para usuário ${userId}`);
      
      res.status(200).json({ permissions });
    } catch (error) {
      console.error('[PermissionController] Erro ao buscar permissões GA:', error);
      // Definir cabeçalho de resposta mesmo em caso de erro
      res.set('Content-Type', 'application/json');
      res.status(500).json({ 
        message: 'Erro ao obter permissões GA',
        error: error.message,
        permissions: [] 
      });
    }
  }

  /**
   * Adiciona permissão de acesso a uma conta de anúncio do Meta
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   * @param {Function} next - Próxima função middleware
   */
  async assignMetaAdAccountPermission(req, res, next) {
    try {
      // Definir cabeçalho de resposta explicitamente
      res.set('Content-Type', 'application/json');
      
      // Validar request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('[PermissionController] Erro de validação ao adicionar permissão Meta:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }
      
      // Log detalhado do usuário atual
      console.log('[PermissionController] Usuário atual:', {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email
      });
      
      // Verificar se o usuário atual tem permissão (apenas admin e super_admin)
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        console.log('[PermissionController] Acesso negado. Role necessário: super_admin ou admin, role atual:', req.user.role);
        return res.status(403).json({ message: 'Apenas administradores podem gerenciar permissões' });
      }
      
      const userId = req.params.userId;
      const accountId = req.params.accountId;
      console.log('[PermissionController] Adicionando permissão Meta:', { userId, accountId, requesterId: req.user.userId });
      
      await this.permissionService.addMetaAdAccountPermission(
        userId, 
        accountId, 
        req.user.userId
      );
      
      console.log('[PermissionController] Permissão Meta adicionada com sucesso');
      res.status(201).json({ 
        message: 'Permissão adicionada com sucesso',
        userId,
        accountId
      });
    } catch (error) {
      console.error('[PermissionController] Erro ao adicionar permissão Meta:', error);
      // Definir cabeçalho de resposta mesmo em caso de erro
      res.set('Content-Type', 'application/json');
      res.status(500).json({ 
        message: 'Erro ao adicionar permissão Meta',
        error: error.message
      });
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
      // Definir cabeçalho de resposta explicitamente
      res.set('Content-Type', 'application/json');
      
      // Verificar se o usuário atual tem permissão (apenas admin e super_admin)
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        console.log('[PermissionController] Acesso negado ao remover permissão Meta. Role necessário: super_admin ou admin, role atual:', req.user.role);
        return res.status(403).json({ message: 'Apenas administradores podem gerenciar permissões' });
      }
      
      const { userId, accountId } = req.params;
      console.log('[PermissionController] Removendo permissão Meta:', { userId, accountId, requesterId: req.user.userId });
      
      await this.permissionService.removeMetaAdAccountPermission(userId, accountId);
      
      console.log('[PermissionController] Permissão Meta removida com sucesso');
      res.status(200).json({ 
        message: 'Permissão removida com sucesso',
        userId,
        accountId
      });
    } catch (error) {
      console.error('[PermissionController] Erro ao remover permissão Meta:', error);
      // Definir cabeçalho de resposta mesmo em caso de erro
      res.set('Content-Type', 'application/json');
      res.status(500).json({ 
        message: 'Erro ao remover permissão Meta',
        error: error.message
      });
    }
  }

  /**
   * Adiciona permissão de acesso a uma propriedade do Google Analytics
   * @param {Object} req - Request Express
   * @param {Object} res - Response Express
   * @param {Function} next - Próxima função middleware
   */
  async assignGAPropertyPermission(req, res, next) {
    try {
      // Definir cabeçalho de resposta explicitamente
      res.set('Content-Type', 'application/json');
      
      // Validar request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('[PermissionController] Erro de validação ao adicionar permissão GA:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }
      
      // Verificar se o usuário atual tem permissão (apenas admin e super_admin)
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        console.log('[PermissionController] Acesso negado ao adicionar permissão GA. Role necessário: super_admin ou admin, role atual:', req.user.role);
        return res.status(403).json({ message: 'Apenas administradores podem gerenciar permissões' });
      }
      
      const userId = req.params.userId;
      const propertyId = req.params.propertyId;
      console.log('[PermissionController] Adicionando permissão GA:', { userId, propertyId, requesterId: req.user.userId });
      
      await this.permissionService.addGAPropertyPermission(
        userId, 
        propertyId, 
        req.user.userId
      );
      
      console.log('[PermissionController] Permissão GA adicionada com sucesso');
      res.status(201).json({ 
        message: 'Permissão adicionada com sucesso',
        userId,
        propertyId
      });
    } catch (error) {
      console.error('[PermissionController] Erro ao adicionar permissão GA:', error);
      // Definir cabeçalho de resposta mesmo em caso de erro
      res.set('Content-Type', 'application/json');
      res.status(500).json({ 
        message: 'Erro ao adicionar permissão GA',
        error: error.message
      });
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
      // Definir cabeçalho de resposta explicitamente
      res.set('Content-Type', 'application/json');
      
      // Verificar se o usuário atual tem permissão (apenas admin e super_admin)
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        console.log('[PermissionController] Acesso negado ao remover permissão GA. Role necessário: super_admin ou admin, role atual:', req.user.role);
        return res.status(403).json({ message: 'Apenas administradores podem gerenciar permissões' });
      }
      
      const { userId, propertyId } = req.params;
      console.log('[PermissionController] Removendo permissão GA:', { userId, propertyId, requesterId: req.user.userId });
      
      await this.permissionService.removeGAPropertyPermission(userId, propertyId);
      
      console.log('[PermissionController] Permissão GA removida com sucesso');
      res.status(200).json({ 
        message: 'Permissão removida com sucesso',
        userId,
        propertyId
      });
    } catch (error) {
      console.error('[PermissionController] Erro ao remover permissão GA:', error);
      // Definir cabeçalho de resposta mesmo em caso de erro
      res.set('Content-Type', 'application/json');
      res.status(500).json({ 
        message: 'Erro ao remover permissão GA',
        error: error.message
      });
    }
  }
}

module.exports = PermissionController;
