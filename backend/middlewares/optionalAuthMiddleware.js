import User from '../models/userSchema.js';
import { accessTokensFromRequest, firstValidAccessToken } from '../utils/accessToken.js';

/** Optional login for endpoints that support both guest and authenticated flows. */
export const optionalAuthMiddleware = async (req, res, next) => {
  const tokens = accessTokensFromRequest(req);
  if (!tokens.length) return next();
  try {
    const { decoded } = firstValidAccessToken(tokens);
    if (!decoded) return next();
    const user = await User.findById(decoded.id).select('_id rol permisos').lean();
    if (user) req.user = { id: String(user._id), rol: user.rol, permisos: user.permisos || [] };
    return next();
  } catch (error) {
    console.error('No se pudo leer la sesión opcional:', error.message);
    req.user = undefined;
    return next();
  }
};
