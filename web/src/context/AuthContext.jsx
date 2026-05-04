/**
 * context/AuthContext.jsx — Authentication state provider
 */
import { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import Cookies from "js-cookie";
import { authAPI } from "../utils/api";

const AuthContext = createContext(null);

const initialState = {
  user:    null,
  loading: true,
  error:   null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_USER":    return { ...state, user: action.user, loading: false, error: null };
    case "CLEAR_USER":  return { ...state, user: null, loading: false, error: null };
    case "SET_ERROR":   return { ...state, error: action.error, loading: false };
    case "SET_LOADING": return { ...state, loading: action.loading };
    default:            return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load current user on mount
  useEffect(() => {
    const token = Cookies.get("hessa_token");
    if (!token) { dispatch({ type: "CLEAR_USER" }); return; }

    authAPI.me()
      .then((r) => dispatch({ type: "SET_USER", user: r.data }))
      .catch(() => { Cookies.remove("hessa_token"); dispatch({ type: "CLEAR_USER" }); });
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const r = await authAPI.login({ email, password });
    Cookies.set("hessa_token", r.data.token, { expires: 7, sameSite: "Strict" });
    dispatch({ type: "SET_USER", user: r.data.user });
    return r.data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const r = await authAPI.register({ name, email, password });
    Cookies.set("hessa_token", r.data.token, { expires: 7, sameSite: "Strict" });
    dispatch({ type: "SET_USER", user: r.data.user });
    return r.data;
  }, []);

  const logout = useCallback(async () => {
    await authAPI.logout().catch(() => {});
    Cookies.remove("hessa_token");
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
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
