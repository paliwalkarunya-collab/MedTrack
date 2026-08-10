import { useState } from 'react';
import { createUser, getSession, publicUsers, signIn, signOut, updateUser as persistUser } from '../services/mockAuthService';
import { hasPermission, hasRole } from '../utils/permissions';
import { AuthContext } from './authContext';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getSession);
  const [users, setUsers] = useState(publicUsers);
  const login = async (email, password) => { const user = await signIn(email, password); setCurrentUser(user); return user; };
  const logout = () => { signOut(); setCurrentUser(null); };
  const addUser = (user) => { const created = createUser(user); setUsers(publicUsers()); return created; };
  const updateUser = (id, updates) => {
    const nextUsers = persistUser(id, updates);
    setUsers(nextUsers);
    if (currentUser?.id === id) {
      const updatedCurrentUser = nextUsers.find((user) => user.id === id) || null;
      if (!updatedCurrentUser?.isActive) signOut();
      setCurrentUser(updatedCurrentUser?.isActive ? updatedCurrentUser : null);
    }
  };
  return <AuthContext.Provider value={{ currentUser, isAuthenticated: Boolean(currentUser), users, login, logout, addUser, updateUser, hasRole: (role) => hasRole(currentUser, role), hasPermission: (permission) => hasPermission(currentUser, permission) }}>{children}</AuthContext.Provider>;
};
