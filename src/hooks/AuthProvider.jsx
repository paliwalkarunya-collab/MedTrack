import { useState, useEffect } from 'react';
import { authApi, setPharmacyId } from '../api/client';
import { hasPermission, hasRole } from '../utils/permissions';
import { AuthContext } from './authContext';

const TOKEN_KEY = 'medtrack-access-token';
const USER_KEY = 'medtrack-current-user';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessiblePharmacies, setAccessiblePharmacies] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      if (token && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          
          // Try to get fresh user data from backend
          const freshUser = await authApi.getMe();
          setCurrentUser(freshUser);
          localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        } catch (error) {
          // Token might be expired, clear auth
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    const { access_token, token_type } = response;
    localStorage.setItem(TOKEN_KEY, access_token);
    
    // Get current user info
    const user = await authApi.getMe();
    setCurrentUser(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    // Get accessible pharmacies
    const pharmacies = await authApi.getPharmacies();
    setAccessiblePharmacies(pharmacies);
    
    return user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setCurrentUser(null);
    setAccessiblePharmacies([]);
  };

  const selectPharmacy = async (pharmacyId) => {
    const response = await authApi.selectPharmacy(pharmacyId);
    setPharmacyId(pharmacyId);
    const pharmacy = await authApi.getCurrentPharmacy();
    return pharmacy;
  };

  const register = async (userData) => {
    return authApi.register(userData);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: Boolean(currentUser),
      isLoading,
      users,
      accessiblePharmacies,
      login,
      logout,
      register,
      selectPharmacy,
      hasRole: (role) => hasRole(currentUser, role),
      hasPermission: (permission) => hasPermission(currentUser, permission),
    }}>
      {children}
    </AuthContext.Provider>
  );
};