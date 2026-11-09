import React from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Building2,
  KeyRound,
  Cpu,
  FileCheck2,
  Package,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, overview }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Executive Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'b2c',
      label: 'B2C Clinicians & Labs',
      icon: UserCheck,
      badge: overview?.b2c_tenants_count ? `${overview.b2c_tenants_count}` : null,
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
    },
    {
      id: 'b2b',
      label: 'B2B Enterprise Hub',
      icon: Building2,
      badge: overview?.b2b_tenants_count ? `${overview.b2b_tenants_count}` : null,
      badgeColor: 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800'
    },
    {
      id: 'licenses',
      label: 'License Authority',
      icon: KeyRound,
      badge: overview?.total_licenses_issued ? `${overview.total_licenses_issued}` : null,
      badgeColor: 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800'
    },
    {
      id: 'lab_simulator',
      label: 'Air-Gapped Instrument SDK',
      icon: Cpu,
      badge: 'SDK',
      badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
    },
    {
      id: 'audit',
      label: '21 CFR Part 11 Audit Trail',
      icon: FileCheck2,
      badge: overview?.audit_chain_healthy ? 'VALID' : 'BREACH',
      badgeColor: overview?.audit_chain_healthy
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700'
        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-700'
    },
    {
      id: 'products',
      label: 'Products & Pricing',
      icon: Package,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 h-[calc(100vh-61px)] sticky top-[61px] transition-colors duration-200">
      <div className="p-3.5 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Platform Governance
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-sm dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Enterprise System Info Footer (Replaces informal college tech stack info) */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">System Operational</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">v1.4.0</span>
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center space-x-1">
          <ShieldCheck className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>GxP & Part 11 Enforced</span>
        </div>
      </div>
    </aside>
  );
}
