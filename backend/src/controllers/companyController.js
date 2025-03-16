const { validationResult } = require('express-validator');
const CompanyService = require('../services/companyService');

/**
 * Controller for managing companies
 */
class CompanyController {
  constructor(pgPool) {
    this.companyService = new CompanyService(pgPool);
  }

  /**
   * Get all companies
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllCompanies(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      
      const result = await this.companyService.getAllCompanies({
        page, 
        limit, 
        search
      });
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get company by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getCompanyById(req, res, next) {
    try {
      const { id } = req.params;
      
      const company = await this.companyService.getCompanyById(id);
      
      res.status(200).json(company);
    } catch (error) {
      if (error.message === 'Empresa não encontrada') {
        return res.status(404).json({ message: error.message });
      }
      
      next(error);
    }
  }

  /**
   * Create a new company
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async createCompany(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const company = await this.companyService.createCompany(req.body);
      
      res.status(201).json(company);
    } catch (error) {
      if (error.message === 'Empresa com este nome já existe') {
        return res.status(400).json({ message: error.message });
      }
      
      next(error);
    }
  }

  /**
   * Update company
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateCompany(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      
      const company = await this.companyService.updateCompany(id, req.body);
      
      res.status(200).json(company);
    } catch (error) {
      if (error.message === 'Empresa não encontrada') {
        return res.status(404).json({ message: error.message });
      }
      
      if (error.message === 'Empresa com este nome já existe') {
        return res.status(400).json({ message: error.message });
      }
      
      next(error);
    }
  }

  /**
   * Delete company
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteCompany(req, res, next) {
    try {
      const { id } = req.params;
      
      await this.companyService.deleteCompany(id);
      
      res.status(200).json({ message: 'Empresa excluída com sucesso' });
    } catch (error) {
      if (error.message === 'Empresa não encontrada') {
        return res.status(404).json({ message: error.message });
      }
      
      if (error.message === 'Não é possível excluir uma empresa que possui usuários') {
        return res.status(400).json({ message: error.message });
      }
      
      next(error);
    }
  }

  /**
   * Get users by company ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getUsersByCompanyId(req, res, next) {
    try {
      const { id } = req.params;
      const { page, limit, search } = req.query;
      
      const result = await this.companyService.getUsersByCompanyId(id, {
        page, 
        limit, 
        search
      });
      
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Empresa não encontrada') {
        return res.status(404).json({ message: error.message });
      }
      
      next(error);
    }
  }
}

module.exports = CompanyController;
