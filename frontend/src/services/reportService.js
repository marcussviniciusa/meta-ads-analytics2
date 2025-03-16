import api from './api';

/**
 * Service for handling report-related API calls
 */
class ReportService {
  /**
   * Get all saved reports for the current user
   * @returns {Promise} - API response
   */
  async getSavedReports() {
    const response = await api.get('/reports/saved');
    return response.data;
  }

  /**
   * Get a specific saved report
   * @param {number} reportId - The report ID
   * @returns {Promise} - API response
   */
  async getSavedReport(reportId) {
    const response = await api.get(`/reports/saved/${reportId}`);
    return response.data;
  }

  /**
   * Save a new report
   * @param {Object} reportData - The report data
   * @returns {Promise} - API response
   */
  async saveReport(reportData) {
    const response = await api.post('/reports/save', reportData);
    return response.data;
  }

  /**
   * Generate a custom report based on criteria
   * @param {Object} criteria - Report criteria (filters, date range, etc.)
   * @returns {Promise} - API response
   */
  async generateCustomReport(criteria) {
    const response = await api.post('/reports/generate', criteria);
    return response.data;
  }
}

export default new ReportService();
