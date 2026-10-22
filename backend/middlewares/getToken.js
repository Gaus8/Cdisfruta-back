import jwt from 'jsonwebtoken';
import User from '../schema/userSchema.js';

export const verifyToken = async (req, res, next) => { // 1. Recibir 'next'
  const token = req.cookies.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ valid: false, message: 'No token provided' });
  }

  try {
    const data = jwt.verify(token, process.env.JWT_TOKEN);
    const user = await User.findById(data.id).select('_id nombre email rol permisos telefono avatar verificado').lean();
    if (!user) return res.status(401).json({ valid: false, message: 'La cuenta ya no está disponible.' });
    req.user = { id: String(user._id), nombre: user.nombre, email: user.email, rol: user.rol, permisos: user.permisos || [], telefono: user.telefono, avatar: user.avatar, verificado: user.verificado };
    return next();
  } catch (error) {
    return res.status(403).json({ valid: false, message: 'ACCESS NOT AUTHORIZED' });
  }
};
