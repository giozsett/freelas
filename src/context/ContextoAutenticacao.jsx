import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Validate token or just parse user info from storage for now
      // In a real app we'd fetch the user profile from /api/auth/user/
      fetch('http://localhost:8000/api/auth/user/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Token is invalid');
      })
      .then(data => {
        setUser(data);
      })
      .catch(err => {
        console.error(err);
        logout();
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
