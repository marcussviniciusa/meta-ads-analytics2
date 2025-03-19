const { authMiddleware } = (function() {
  const jwt = require('jsonwebtoken');
  
  /**
   * Middleware de autenticação
   * Verifica se o token JWT é válido e adiciona informações do usuário ao objeto de requisição
   * @param {Object} req - Objeto de requisição do Express
   * @param {Object} res - Objeto de resposta do Express
   * @param {Function} next - Próxima função middleware
   */
  const authMiddleware = (req, res, next) => {
    try {
      // Obter token do header Authorization
      const authHeader = req.headers.authorization;
      console.log('[AuthMiddleware] Header de autorização:', authHeader ? `${authHeader.substring(0, 15)}...` : 'ausente');
      
      if (!authHeader) {
        console.log('[AuthMiddleware] Token não fornecido');
        return res.status(401).json({ message: 'Token não fornecido' });
      }
      
      // Formato esperado: "Bearer <token>"
      const parts = authHeader.split(' ');
      
      if (parts.length !== 2) {
        console.log('[AuthMiddleware] Formato de token inválido');
        return res.status(401).json({ message: 'Formato de token inválido' });
      }
      
      const [scheme, token] = parts;
      
      if (!/^Bearer$/i.test(scheme)) {
        console.log('[AuthMiddleware] Token mal formatado');
        return res.status(401).json({ message: 'Token mal formatado' });
      }
      
      // Verificar token
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          console.log('[AuthMiddleware] Token inválido:', err.message);
          return res.status(401).json({ message: 'Token inválido' });
        }
        
        console.log('[AuthMiddleware] Token decodificado com sucesso:', {
          userId: decoded.userId || decoded.id,
          email: decoded.email,
          role: decoded.role
        });
        
        // Adicionar informações do usuário ao objeto de requisição
        req.user = {
          userId: decoded.userId, 
          email: decoded.email,
          role: decoded.role
        };
        
        console.log('[AuthMiddleware] Usuário autenticado:', req.user);
        
        return next();
      });
    } catch (error) {
      console.error('[AuthMiddleware] Erro de autenticação:', error);
      return res.status(500).json({ message: 'Erro interno ao autenticar' });
    }
  };
  
  return { authMiddleware };
})();

module.exports = { authMiddleware };
