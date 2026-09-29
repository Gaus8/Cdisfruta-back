import jwt from 'jsonwebtoken';

/** Optional login for endpoints that support both guest and authenticated flows. */
export const optionalAuthMiddleware = (req, res, next) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_TOKEN);
    return next();
  } catch {
    // Ignore an expired optional session and continue as a guest; never trust its identity.
    req.user = undefined;
    return next();
  }
};
