import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "./navItems";

function SidebarLink({ label, to, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
          isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  );
}

/**
 * Desktop / tablet rail. Full width (w-64) on lg+, collapsed icon rail (w-16)
 * on md (tablet). Labels are hidden when collapsed but stay in the DOM for a11y.
 */
export function Sidebar() {
  return (
    <aside
      data-testid="desktop-sidebar"
      className="hidden md:flex md:w-16 lg:w-64 shrink-0 flex-col border-r border-slate-200 bg-white"
    >
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
        <span className="text-lg font-bold text-blue-600">SP</span>
        <span className="hidden text-lg font-semibold text-slate-900 lg:inline">SkatePlan</span>
      </div>
      <nav aria-label="Primary" className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}
      </nav>
    </aside>
  );
}
