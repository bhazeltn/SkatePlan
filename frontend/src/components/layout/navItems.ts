import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Music2,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Skaters", to: "/skaters", icon: Users },
  { label: "Programs", to: "/programs", icon: Music2 },
  { label: "Sessions", to: "/sessions", icon: CalendarDays },
  { label: "Competitions", to: "/competitions", icon: Trophy },
  { label: "Gap Analysis", to: "/gap-analysis", icon: BarChart3 },
];
