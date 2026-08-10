import { createContext } from 'react';

export const AuthContext = createContext({ currentUser: null, isAuthenticated: false, users: [], login: async () => {}, logout: () => {}, hasRole: () => false, hasPermission: () => false, addUser: () => {}, updateUser: () => {} });
