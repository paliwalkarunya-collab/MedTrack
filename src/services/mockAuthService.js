import { ROLES } from '../utils/permissions';

const USERS_KEY = 'medtrack-auth-users-v1';
const SESSION_KEY = 'medtrack-auth-session-v1';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const defaultUsers = [
  { id: 'usr-admin', name: 'Administrator', email: 'admin@medtrack.local', password: 'MedTrack123!', role: ROLES.ADMIN, isActive: true },
  { id: 'usr-pharmacist', name: 'Pharmacist', email: 'pharmacist@medtrack.local', password: 'MedTrack123!', role: ROLES.PHARMACIST, isActive: true },
  { id: 'usr-staff', name: 'Staff Member', email: 'staff@medtrack.local', password: 'MedTrack123!', role: ROLES.STAFF, isActive: true },
];

const safeParse = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value ?? fallback; } catch { return fallback; } };
const publicUser = (user) => { const safeUser = { ...user }; delete safeUser.password; return safeUser; };

export const getUsers = () => {
  const users = safeParse(USERS_KEY, defaultUsers);
  return Array.isArray(users) && users.every((user) => user?.id && user?.name && user?.email && user?.password && user?.role && typeof user.isActive === 'boolean') ? users : defaultUsers;
};
export const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));
export const getSession = () => {
  const session = safeParse(SESSION_KEY, null);
  if (!session?.id || !session?.email || !session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) { signOut(); return null; }
  const user = getUsers().find((item) => item.id === session.id && item.email === session.email && item.isActive);
  return user ? publicUser(user) : null;
};
export const signIn = async (email, password) => {
  const user = getUsers().find((item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password);
  if (!user || !user.isActive) throw new Error('Invalid email or password.');
  const session = { ...publicUser(user), expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session)); return publicUser(user);
};
export const signOut = () => localStorage.removeItem(SESSION_KEY);
export const createUser = (user) => {
  const users = getUsers();
  if (users.some((item) => item.email.toLowerCase() === user.email.trim().toLowerCase())) throw new Error('A user with this email already exists.');
  const next = { id: `usr-${Date.now()}`, name: user.name.trim(), email: user.email.trim().toLowerCase(), password: user.password, role: user.role, isActive: true };
  saveUsers([...users, next]); return publicUser(next);
};
export const updateUser = (id, updates) => { const users = getUsers().map((user) => user.id === id ? { ...user, ...updates } : user); saveUsers(users); return users.map(publicUser); };
export const publicUsers = () => getUsers().map(publicUser);
