export const sessionCookieOptions = (maxAge) => {
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  };
  if (maxAge !== undefined) options.maxAge = maxAge;
  return options;
};
