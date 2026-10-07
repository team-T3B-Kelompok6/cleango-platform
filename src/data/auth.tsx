import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthContextValue {
  signedIn: boolean;
  login: (username: string, password: string, remember?: boolean) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const authKey = "cleango-demo-session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(
    () =>
      sessionStorage.getItem(authKey) === "active" ||
      localStorage.getItem(authKey) === "active",
  );
  const login = (username: string, password: string, remember = false) => {
    if (username.trim() !== "admin" || password !== "admin") return false;
    localStorage.removeItem(authKey);
    sessionStorage.removeItem(authKey);
    (remember ? localStorage : sessionStorage).setItem(authKey, "active");
    setSignedIn(true);
    return true;
  };
  const logout = () => {
    sessionStorage.removeItem(authKey);
    localStorage.removeItem(authKey);
    setSignedIn(false);
  };
  return (
    <AuthContext.Provider value={{ signedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
}
