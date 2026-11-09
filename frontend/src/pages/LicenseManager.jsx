import React, { useState } from 'react';
import {
  KeyRound,
  PlusCircle,
  Copy,
  Check,
  Download,
  AlertOctagon,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';

export default function LicenseManager({ licenses, tenants, products, onRefresh }) {
  const [filterType, setFilterType] = useState('ALL');
  const [copiedKey, setCopiedKey] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedLicenseForRevoke, setSelectedLicenseForRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [expandedLicId, setExpandedLicId] = useState(null);
  const [loading, setLoading] = useState(false);

  // New License Form State
  const [tenantId, setTenantId] = useState('');
  const [productId, setProductId] = useState('');
  const [licenseType, setLicenseType] = useState('FLOATING_POOL');
  const [maxActivations, setMaxActivations] = useState(10);
  const [expiryDays, setExpiryDays] = useState(365);
  const [isPerpetual, setIsPerpetual] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState([
    'ngs_alignment',
    'variant_calling',
    'gxp_part11_audit_trail'
  ]);
  const [issueReason, setIssueReason] = useState('Standard laboratory instrument commissioning');

  const availableFeatures = [
    { id: 'ngs_alignment', label: 'NGS Sequence Alignment Engine' },
    { id: 'variant_calling', label: 'Clinical ACMG Variant Calling' },
    { id: 'pdf_report_export', label: 'Diagnostic PDF Clinical Reports' },
    { id: 'hl7_fhir_export', label: 'HL7 / FHIR EHR Interoperability' },
    { id: 'batch_processing', label: 'Automated Robotic Batch Pipeline' },
    { id: 'gxp_part11_audit_trail', label: '21 CFR Part 11 Cryptographic Audit' },
    { id: 'airgap_instrument_support', label: 'Air-Gapped Offline Instrument Lease' },
    { id: 'hardware_node_locking', label: 'Strict Hardware CPU/Motherboard Lock' }
  ];

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleFeature = (id) => {
    if (selectedFeatures.includes(id)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== id));
    } else {
      setSelectedFeatures([...selectedFeatures, id]);
    }
  };

  const handleIssueLicense = async (e) => {
    e.preventDefault();
    if (!tenantId || !productId) {
      alert('Please select both an Account and a Product.');
      return;
    }

    try {
      setLoading(true);
      let expDate = null;
      if (!isPerpetual && expiryDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + Number(expiryDays));
        expDate = d.toISOString();
      }

      await api.issueLicense({
        tenant_id: tenantId,
        product_id: productId,
        license_type: licenseType,
        max_activations: Number(maxActivations),
        allowed_features: selectedFeatures,
        expires_at: expDate,
        reason_for_change: issueReason
      });

      setShowIssueModal(false);
      onRefresh();
    } catch (err) {
      alert(`License issuance failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokeReason || revokeReason.length < 5) {
      alert('21 CFR Part 11 requires a descriptive reason for change (minimum 5 characters).');
      return;
    }

    try {
      setLoading(true);
      await api.revokeLicense(selectedLicenseForRevoke.id, {
        reason_for_change: revokeReason
      });
      setShowRevokeModal(false);
      setSelectedLicenseForRevoke(null);
      setRevokeReason('');
      onRefresh();
    } catch (err) {
      alert(`Revocation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredLicenses = licenses.filter(lic => {
    if (filterType === 'ALL') return true;
    return lic.license_type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-cyan-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40 border border-cyan-200 dark:border-cyan-500/20 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>Cryptographic License Authority</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Minting Asymmetric Ed25519-signed licenses for single-seat B2C, floating enterprise pools, and air-gapped lab instruments.
          </p>
        </div>
        <button
          onClick={() => setShowIssueModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Mint New License</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {['ALL', 'SINGLE_SEAT', 'FLOATING_POOL', 'NODE_LOCKED', 'AIR_GAPPED'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === type
                ? 'bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-700/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Licenses Table */}
      <div className="space-y-4">
        {filteredLicenses.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            No licenses match the selected criteria.
          </div>
        ) : (
          filteredLicenses.map(lic => {
            const tenant = tenants.find(t => t.id === lic.tenant_id);
            const isExpanded = expandedLicId === lic.id;
            const isRevoked = lic.status === 'REVOKED';

            return (
              <div
                key={lic.id}
                className={`rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
                  isRevoked
                    ? 'border-red-200 dark:border-red-900/40 opacity-75'
                    : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500/30'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-200 dark:border-cyan-800/60">
                        {lic.license_key}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        lic.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
                      }`}>
                        {lic.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                        {lic.license_type}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
                      <span>Account: <strong className="text-slate-900 dark:text-white">{tenant?.name || 'Unknown'}</strong></span>
                      <span>•</span>
                      <span>Activations: <strong className="text-cyan-700 dark:text-cyan-400">{lic.current_activations} / {lic.max_activations}</strong></span>
                      <span>•</span>
                      <span>Expires: <strong className="text-slate-700 dark:text-slate-300">{lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : 'Perpetual (Offline)'}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => copyKey(lic.license_key)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs border border-slate-300 dark:border-slate-700"
                      title="Copy License Key"
                    >
                      {copiedKey === lic.license_key ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={`/api/v1/licenses/${lic.id}/airgap-file`}
                      download
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 text-xs font-semibold border border-slate-300 dark:border-teal-500/30"
                      title="Download Air-Gapped .lic Token"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.lic Token</span>
                    </a>
                    {!isRevoked && (
                      <button
                        onClick={() => {
                          setSelectedLicenseForRevoke(lic);
                          setShowRevokeModal(true);
                        }}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-900/60"
                        title="Revoke License (21 CFR Part 11 Required Justification)"
                      >
                        <AlertOctagon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedLicId(isExpanded ? null : lic.id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs border border-slate-300 dark:border-slate-700"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/50 rounded-b-2xl space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Entitled Features:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(lic.allowed_features || []).map(f => (
                            <span key={f} className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80 font-mono">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Ed25519 Digital Signature:</span>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono break-all p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                          {lic.signature}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                        Active Node Activations ({lic.activations?.length || 0}):
                      </span>
                      {(!lic.activations || lic.activations.length === 0) ? (
                        <p className="text-xs text-slate-400 italic">No devices currently bound.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {lic.activations.map(act => (
                            <div key={act.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shadow-sm">
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">{act.device_label || act.hostname}</div>
                                <div className="text-[10px] font-mono text-slate-400">{act.machine_fingerprint.substring(0, 16)}...</div>
                              </div>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                                Lease: {new Date(act.lease_expires_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Mint License Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>Mint Cryptographic License</span>
            </h3>

            <form onSubmit={handleIssueLicense} className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Target Account</label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                >
                  <option value="">-- Choose Account --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.account_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Product Suite</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">License Type</label>
                  <select
                    value={licenseType}
                    onChange={(e) => setLicenseType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="FLOATING_POOL">FLOATING POOL (B2B Lab)</option>
                    <option value="SINGLE_SEAT">SINGLE SEAT (B2C User)</option>
                    <option value="NODE_LOCKED">NODE LOCKED (Hardware Bound)</option>
                    <option value="AIR_GAPPED">AIR GAPPED (Offline Cleanroom)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Max Node Activations</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={maxActivations}
                    onChange={(e) => setMaxActivations(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1.5">Entitled Feature Flags</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  {availableFeatures.map(f => (
                    <label key={f.id} className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFeatures.includes(f.id)}
                        onChange={() => toggleFeature(f.id)}
                        className="rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-cyan-600"
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                  21 CFR Part 11 Regulatory Justification (Reason for Change)
                </label>
                <input
                  type="text"
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs shadow-sm"
                >
                  {loading ? 'Minting...' : 'Mint & Sign License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revocation Modal */}
      {showRevokeModal && selectedLicenseForRevoke && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span>21 CFR Part 11 Regulatory Revocation</span>
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You are revoking license <strong className="font-mono text-cyan-700 dark:text-cyan-300">{selectedLicenseForRevoke.license_key}</strong>.
            </p>

            <form onSubmit={handleRevoke} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                  Mandatory Electronic Justification (GxP Audit Trail)
                </label>
                <textarea
                  rows="3"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Contract terminated by CRO; instruments decommissioned per SOP-881."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevokeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm"
                >
                  {loading ? 'Recording...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
