/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error for internal monitoring
  console.error(`Error: ${err.message}`);
  console.error(err.stack);
  
  // Default error status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';
  
  // Send error response
  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};

module.exports = { errorHandler };
