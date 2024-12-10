import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { API_URL } from '../services/API_URL';

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
        axios.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${storedToken}`;
      }
      setLoading(false);
    };
    fetchAuthData();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });
    const { token } = response.data;
    setToken(token);
    localStorage.setItem('token', token);
    const user = JSON.parse(atob(token.split('.')[1]));
    user.id = user.userId;
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
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
