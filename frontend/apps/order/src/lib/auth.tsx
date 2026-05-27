"use client";


import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { setMockOrderSessionUser } from "@repo/api-client/mock";

interface User {
  id: string;
  email: string;
  display_name?: string;
  full_name?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, fullName: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "me" }),
      });
      const data = await res.json();
      setMockOrderSessionUser(data.user?.id ?? null);
      setUser(data.user ?? null);
    } catch {
      setMockOrderSessionUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchUser(); }, [fetchUser]); // eslint-disable-line react-hooks/set-state-in-effect

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected response from server" }));
      if (!res.ok || data.error) return data.error ?? "Unable to sign in. Please try again.";
      await fetchUser();
      return null;
    } catch {
      return "Unable to reach Bakerio. Check your connection and try again.";
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string): Promise<string | null> => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", email, password, full_name: fullName }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected response from server" }));
      if (!res.ok || data.error) return data.error ?? "Unable to create your account. Please try again.";
      return null;
    } catch {
      return "Unable to reach Bakerio. Check your connection and try again.";
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setMockOrderSessionUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
