import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/lib/useIsMobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

function TopBar({ role, onSignOut }: { role: string | null; onSignOut: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
      <span className="text-base font-semibold text-slate-900 md:hidden">SkatePlan</span>
      <div className="ml-auto flex items-center gap-3">
        {role && (
          <Badge variant="primary" className="uppercase tracking-wide">{role}</Badge>
        )}
        <Button variant="ghost" size="sm" onClick={onSignOut}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </Button>
      </div>
    </header>
  );
}

/** Application chrome: responsive nav (desktop rail / mobile bottom bar),
 *  a top bar with the user role badge and a logout action. */
export function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { role, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {!isMobile && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar role={role} onSignOut={signOut} />
        <main className={isMobile ? "flex-1 p-4 pb-20" : "flex-1 p-4 lg:p-6"}>{children}</main>
        {isMobile && <MobileNav />}
      </div>
    </div>
  );
}
