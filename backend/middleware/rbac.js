const rolePermissions = {
  admin: ['*'],
  user: [],
  logistica: ['inventory:read', 'inventory:write'],
  catalogo: ['catalog:read', 'catalog:write']
};

export const permissionsForRole = (role) => rolePermissions[role] || [];

export const requirePermission = (permission) => (req, res, next) => {
  if (req.user?.rol === 'admin' || (req.user?.permisos || []).includes(permission)) return next();
  return res.status(403).json({ message: 'No tienes permisos para acceder a este módulo.' });
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.rol === 'admin') return next();
  return res.status(403).json({ message: 'Acceso reservado para administración.' });
};
