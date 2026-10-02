// Keeps the logged-in user in React context so any component can read it.
import { createContext, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  // On page load, if we have a token, ask the backend who we are.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setChecking(false));
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    // /auth/me also returns the customer's company, which the portal shows.
    const me = await api.get('/auth/me');
    setUser(me.data);
    return me.data;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, checking, login, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

// Where each role lands after login.
// eslint-disable-next-line react-refresh/only-export-components
export const homeFor = (role) => ({ ADMIN: '/admin', TECHNICIAN: '/tech', CUSTOMER: '/portal' })[role] || '/login';
