import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./navItems";

/** Fixed bottom navigation for mobile viewports (< 768px), height h-16. */
export function MobileNav() {
  return (
    <nav
      data-testid="mobile-nav"
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-stretch border-t border-slate-200 bg-white"
    >
      {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
              isActive ? "text-blue-700" : "text-slate-600"
            )
          }
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span className="truncate px-0.5">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
