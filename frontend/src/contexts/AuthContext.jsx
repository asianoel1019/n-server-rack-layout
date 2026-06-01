import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('rack_token'));
  const [loading, setLoading] = useState(true);

  const apiFetch = useCallback(async (path, options = {}) => {
    const t = token || localStorage.getItem('rack_token');
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...options.headers,
      },
    });
    if (res.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    return res;
  }, [token]);

  useEffect(() => {
    if (token) {
      apiFetch('/auth/me')
        .then(r => r.json())
        .then(u => { setUser(u); setLoading(false); })
        .catch(() => { logout(); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem('rack_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('rack_token');
    setToken(null);
    setUser(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const updateTheme = async (theme) => {
    const res = await apiFetch('/auth/theme', {
      method: 'PUT',
      body: JSON.stringify({ theme }),
    });
    if (res.ok) setUser(prev => ({ ...prev, theme }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, changePassword, updateTheme, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
