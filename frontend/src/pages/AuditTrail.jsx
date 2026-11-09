import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  Download,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../api/client';

export default function AuditTrail({ onRefresh }) {
  const [logs, setLogs] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const [logsData, verifyData] = await Promise.all([
        api.getAuditLogs(100, actionFilter || null),
        api.verifyAuditChain()
      ]);
      setLogs(logsData);
      setVerification(verifyData);
    } catch (err) {
      console.error('Audit fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [actionFilter]);

  const handleTamperTest = async () => {
    if (!confirm('DEMO / AUDIT TEST: This will simulate an unauthorized database modification to test the 21 CFR Part 11 SHA-256 tamper alarm. Proceed?')) {
      return;
    }
    try {
      setTampering(true);
      await api.tamperAuditTest();
      await fetchAuditData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Tamper test failed: ${err.message}`);
    } finally {
      setTampering(false);
    }
  };

  const handleRepairChain = async () => {
    try {
      setRepairing(true);
      await api.repairAuditChain();
      await fetchAuditData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Repair failed: ${err.message}`);
    } finally {
      setRepairing(false);
    }
  };

  const exportAuditReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FDA_21CFR_Part11_Audit_Trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actor_email.toLowerCase().includes(q) ||
      (log.reason_for_change || '').toLowerCase().includes(q) ||
      (log.entity_id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>21 CFR Part 11 & GxP Cryptographic Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Immutable, SHA-256 chained audit ledger. Guarantees deterministic time attribution, actor accountability, and tamper detection.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={exportAuditReport}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Export GxP Report</span>
          </button>
        </div>
      </div>

      {/* Integrity Verification Card & Tamper Demo Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Verification Status */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between col-span-2 shadow-sm ${
          verification?.is_valid
            ? 'bg-white dark:bg-slate-900/90 border-emerald-200 dark:border-emerald-500/30'
            : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                Merkle Hash-Chain Integrity Status
              </span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                Algorithm: SHA-256 Chained Genesis
              </span>
            </div>

            <div className="mt-3 flex items-center space-x-3">
              {verification?.is_valid ? (
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className={`text-lg font-bold ${verification?.is_valid ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {verification?.is_valid
                    ? 'CHAIN INTEGRITY: VERIFIED TAMPER-FREE'
                    : 'INTEGRITY BREACH DETECTED'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {verification?.is_valid
                    ? `Traversed ${verification?.total_records || 0} sequential records. Zero hash mismatches or deletions.`
                    : `${verification?.anomalies_detected?.length || 1} unauthorized record modifications detected in audit sequence!`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Verified at: {verification?.last_verified_at ? new Date(verification.last_verified_at).toLocaleTimeString() : 'Just now'}</span>
            <span className="font-mono text-teal-600 dark:text-teal-400">Genesis: 0000000000000000...</span>
          </div>
        </div>

        {/* Tamper / GxP Simulation Test Controls */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>GxP Auditor Test Controls</span>
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Demonstrate regulatory compliance defense. Simulate an unauthorized modification to verify the cryptographic chain trips immediately.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleTamperTest}
              disabled={tampering || repairing}
              className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-semibold transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{tampering ? 'Tampering...' : 'Simulate DB Tamper (Trip Alarm)'}</span>
            </button>
            <button
              onClick={handleRepairChain}
              disabled={repairing || tampering}
              className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-slate-300 dark:border-emerald-500/30 text-xs font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{repairing ? 'Re-Chaining...' : 'Repair & Re-Seal Ledger'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by actor, action, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Actions</option>
            <option value="LICENSE_ISSUED">LICENSE_ISSUED</option>
            <option value="LICENSE_ACTIVATED">LICENSE_ACTIVATED</option>
            <option value="LICENSE_REVOKED">LICENSE_REVOKED</option>
            <option value="SUBSCRIPTION_CREATED">SUBSCRIPTION_CREATED</option>
            <option value="TENANT_VALIDATED">TENANT_VALIDATED</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Sequence ID</th>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor Email</th>
                <th className="px-4 py-3">Regulatory Justification (Reason)</th>
                <th className="px-4 py-3">SHA-256 Hash Chaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No audit records match the query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                      #{log.id}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-semibold text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/60">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {log.actor_email}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {log.reason_for_change || <span className="text-slate-400 italic">Automated event</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] space-y-0.5">
                      <div className="text-slate-400 dark:text-slate-500 truncate max-w-xs">
                        prev: {log.previous_hash.substring(0, 16)}...
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-400 font-bold truncate max-w-xs">
                        curr: {log.hash.substring(0, 16)}...
                      </div>
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
