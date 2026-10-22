import jwt from 'jsonwebtoken';
import User from '../schema/userSchema.js';

/** Optional login for endpoints that support both guest and authenticated flows. */
export const optionalAuthMiddleware = async (req, res, next) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_TOKEN);
    const user = await User.findById(decoded.id).select('_id rol permisos').lean();
    if (user) req.user = { id: String(user._id), rol: user.rol, permisos: user.permisos || [] };
    return next();
  } catch {
    // Ignore an expired optional session and continue as a guest; never trust its identity.
    req.user = undefined;
    return next();
  }
};
