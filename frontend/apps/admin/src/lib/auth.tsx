"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@repo/api-client";

interface User {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  roles: string[];
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authRevision = useRef(0);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    const revision = authRevision.current;
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "me" }),
      });
      const data = await res.json();
      if (revision !== authRevision.current) return;
      setUser(data.user ?? null);
      if (data.token) setToken(data.token);
    } catch {
      if (revision !== authRevision.current) return;
      setUser(null);
    } finally {
      if (revision === authRevision.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchUser(); }, [fetchUser]); // eslint-disable-line react-hooks/set-state-in-effect

  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    const data = await res.json();
    if (data.error) {
      setLoading(false);
      return data.error;
    }
    authRevision.current += 1;
    setUser(data.user);
    if (data.token) setToken(data.token);
    setLoading(false);
    return null;
  };

  const logout = async () => {
    authRevision.current += 1;
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    setToken("");
    setLoading(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
