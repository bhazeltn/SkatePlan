import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SystemRole } from "@/lib/types";
import { login as apiLogin } from "@/lib/api";

export const TOKEN_KEY = "skateplan_token";

interface AuthState {
  token: string | null;
  role: SystemRole | null;
  userId: number | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Decode the role/user_id claims from a JWT payload (no verification). */
function decodeClaims(token: string | null): {
  role: SystemRole | null;
  userId: number | null;
} {
  if (!token) return { role: null, userId: null };
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    return { role: payload.system_role ?? null, userId: payload.user_id ?? null };
  } catch {
    return { role: null, userId: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const value = useMemo<AuthState>(() => {
    const { role, userId } = decodeClaims(token);
    return {
      token,
      role,
      userId,
      isAuthenticated: Boolean(token),
      signIn,
      signOut,
    };
  }, [token, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
