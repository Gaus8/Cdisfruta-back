import User from '../models/userSchema.js';
import { accessTokensFromRequest, firstValidAccessToken } from '../utils/accessToken.js';

export const verifyToken = async (req, res, next) => {
  const tokens = accessTokensFromRequest(req);

  if (!tokens.length) {
    return res.status(403).json({ valid: false, message: 'No token provided' });
  }

  try {
    const { decoded } = firstValidAccessToken(tokens);
    if (!decoded) return res.status(403).json({ valid: false, message: 'ACCESS NOT AUTHORIZED' });
    const user = await User.findById(decoded.id).select('_id nombre email rol permisos telefono avatar verificado').lean();
    if (!user) return res.status(401).json({ valid: false, message: 'La cuenta ya no está disponible.' });
    req.user = { id: String(user._id), nombre: user.nombre, email: user.email, rol: user.rol, permisos: user.permisos || [], telefono: user.telefono, avatar: user.avatar, verificado: user.verificado };
    return next();
  } catch (error) {
    console.error('Error al verificar el token:', error.message);
    return res.status(503).json({ valid: false, message: 'No se pudo verificar la sesión.' });
  }
};
