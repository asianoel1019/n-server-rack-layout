import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, updateTheme } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('rack_theme') || 'dark');

  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme);
      localStorage.setItem('rack_theme', user.theme);
    }
  }, [user?.theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('rack_theme', newTheme);
    if (updateTheme) updateTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
