import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

interface AuthContextProps {
  user: any;
  token: string | null;
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
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });
    const { token } = response.data;
    setToken(token);
    localStorage.setItem('token', token);
    // Decode token to get user info (optional)
    const user = JSON.parse(atob(token.split('.')[1]));
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    await axios.post(`${API_URL}/auth/register`, {
      username,
      email,
      password,
    });
    // Optionally log the user in after registration
    await login(email, password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
