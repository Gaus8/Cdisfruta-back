const rolePermissions = {
  admin: ['*'],
  user: [],
  logistica: [
    'inventory:read',
    'inventory:write',
    'orders:read',
    'orders:write',
    'notifications:read',
    'profile:write',
  ],
  catalogo: [
    'catalog:read',
    'catalog:write',
    'inventory:read',
    'landing:write',
    'analytics:read',
    'profile:write',
  ],
};

export const permissionsForRole = (role) => rolePermissions[role] || [];

/** Une permisos guardados en DB con los del rol (así ampliar un rol aplica sin reasignar). */
export const effectivePermissions = (user) => {
  if (!user) return [];
  if (user.rol === 'admin') return ['*'];
  return [...new Set([...(permissionsForRole(user.rol) || []), ...(user.permisos || [])])];
};

export const hasPermission = (user, permission) => {
  const perms = effectivePermissions(user);
  return perms.includes('*') || perms.includes(permission);
};

export const requirePermission = (permission) => (req, res, next) => {
  if (hasPermission(req.user, permission)) return next();
  return res.status(403).json({ message: 'No tienes permisos para acceder a este módulo.' });
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.rol === 'admin') return next();
  return res.status(403).json({ message: 'Acceso reservado para administración.' });
};
