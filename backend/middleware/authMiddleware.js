import jwt from 'jsonwebtoken';

export const verificarTokenMiddleware = (req, res, next) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'No hay token, acceso no autorizado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_TOKEN);
    req.user = decoded; // Inyecta los datos del usuario (id, rol, etc.) en la petición
    next();
  } catch (error) {
    return res.status(403).json({ status: 'error', message: 'Token inválido o expirado' });
  }
};