export const ROLES = { ADMIN: 'Admin', PHARMACIST: 'Pharmacist', STAFF: 'Staff' };

const permissions = {
  [ROLES.ADMIN]: ['dashboard:view', 'inventory:view', 'billing:use', 'returns:use', 'purchases:use', 'suppliers:view', 'reports:view', 'alerts:view', 'expiry:view', 'settings:manage', 'users:manage'],
  [ROLES.PHARMACIST]: ['dashboard:view', 'inventory:view', 'billing:use', 'returns:use', 'purchases:use', 'suppliers:view', 'reports:view', 'alerts:view', 'expiry:view'],
  [ROLES.STAFF]: ['dashboard:view', 'inventory:view', 'billing:use', 'returns:use'],
};

export const hasPermission = (user, permission) => Boolean(user?.isActive && permissions[user.role]?.includes(permission));
export const hasRole = (user, role) => user?.role === role;

export const pathPermissions = {
  '/': 'dashboard:view', 
  '/inventory': 'inventory:view', 
  '/billing': 'billing:use', 
  '/billing-history': 'billing:use', 
  '/returns': 'returns:use', 
  '/return-history': 'returns:use', 
  '/purchases': 'purchases:use', 
  '/suppliers': 'suppliers:view', 
  '/reports': 'reports:view', 
  '/alerts': 'alerts:view', 
  '/expiry': 'expiry:view', 
  '/settings': 'settings:manage', 
  '/users': 'users:manage',
};
