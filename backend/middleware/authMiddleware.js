import jwt from 'jsonwebtoken';
import User from '../schema/userSchema.js';

export const verificarTokenMiddleware = async (req, res, next) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'No hay token, acceso no autorizado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_TOKEN);
    const user = await User.findById(decoded.id).select('_id nombre email rol permisos verificado').lean();
    if (!user) return res.status(401).json({ status: 'error', message: 'La cuenta ya no está disponible.' });
    req.user = { id: String(user._id), nombre: user.nombre, email: user.email, rol: user.rol, permisos: user.permisos || [], verificado: user.verificado };
    return next();
  } catch (error) {
    return res.status(403).json({ status: 'error', message: 'Token inválido o expirado' });
  }
};
