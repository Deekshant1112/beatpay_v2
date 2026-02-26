// context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bp_token');
    const saved = localStorage.getItem('bp_user');
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
        initSocket(token);
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const loginSuccess = (token, userData) => {
    localStorage.setItem('bp_token', token);
    localStorage.setItem('bp_user', JSON.stringify(userData));
    setUser(userData);
    initSocket(token);
  };

  const logout = () => {
    localStorage.removeItem('bp_token');
    localStorage.removeItem('bp_user');
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{
      user, loading, loginSuccess, logout,
      isAuthenticated: !!user,
      isDJ: user?.role === 'dj',
      isUser: user?.role === 'user',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
