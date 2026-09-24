import React from "react";

export const SkeletonCard: React.FC = () => {
  return (
    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-slate-800 rounded" />
        <div className="h-8 w-8 bg-slate-800 rounded-lg" />
      </div>
      <div className="h-7 w-20 bg-slate-750 bg-slate-800 rounded" />
      <div className="h-3 w-36 bg-slate-800/60 rounded" />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden animate-pulse">
      <div className="h-12 bg-slate-800/60 border-b border-slate-800 px-6 flex items-center gap-4">
        <div className="h-4 w-28 bg-slate-700/60 rounded" />
        <div className="h-4 w-20 bg-slate-700/60 rounded" />
        <div className="h-4 w-16 bg-slate-700/60 rounded" />
        <div className="h-4 w-32 bg-slate-700/60 rounded" />
      </div>
      <div className="divide-y divide-slate-800/60">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="h-4 w-24 bg-slate-800 rounded" />
            <div className="h-4 w-16 bg-slate-800 rounded" />
            <div className="h-4 w-12 bg-slate-800 rounded" />
            <div className="h-4 w-32 bg-slate-800 rounded" />
            <div className="h-4 w-20 bg-slate-800 rounded" />
            <div className="h-6 w-16 bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonChart: React.FC = () => {
  return (
    <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-36 bg-slate-800 rounded" />
        <div className="h-3 w-20 bg-slate-800/60 rounded" />
      </div>
      <div className="h-48 bg-slate-800/30 rounded-lg flex items-end gap-3 p-4">
        <div className="h-32 w-full bg-slate-800/60 rounded-t" />
        <div className="h-44 w-full bg-slate-800/60 rounded-t" />
        <div className="h-24 w-full bg-slate-800/60 rounded-t" />
        <div className="h-36 w-full bg-slate-800/60 rounded-t" />
        <div className="h-28 w-full bg-slate-800/60 rounded-t" />
      </div>
    </div>
  );
};
