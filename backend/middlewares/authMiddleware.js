import User from '../models/userSchema.js';
import { accessTokensFromRequest, firstValidAccessToken } from '../utils/accessToken.js';

export const verificarTokenMiddleware = async (req, res, next) => {
  const tokens = accessTokensFromRequest(req);

  if (!tokens.length) {
    return res.status(401).json({ status: 'error', message: 'No hay token, acceso no autorizado' });
  }

  try {
    const { decoded } = firstValidAccessToken(tokens);
    if (!decoded) return res.status(403).json({ status: 'error', message: 'Token inválido o expirado' });
    const user = await User.findById(decoded.id).select('_id nombre email rol permisos verificado').lean();
    if (!user) return res.status(401).json({ status: 'error', message: 'La cuenta ya no está disponible.' });
    req.user = { id: String(user._id), nombre: user.nombre, email: user.email, rol: user.rol, permisos: user.permisos || [], verificado: user.verificado };
    return next();
  } catch (error) {
    console.error('Error al verificar el token:', error.message);
    return res.status(503).json({ status: 'error', message: 'No se pudo verificar la sesión.' });
  }
};
