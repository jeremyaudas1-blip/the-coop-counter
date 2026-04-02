import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest, setAuthToken, queryClient } from "./queryClient";

interface UserInfo {
  id: number;
  name: string;
  email: string;
}

interface FamilyInfo {
  id: number;
  name: string;
}

interface AuthContextType {
  user: UserInfo | null;
  family: FamilyInfo | null;
  families: { id: number; name: string; role: string }[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (name: string, email: string, password: string, familyName: string, marketingConsent: boolean) => Promise<string | null>;
  logout: () => void;
  switchFamily: (familyId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [families, setFamilies] = useState<{ id: number; name: string; role: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch(
        ("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__") + "/api/auth/me",
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setFamily(data.family);
        setFamilies(data.families || []);
      }
    } catch {}
    finally { setIsLoading(false); }
  }

  async function login(email: string, password: string): Promise<string | null> {
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await res.json();
      setAuthToken(data.token);
      setUser(data.user);
      setFamily(data.family);
      setFamilies(data.families || []);
      queryClient.clear();
      return null;
    } catch (e: any) {
      try {
        const msg = JSON.parse(e.message.split(": ").slice(1).join(": "));
        return msg.message || "Login failed";
      } catch {
        return e.message?.includes("401") ? "Invalid email or password" : "Login failed";
      }
    }
  }

  async function signup(name: string, email: string, password: string, familyName: string, marketingConsent: boolean): Promise<string | null> {
    try {
      const res = await apiRequest("POST", "/api/auth/signup", { name, email, password, familyName, marketingConsent });
      const data = await res.json();
      setAuthToken(data.token);
      setUser(data.user);
      setFamily(data.family);
      setFamilies([{ id: data.family.id, name: data.family.name, role: "owner" }]);
      queryClient.clear();
      return null;
    } catch (e: any) {
      try {
        const msg = JSON.parse(e.message.split(": ").slice(1).join(": "));
        return msg.message || "Signup failed";
      } catch {
        return e.message?.includes("409") ? "An account with this email already exists" : "Signup failed";
      }
    }
  }

  function logout() {
    setAuthToken(null);
    setUser(null);
    setFamily(null);
    setFamilies([]);
    queryClient.clear();
    fetch(("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__") + "/api/auth/logout", { method: "POST", credentials: "include" });
  }

  async function switchFamily(familyId: number) {
    try {
      const res = await apiRequest("POST", "/api/auth/switch-family", { familyId });
      const data = await res.json();
      setAuthToken(data.token);
      setFamily(data.family);
      queryClient.clear();
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, family, families, isLoading, login, signup, logout, switchFamily }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
