import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axiosInstance from '../api/axiosInstance';
import {
  login as authLogin,
  registerUser,
  decodeUserFromToken,
} from '../services/authService';

interface AuthContextProps {
  user: any;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAuthData = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    fetchAuthData();
  }, []);

  const login = async (email: string, password: string) => {
    const newToken = await authLogin(email, password);
    setToken(newToken);
    localStorage.setItem('token', newToken);
    const user = decodeUserFromToken(newToken);
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    await registerUser(username, email, password);
    await login(email, password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
