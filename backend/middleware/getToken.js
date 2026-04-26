import jwt from 'jsonwebtoken';

export const verifyToken = async (req, res) => {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(403).json({
      valid: false,
      message: 'No token provided'
    });
  }

  try {
    const data = jwt.verify(token, process.env.JWT_TOKEN);
    
    // ✅ Retornar la estructura que espera el frontend
    return res.status(200).json({
      valid: true,
      user: data,
      message: 'Token válido'
    });
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    // ✅ Retornar estructura consistente incluso en errores
    return res.status(403).json({ 
      valid: false, 
      message: 'ACCESS NOT AUTHORIZED' 
    });
  }
};

