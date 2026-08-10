export const ROLES = { ADMIN: 'Admin', PHARMACIST: 'Pharmacist', STAFF: 'Staff' };

const permissions = {
  [ROLES.ADMIN]: ['dashboard:view', 'inventory:view', 'billing:use', 'purchases:use', 'suppliers:view', 'analytics:view', 'reports:view', 'alerts:view', 'expiry:view', 'settings:manage', 'users:manage'],
  [ROLES.PHARMACIST]: ['dashboard:view', 'inventory:view', 'billing:use', 'purchases:use', 'suppliers:view', 'analytics:view', 'reports:view', 'alerts:view', 'expiry:view'],
  [ROLES.STAFF]: ['dashboard:view', 'inventory:view', 'billing:use'],
};

export const hasPermission = (user, permission) => Boolean(user?.isActive && permissions[user.role]?.includes(permission));
export const hasRole = (user, role) => user?.role === role;

export const pathPermissions = {
  '/': 'dashboard:view', '/inventory': 'inventory:view', '/billing': 'billing:use', '/purchases': 'purchases:use', '/suppliers': 'suppliers:view', '/analytics': 'analytics:view', '/reports': 'reports:view', '/alerts': 'alerts:view', '/expiry': 'expiry:view', '/settings': 'settings:manage', '/users': 'users:manage',
};
