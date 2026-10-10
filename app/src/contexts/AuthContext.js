import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { setAuthToken, setUnauthorizedHandler } from "../services/api";
import { fetchCurrentUser, login, register } from "../services/authApi";

const TOKEN_KEY = "@acorde:token";
const USER_KEY = "@acorde:user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const startSession = useCallback(async (session) => {
    setAuthToken(session.token);
    await AsyncStorage.setItem(TOKEN_KEY, session.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setUser(session.user);
    setToken(session.token);
  }, []);

  const signIn = useCallback(
    async (email, password, role) => {
      const session = await login(email, password, role);
      await startSession(session);
    },
    [startSession]
  );

  const signUp = useCallback(
    async (payload) => {
      const session = await register(payload);
      await startSession(session);
    },
    [startSession]
  );

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }, []);

  const updateUser = useCallback(
    async (changes) => {
      if (!user) return;
      const next = { ...user, ...changes };
      setUser(next);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
    },
    [user]
  );

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (!storedToken) return;

        setAuthToken(storedToken);
        try {
          const currentUser = await fetchCurrentUser();
          if (active) {
            setUser(currentUser);
            setToken(storedToken);
          }
        } catch (error) {
          if (error.response?.status === 401) {
            await signOut();
          } else if (active) {
            const storedUser = await AsyncStorage.getItem(USER_KEY);
            setUser(storedUser ? JSON.parse(storedUser) : null);
            setToken(storedToken);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, [signOut]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(
    () => ({ token, user, loading, isAdmin: user?.role === "admin", signIn, signUp, signOut, updateUser }),
    [token, user, loading, signIn, signUp, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>.");
  return context;
}
