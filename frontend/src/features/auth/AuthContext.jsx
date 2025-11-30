import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('skateplan-token'));
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    if (token) {
      localStorage.setItem('skateplan-token', token);
    } else {
      localStorage.removeItem('skateplan-token');
    }

    async function fetchUserProfile() {
      if (token) {
        try {
          const userData = await apiRequest('/auth/profile/', 'GET', null, token);
          setUser(userData);
        } catch (error) {
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }

    fetchUserProfile();
  }, [token]);

  const login = async (email, password) => {
    const data = await apiRequest('/auth/login/', 'POST', { email, password });
    setUser(data.user);
    setToken(data.token);
  };

  // NEW: Allows setting auth state directly (for Invite flow)
  const setAuth = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const register = async (email, password, fullName, phoneNumber) => {
    const data = await apiRequest('/auth/register/', 'POST', { 
      email, 
      password, 
      full_name: fullName,
      phone_number: phoneNumber
    });
    setUser(data.user);
    setToken(data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    setAuth, // Export this
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}