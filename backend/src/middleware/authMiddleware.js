const jwt = require('jsonwebtoken');

/**
 * Middleware for authenticating and authorizing API requests
 */
const authMiddleware = (req, res, next) => {
  try {
    // Get token from request header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Não autorizado - token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role  // Adicionando o papel do usuário
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Não autorizado - token expirado' });
    }
    
    return res.status(401).json({ message: 'Não autorizado - token inválido' });
  }
};

module.exports = { authMiddleware };
