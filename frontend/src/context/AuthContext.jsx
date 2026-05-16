import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { setAuthToken } from "../api/client";

const AuthContext = createContext(null);

const STORAGE_KEY = "parent-school-auth";

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const apiErrorMessage = (err) => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err?.response) {
    return "Cannot reach the server. Start the backend (port 4000) and check VITE_API_BASE_URL in frontend/.env.";
  }
  return err?.message || "Request failed";
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [refreshTokenExpiresAt, setRefreshTokenExpiresAt] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? safeParse(raw) : null;
    if (parsed?.token && parsed?.user) {
      setToken(parsed.token);
      setUser(parsed.user);
      setRefreshToken(parsed.refreshToken || null);
      setRefreshTokenExpiresAt(parsed.refreshTokenExpiresAt || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token && user) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ token, refreshToken, refreshTokenExpiresAt, user }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [token, refreshToken, refreshTokenExpiresAt, user]);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      setToken(response.data.data.token);
      setRefreshToken(response.data.data.refreshToken);
      setRefreshTokenExpiresAt(response.data.data.refreshTokenExpiresAt);
      setUser(response.data.data.user);
      return response.data.data.user;
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  };

  const register = async (payload) => {
    try {
      const response = await api.post("/auth/register", payload);
      setToken(response.data.data.token);
      setRefreshToken(response.data.data.refreshToken);
      setRefreshTokenExpiresAt(response.data.data.refreshTokenExpiresAt);
      setUser(response.data.data.user);
      return response.data.data.user;
    } catch (err) {
      throw new Error(apiErrorMessage(err));
    }
  };

  const logout = async () => {
    if (token) {
      await api.post("/auth/logout").catch(() => null);
    }
    setToken(null);
    setRefreshToken(null);
    setRefreshTokenExpiresAt(null);
    setUser(null);
  };

  const refreshSession = async () => {
    if (!refreshToken) return null;
    const response = await api.post("/auth/refresh", { refreshToken });
    setToken(response.data.data.token);
    setRefreshToken(response.data.data.refreshToken);
    setRefreshTokenExpiresAt(response.data.data.refreshTokenExpiresAt);
    setUser(response.data.data.user);
    return response.data.data.user;
  };

  const refreshMe = async () => {
    if (!token) return null;
    const response = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = response.data.data.user;
    setUser(me);
    return me;
  };

  useEffect(() => {
    if (!refreshTokenExpiresAt || !refreshToken) return undefined;
    const expiresAt = new Date(refreshTokenExpiresAt).getTime();
    if (!Number.isFinite(expiresAt)) return undefined;
    const refreshInMs = Math.max(expiresAt - Date.now() - 5 * 60 * 1000, 1000);
    const timer = setTimeout(() => {
      refreshSession().catch(() => null);
    }, refreshInMs);
    return () => clearTimeout(timer);
  }, [refreshToken, refreshTokenExpiresAt]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry && refreshToken) {
          original._retry = true;
          try {
            const refreshed = await api.post("/auth/refresh", { refreshToken });
            const nextToken = refreshed.data.data.token;
            setToken(nextToken);
            setRefreshToken(refreshed.data.data.refreshToken);
            setRefreshTokenExpiresAt(refreshed.data.data.refreshTokenExpiresAt);
            setUser(refreshed.data.data.user);
            setAuthToken(nextToken);
            original.headers.Authorization = `Bearer ${nextToken}`;
            return api(original);
          } catch (_err) {
            await logout();
          }
        }
        return Promise.reject(error);
      },
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [refreshToken]);

  const value = useMemo(
    () => ({
      token,
      refreshToken,
      refreshTokenExpiresAt,
      user,
      loading,
      login,
      register,
      logout,
      refreshMe,
      refreshSession,
      isAuthenticated: Boolean(token && user),
    }),
    [token, refreshToken, refreshTokenExpiresAt, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
