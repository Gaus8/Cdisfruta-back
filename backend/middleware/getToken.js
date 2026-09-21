import jwt from 'jsonwebtoken';

export const verifyToken = async (req, res, next) => { // 1. Recibir 'next'
  const token = req.cookies.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ valid: false, message: 'No token provided' });
  }

  try {
    const data = jwt.verify(token, process.env.JWT_TOKEN);
    req.user = data; // 2. Guardamos la data decodificada para que el controlador la lea (req.user.id)
    next();          // 3. ¡Importante! Llamamos a next() para que Express pase al siguiente controlador
  } catch (error) {
    return res.status(403).json({ valid: false, message: 'ACCESS NOT AUTHORIZED' });
  }
};