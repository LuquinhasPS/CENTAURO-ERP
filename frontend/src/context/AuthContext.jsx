import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  const api = axios.create({
    baseURL: 'http://127.0.0.1:8000',
    timeout: 15000,
  });

  api.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  useEffect(() => {
    const fetchUser = async () => {
      // Logic modified to support Backend Auth Bypass
      // We attempt to fetch user even if no token is present
      try {
        const response = await api.get('/me'); // Use local api instance
        setUser(response.data);
        // If backend returned user but we had no token, it means we are in bypass mode.
        // We might want to set a dummy token? Not strictly necessary if backend doesn't check it.
      } catch (error) {
        console.error("Failed to fetch user", error);
        // Only logout (clear state) if we really failed
        // But logout clears user, so we are good.
        // If 401, it will fail.
        setUser(null);
        localStorage.removeItem('token');
        setToken(null);
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const formData = new FormData();
      formData.append('username', email); // OAuth2PasswordRequestForm expects username
      formData.append('password', password);

      const response = await api.post('/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);

      // Fetch user immediate to avoid race condition with PrivateRoute
      try {
        const userResponse = await api.get('/me', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        setUser(userResponse.data);
        return { success: true };
      } catch (userError) {
        console.error("Failed to fetch user after login", userError);
        return { success: false, message: "Falha ao recuperar dados do usuário." };
      }
    } catch (error) {
      console.error("Login failed", error);
      let message = "Falha no login.";
      if (error.code === "ERR_NETWORK") {
        message = "Erro de conexão. Verifique se o servidor backend está rodando.";
      } else if (error.response) {
        message = error.response.data.detail || "Credenciais inválidas.";
      }
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (module, action = 'read') => {
    if (!user) return false;
    if (user.is_superuser) return true;

    // Check if user has permissions object
    if (!user.permissions) return false;

    // Check module permissions
    const modulePerms = user.permissions[module];
    if (!modulePerms) return false;

    // Check specific action
    // Map 'edit' to 'write' to match database storage conventions
    const normalizedAction = action === 'edit' ? 'write' : action;
    return modulePerms.includes(normalizedAction);
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    hasPermission,
    api // Expose the configured axios instance if needed elsewhere
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
