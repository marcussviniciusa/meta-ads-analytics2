/**
 * Middleware to check if user has required role
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware
 */
const authorize = (roles = []) => {
  // Converter para array se for string
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // Verificar se usuário está autenticado
    if (!req.user) {
      return res.status(401).json({ message: 'Acesso não autorizado' });
    }

    // Verificar se o papel do usuário está na lista de papéis permitidos
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Usuário tem permissão para acessar
    next();
  };
};

module.exports = { authorize };
