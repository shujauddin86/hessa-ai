import React, { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "../utils/api";

const AuthContext = createContext(null);
const initialState = { user: null, loading: true };

function reducer(s, a) {
  switch (a.type) {
    case "SET_USER":   return { user: a.user, loading: false };
    case "CLEAR_USER": return { user: null,   loading: false };
    default:           return s;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    AsyncStorage.getItem("hessa_token").then((token) => {
      if (!token) { dispatch({ type: "CLEAR_USER" }); return; }
      authAPI.me()
        .then((r) => dispatch({ type: "SET_USER", user: r.data }))
        .catch(() => { AsyncStorage.removeItem("hessa_token"); dispatch({ type: "CLEAR_USER" }); });
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await authAPI.login({ email, password });
    await AsyncStorage.setItem("hessa_token", r.data.token);
    dispatch({ type: "SET_USER", user: r.data.user });
    return r.data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const r = await authAPI.register({ name, email, password });
    await AsyncStorage.setItem("hessa_token", r.data.token);
    dispatch({ type: "SET_USER", user: r.data.user });
    return r.data;
  }, []);

  const logout = useCallback(async () => {
    await authAPI.logout().catch(() => {});
    await AsyncStorage.removeItem("hessa_token");
    dispatch({ type: "CLEAR_USER" });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
