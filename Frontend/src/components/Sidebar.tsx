import React from "react";
import {
  LayoutDashboard,
  ShieldAlert,
  BarChart3,
  BookOpen,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";
import type { UserSession } from "../types";

export type NavTab = "dashboard" | "alerts" | "reporting" | "rules";

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  user: UserSession;
  onLogout: () => void;
  pendingAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  user,
  onLogout,
  pendingAlertsCount,
}) => {
  const navItems = [
    {
      id: "dashboard" as NavTab,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "alerts" as NavTab,
      label: "Alerts",
      icon: ShieldAlert,
      badge: pendingAlertsCount > 0 ? pendingAlertsCount : null,
      badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    },
    {
      id: "reporting" as NavTab,
      label: "Reporting & Analytics",
      icon: BarChart3,
      badge: null,
    },
    {
      id: "rules" as NavTab,
      label: "AML Rules",
      icon: BookOpen,
      badge: "5",
      badgeColor: "bg-slate-800 text-slate-400 border border-slate-700",
    },
  ];

  return (
    <aside
      id="sidebar-navigation"
      className="w-64 bg-[#090e1a] border-r border-slate-800/80 flex flex-col flex-shrink-0 h-screen sticky top-0 z-30 select-none"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-slate-900 border border-blue-500/30 flex items-center justify-center text-white shadow-lg shadow-blue-950/50">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            SENTINEL <span className="text-blue-400 font-mono text-xs px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/50">AML</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
            Compliance Platform
          </div>
        </div>
      </div>

      {/* Compliance Environment Tag */}
      <div className="px-5 py-2.5 bg-slate-900/40 border-b border-slate-800/50 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Monitoring Engine
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          v2.4 Pro
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Compliance Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-blue-400" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                    item.badgeColor || "bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Connected User Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070b14]">
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-blue-950/80 border border-blue-800/40 flex items-center justify-center text-blue-300 flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {user.name}
              </div>
              <div className="text-[11px] text-blue-400 font-medium truncate">
                {user.role}
              </div>
            </div>
          </div>
          <button
            id="logout-button"
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
