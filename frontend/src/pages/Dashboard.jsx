import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Key,
  Laptop,
  ShieldCheck,
  ShieldAlert,
  Users,
  Copy,
  Check,
  PlusCircle,
  FileCode2,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { formatPrice } from '../utils/country';

export default function Dashboard({ overview, licenses, onNavigate, onRefresh, countryCode }) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [publicKey, setPublicKey] = useState(null);

  useEffect(() => {
    api.getPublicKey().then(setPublicKey).catch(console.error);
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const allActivations = licenses.flatMap(lic =>
    (lic.activations || []).map(act => ({
      ...act,
      licenseKey: lic.license_key,
      licenseType: lic.license_type,
      tenantId: lic.tenant_id
    }))
  );

  // Localized ARR display
  const arrFormatted = overview?.localized_arr?.formatted || formatPrice(overview?.arr_usd || 0, countryCode);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40 border border-teal-200 dark:border-teal-500/20 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Life Sciences License & Subscription Governance</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Governing B2C individual researchers and B2B enterprise pharmaceutical laboratory networks with
            FDA 21 CFR Part 11 compliant tamper-evident audit trails and Ed25519 air-gapped instrument verification.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => onNavigate('licenses')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-xs transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Issue License</span>
          </button>
          <button
            onClick={() => onNavigate('lab_simulator')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 border border-slate-300 dark:border-teal-500/30 text-xs font-semibold transition-all shadow-sm"
          >
            <FileCode2 className="w-4 h-4" />
            <span>Air-Gap Validator</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ARR Card (Localized) */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-400 dark:hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Annual Run Rate (ARR)</span>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {arrFormatted}
            </div>
            <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-medium">
              Localized for {countryCode} ({overview?.localized_arr?.currency_code || countryCode})
            </div>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-cyan-400 dark:hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Subscriptions</span>
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {overview?.active_subscriptions || 0}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="text-cyan-700 dark:text-cyan-400 font-semibold">{overview?.b2b_tenants_count || 0}</span> Enterprise /{' '}
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{overview?.b2c_tenants_count || 0}</span> Clinicians
            </div>
          </div>
        </div>

        {/* Licenses Issued */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-400 dark:hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Licenses</span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {overview?.total_licenses_issued || 0}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Ed25519 signed keypairs active
            </div>
          </div>
        </div>

        {/* Audit Integrity Status */}
        <div className={`p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm transition-all ${
          overview?.audit_chain_healthy
            ? 'border-emerald-200 dark:border-emerald-500/30'
            : 'border-red-300 dark:border-red-500/50'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">21 CFR Part 11 Integrity</span>
            <div className={`p-2 rounded-lg ${
              overview?.audit_chain_healthy
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/80 dark:text-red-400 dark:border-red-800'
            }`}>
              {overview?.audit_chain_healthy ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-base font-bold flex items-center space-x-1.5 ${
              overview?.audit_chain_healthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
            }`}>
              <span>{overview?.audit_chain_healthy ? 'VALID & UNTAMPERED' : 'BREACH DETECTED'}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {overview?.gxp_audit_entries_count || 0} SHA-256 chained records
            </div>
          </div>
        </div>
      </div>

      {/* Public Key Inspector */}
      {publicKey && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">Authority Ed25519 Public Key:</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                RFC 8032 Asymmetric
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-xl">
              {publicKey.public_key_b64}
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(publicKey.public_key_b64)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono shrink-0 transition-all border border-slate-300 dark:border-slate-700"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
          </button>
        </div>
      )}

      {/* Active Workstations & Instruments Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Laptop className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Connected Lab Instruments & Workstation Fleet ({allActivations.length})</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live heartbeat status and hardware node-locking allocations.
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 flex items-center space-x-1 font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync Fleet</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Device / Hostname</th>
                <th className="px-4 py-3">Hardware Node Fingerprint</th>
                <th className="px-4 py-3">OS / Runtime</th>
                <th className="px-4 py-3">Bound License</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Lease Expiration</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {allActivations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No active hardware activations found.
                  </td>
                </tr>
              ) : (
                allActivations.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{act.device_label || 'Workstation'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{act.hostname || 'Unknown host'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {act.machine_fingerprint.substring(0, 16)}...
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {act.platform_os || 'General OS'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/60 text-[11px]">
                        {act.licenseKey}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                      {act.ip_address || '127.0.0.1'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(act.lease_expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                        ONLINE / ACTIVE
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
