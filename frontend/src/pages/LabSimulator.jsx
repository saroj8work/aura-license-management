import React, { useState } from 'react';
import {
  Cpu,
  Wifi,
  WifiOff,
  Play,
  Heart,
  PowerOff,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  FileCode2,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';

export default function LabSimulator({ licenses, onRefresh }) {
  const [activeTab, setActiveTab] = useState('online');

  // ONLINE SIMULATOR STATE
  const [selectedKey, setSelectedKey] = useState(licenses[0]?.license_key || '');
  const [hostname, setHostname] = useState('LAB-SEQUENCER-WORKSTATION-01');
  const [deviceLabel, setDeviceLabel] = useState('Illumina HighSeq Instrument #1');
  const [platformOs, setPlatformOs] = useState('Ubuntu 22.04 LTS (Real-Time GxP Kernel)');
  const [machineFp, setMachineFp] = useState('fp_' + Math.random().toString(36).substring(2, 12));
  const [onlineResult, setOnlineResult] = useState(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState(null);

  // AIR-GAPPED OFFLINE SIMULATOR STATE
  const [sampleBundleJson, setSampleBundleJson] = useState('');
  const [offlineResult, setOfflineResult] = useState(null);
  const [offlineLoading, setOfflineLoading] = useState(false);

  const handleGenerateMachineFp = () => {
    setMachineFp('fp_' + Math.random().toString(36).substring(2, 12));
  };

  const handleActivate = async () => {
    try {
      setOnlineLoading(true);
      setOnlineError(null);
      const res = await api.activateLicense({
        license_key: selectedKey,
        machine_fingerprint: machineFp,
        hostname,
        platform_os: platformOs,
        device_label: deviceLabel
      });
      setOnlineResult(res);
      onRefresh();
    } catch (err) {
      setOnlineError(err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleHeartbeat = async () => {
    try {
      setOnlineLoading(true);
      setOnlineError(null);
      const res = await api.heartbeatLicense({
        license_key: selectedKey,
        machine_fingerprint: machineFp
      });
      setOnlineResult(prev => ({ ...prev, ...res, heartbeatAcknowledged: true }));
      onRefresh();
    } catch (err) {
      setOnlineError(err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setOnlineLoading(true);
      setOnlineError(null);
      const res = await api.deactivateLicense({
        license_key: selectedKey,
        machine_fingerprint: machineFp,
        reason: 'Instrument decommissioned by simulator operator'
      });
      setOnlineResult(res);
      onRefresh();
    } catch (err) {
      setOnlineError(err.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const loadActiveLicenseForAirgap = async (licId) => {
    try {
      const fileData = await api.getAirgapFile(licId);
      setSampleBundleJson(typeof fileData === 'string' ? fileData : JSON.stringify(fileData, null, 2));
    } catch (err) {
      alert(`Could not load bundle: ${err.message}`);
    }
  };

  const handleOfflineVerify = async () => {
    try {
      setOfflineLoading(true);
      const parsed = JSON.parse(sampleBundleJson);
      const res = await api.offlineVerify({ license_file_json: parsed });
      setOfflineResult(res);
    } catch (err) {
      setOfflineResult({
        is_cryptographically_authentic: false,
        is_signature_valid: false,
        error: `JSON parsing or verification failed: ${err.message}`
      });
    } finally {
      setOfflineLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40 border border-amber-200 dark:border-amber-500/20 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Air-Gapped Instrument & Client SDK Sandbox</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Simulate laboratory device activations, lease heartbeats, and zero-network air-gapped cryptographic Ed25519 token verification.
          </p>
        </div>

        <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('online')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'online'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Online Heartbeat Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'offline'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Air-Gapped Offline Verifier</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ONLINE SIMULATOR */}
      {activeTab === 'online' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Lab Instrument Client Configuration</span>
            </h2>

            {onlineError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                ⚠️ {onlineError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Target License Key</label>
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-teal-800 dark:text-teal-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {licenses.map(lic => (
                    <option key={lic.id} value={lic.license_key}>
                      {lic.license_key} ({lic.license_type} • {lic.current_activations}/{lic.max_activations} active)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-600 dark:text-slate-400">Machine Hardware Fingerprint</label>
                  <button
                    onClick={handleGenerateMachineFp}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Node ID</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={machineFp}
                  onChange={(e) => setMachineFp(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Hostname</label>
                  <input
                    type="text"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Instrument Label</label>
                  <input
                    type="text"
                    value={deviceLabel}
                    onChange={(e) => setDeviceLabel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Operating System & Runtime</label>
                <input
                  type="text"
                  value={platformOs}
                  onChange={(e) => setPlatformOs(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={handleActivate}
                  disabled={onlineLoading}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Activate Node</span>
                </button>
                <button
                  onClick={handleHeartbeat}
                  disabled={onlineLoading}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-800 dark:text-teal-400 text-xs font-semibold border border-slate-300 dark:border-teal-500/30"
                >
                  <Heart className="w-3.5 h-3.5 text-red-500" />
                  <span>Send Heartbeat</span>
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={onlineLoading}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-900/60"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>Deactivate Node</span>
                </button>
              </div>
            </div>
          </div>

          {/* Console Output */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">SDK Telemetry Response:</span>
                <span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">POST /api/v1/licenses/*</span>
              </div>
              {onlineResult ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-slate-800 dark:text-slate-300 shadow-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">{onlineResult.status}</span>
                    </div>
                    {onlineResult.license_key && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">License:</span>
                        <span className="text-teal-700 dark:text-teal-300 font-semibold">{onlineResult.license_key}</span>
                      </div>
                    )}
                    {onlineResult.lease_expires_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lease Valid Until:</span>
                        <span className="text-amber-700 dark:text-amber-300">{new Date(onlineResult.lease_expires_at).toLocaleString()}</span>
                      </div>
                    )}
                    {onlineResult.allowed_features && (
                      <div>
                        <span className="text-slate-500 block mb-1">Entitled Features:</span>
                        <div className="flex flex-wrap gap-1">
                          {onlineResult.allowed_features.map(f => (
                            <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {onlineResult.token && (
                    <div>
                      <span className="text-slate-500 block text-[11px] mb-1">Signed Lease Token (Ed25519):</span>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 break-all p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        {onlineResult.token}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs font-mono">
                  &gt; Waiting for instrument command. Click "Activate Node" to test client handshake.
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-200 dark:border-slate-800/80">
              Simulates real-time lab devices maintaining active lease validation via periodic heartbeat pings.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AIR-GAPPED OFFLINE VERIFIER */}
      {activeTab === 'offline' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileCode2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Air-Gapped .lic Token Payload</span>
              </h2>
              {licenses.length > 0 && (
                <button
                  onClick={() => loadActiveLicenseForAirgap(licenses[0].id)}
                  className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                >
                  Load Sample Bundle
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              In isolated cleanrooms or hospital intranets, instruments cannot connect to cloud servers.
              The client embeds our Ed25519 public key and mathematically verifies this signed JSON bundle offline.
            </p>

            <textarea
              rows="12"
              value={sampleBundleJson}
              onChange={(e) => setSampleBundleJson(e.target.value)}
              placeholder="Paste .lic JSON content here or click 'Load Sample Bundle' above..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-teal-800 dark:text-teal-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            <button
              onClick={handleOfflineVerify}
              disabled={offlineLoading || !sampleBundleJson}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all shadow-sm"
            >
              {offlineLoading ? 'Verifying Asymmetric Signature...' : 'Run Mathematical Verification (Zero Network)'}
            </button>
          </div>

          {/* Verification Results */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">Offline Cryptographic Verification Output:</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">Ed25519 Local Check</span>
              </div>

              {offlineResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
                    offlineResult.is_cryptographically_authentic
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/80 text-emerald-800 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
                  }`}>
                    {offlineResult.is_cryptographically_authentic ? (
                      <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-sm">
                        {offlineResult.is_cryptographically_authentic
                          ? 'SIGNATURE VALID & AUTHENTIC'
                          : 'VERIFICATION FAILED / TAMPERED'}
                      </div>
                      <div className="text-xs opacity-90 mt-0.5">
                        {offlineResult.is_cryptographically_authentic
                          ? 'License claims confirmed authentic by Ed25519 public key. Safe to execute clinical software.'
                          : (offlineResult.error || 'The digital signature does not match the claims payload. Potential tampering detected!')}
                      </div>
                    </div>
                  </div>

                  {offlineResult.is_cryptographically_authentic && (
                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 font-mono shadow-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Verified License:</span>
                        <span className="text-teal-800 dark:text-teal-300 font-bold">{offlineResult.license_key}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account:</span>
                        <span className="text-slate-900 dark:text-white font-medium">{offlineResult.tenant_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Expired:</span>
                        <span className={offlineResult.has_expired ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                          {offlineResult.has_expired ? 'YES' : 'NO (Valid)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Authorized Features:</span>
                        <div className="flex flex-wrap gap-1">
                          {(offlineResult.allowed_features || []).map(f => (
                            <span key={f} className="text-[10px] px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs font-mono">
                  &gt; Load a .lic bundle and click "Run Mathematical Verification" to inspect cryptographic authenticity.
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
              💡 <strong>GxP Tip:</strong> Try modifying any character in the JSON payload (like changing a feature name or expiration date) before clicking Verify to see the cryptographic defense trigger immediately.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
