import React from "react";
import { RefreshCw, Shield } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isLoading = false,
}) => {
  return (
    <header
      id="top-navigation-header"
      className="h-16 px-8 bg-[#090e1a]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-20"
    >
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2.5">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Prototype Environment Notice */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs font-medium">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>AML Sandbox Model</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-[11px] text-slate-400 font-mono">Simulated Dataset</span>
        </div>

        {/* Refresh Simulation Button */}
        {onRefresh && (
          <button
            id="refresh-data-button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Simulate feed refresh"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? "animate-spin text-blue-400" : ""}`}
            />
            <span>Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
};
