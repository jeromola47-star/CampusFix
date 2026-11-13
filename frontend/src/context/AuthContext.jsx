import { createContext, useContext, useState } from 'react';
import api from '../api';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const stored = () => {
  try { return JSON.parse(localStorage.getItem('cf_user')); } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(stored());

  const saveSession = ({ token, user: u }) => {
    localStorage.setItem('cf_token', token);
    localStorage.setItem('cf_user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const login = async (email, password) => saveSession((await api.post('/auth/login', { email, password })).data);
  const register = async (name, email, password) => saveSession((await api.post('/auth/register', { name, email, password })).data);
  const logout = () => {
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}
