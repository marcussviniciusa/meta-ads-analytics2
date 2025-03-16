const bcrypt = require('bcryptjs');

/**
 * Middleware para garantir que exista pelo menos um super admin no sistema
 * @param {Object} pgPool - Pool de conexão PostgreSQL
 */
async function ensureSuperAdminExists(pgPool) {
  try {
    console.log('Verificando existência de super administrador...');
    
    // Verificar se já existe um super admin
    const client = await pgPool.connect();
    
    try {
      const superAdminCheck = await client.query(
        "SELECT COUNT(*) FROM users WHERE role = 'super_admin'"
      );
      
      // Se não existir um super admin, criar um
      if (parseInt(superAdminCheck.rows[0].count) === 0) {
        console.log('Nenhum super administrador encontrado. Criando super admin padrão...');
        
        // Verificar se existe a empresa padrão
        const companyCheck = await client.query(
          "SELECT id FROM companies WHERE name = 'SpeedFunnels' LIMIT 1"
        );
        
        let companyId;
        
        // Se não existir a empresa padrão, criar uma
        if (companyCheck.rows.length === 0) {
          const companyResult = await client.query(
            "INSERT INTO companies (name, active, created_at, updated_at) VALUES ('SpeedFunnels', true, NOW(), NOW()) RETURNING id"
          );
          companyId = companyResult.rows[0].id;
          console.log(`Empresa padrão criada com ID: ${companyId}`);
        } else {
          companyId = companyCheck.rows[0].id;
        }
        
        // Criar super admin
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@speedfunnels.com';
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123456';
        const superAdminName = 'Super Administrator';
        
        // Hash da senha
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(superAdminPassword, saltRounds);
        
        // Inserir super admin
        await client.query(
          'INSERT INTO users (email, password_hash, name, role, company_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
          [superAdminEmail, hashedPassword, superAdminName, 'super_admin', companyId]
        );
        
        console.log(`Super administrador criado com email: ${superAdminEmail}`);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`AVISO: Super admin criado com senha padrão. Por favor, altere a senha assim que possível.`);
        }
      } else {
        console.log('Super administrador já existe no sistema.');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao verificar/criar super administrador:', error);
    // Não interromper a inicialização do servidor se houver erro
  }
}

module.exports = { ensureSuperAdminExists };
