/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AdminContext = createContext(null);

// Custom hook to use admin context
const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

// Admin provider component
const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if admin is already logged in on app start
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token = adminAPI.getToken();
        if (token) {
          // Verify token is still valid
          const response = await adminAPI.verify();
          setAdmin(response.admin);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Admin auth check failed:', error);
        // Token is invalid, remove it
        adminAPI.logout();
        setIsAuthenticated(false);
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  const login = async (username, password) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await adminAPI.login(username, password);
      
      setAdmin(response.user);
      setIsAuthenticated(true);
      
      return { success: true, admin: response.user };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Admin login failed';
      setError(errorMessage);
      setIsAuthenticated(false);
      setAdmin(null);
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    adminAPI.logout();
    setAdmin(null);
    setIsAuthenticated(false);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    admin,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export { useAdmin, AdminProvider };