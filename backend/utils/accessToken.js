import jwt from 'jsonwebtoken';

const jwtFailure = (error) => error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError' || error?.name === 'NotBeforeError';

export const accessTokensFromRequest = (req) => {
  const header = req.headers?.cookie || '';
  const fromCookieHeader = header.split(';').flatMap((part) => {
    const separator = part.indexOf('=');
    if (separator === -1) return [];
    const name = part.slice(0, separator).trim();
    if (name !== 'access_token') return [];
    try {
      return [decodeURIComponent(part.slice(separator + 1).trim())];
    } catch {
      return [];
    }
  });
  const parsed = req.cookies?.access_token;
  const parsedTokens = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  const bearer = req.headers?.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7).trim()
    : '';
  return [...new Set([...fromCookieHeader, ...parsedTokens, bearer].filter(Boolean))];
};

export const firstValidAccessToken = (tokens) => {
  let rejected = false;
  for (const token of tokens) {
    try {
      return { decoded: jwt.verify(token, process.env.JWT_TOKEN), rejected };
    } catch (error) {
      if (!jwtFailure(error)) throw error;
      rejected = true;
    }
  }
  return { decoded: null, rejected };
};
