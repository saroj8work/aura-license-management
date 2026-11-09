import React from 'react';
import { ShieldCheck, Dna, RefreshCw, Sun, Moon, Globe } from 'lucide-react';
import { SUPPORTED_COUNTRIES } from '../utils/country';

export default function Navbar({
  onRefresh,
  isRefreshing,
  currentTenant,
  tenants,
  onSelectTenant,
  theme,
  onToggleTheme,
  countryCode,
  onChangeCountry
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between shadow-sm transition-colors duration-200">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-700/20">
          <Dna className="w-5 h-5 text-white font-bold" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Aura</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 font-semibold tracking-wide">
              LIFE SCIENCES
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">License & Subscription Platform</p>
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center space-x-3">
        {/* Compliance Status Pill */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-500/30 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-500"></span>
          </span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          <span className="text-emerald-800 dark:text-slate-300 font-medium text-[11px]">21 CFR Part 11 Certified</span>
        </div>

        {/* Tenant Filter Selector */}
        <div className="flex items-center space-x-1.5">
          <select
            value={currentTenant ? currentTenant.id : 'ALL'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'ALL') onSelectTenant(null);
              else onSelectTenant(tenants.find(t => t.id === val));
            }}
            className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">🌐 All Accounts</option>
            <optgroup label="B2B Enterprise Organizations">
              {tenants.filter(t => t.account_type === 'B2B_ENTERPRISE').map(t => (
                <option key={t.id} value={t.id}>🏢 {t.name}</option>
              ))}
            </optgroup>
            <optgroup label="B2C Clinicians / Labs">
              {tenants.filter(t => t.account_type === 'B2C_INDIVIDUAL').map(t => (
                <option key={t.id} value={t.id}>👤 {t.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Country & Currency Selector with Cookie Persistence */}
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1">
          <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <select
            value={countryCode}
            onChange={(e) => onChangeCountry(e.target.value)}
            className="text-xs bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            title="Country / Localized Billing Currency"
          >
            {SUPPORTED_COUNTRIES.map(c => (
              <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {c.flag} {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Theme Toggle Button (Default Light, Option Dark) */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-300 dark:border-slate-700"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Data"
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-300 dark:border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-600 dark:text-teal-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}
