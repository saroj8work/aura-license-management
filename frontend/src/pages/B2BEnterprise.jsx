import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  FileText,
  PlusCircle,
  AlertCircle,
  KeyRound,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import { formatPrice } from '../utils/country';

export default function B2BEnterprise({ tenants, subscriptions, licenses, products, onRefresh, countryCode }) {
  const [showNewB2BModal, setShowNewB2BModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New B2B Form State
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [departmentTag, setDepartmentTag] = useState('');
  const [gxpStatus, setGxpStatus] = useState('VALIDATED');
  const [cliaNumber, setCliaNumber] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [customSeats, setCustomSeats] = useState(25);

  const b2bTenants = tenants.filter(t => t.account_type === 'B2B_ENTERPRISE');
  const b2bPlans = products.flatMap(p => p.plans || []).filter(plan => plan.target_audience === 'B2B');

  const handleCreateB2B = async (e) => {
    e.preventDefault();
    if (!orgName || !contactEmail || !selectedPlanId) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

      const tenant = await api.createTenant({
        name: orgName,
        slug,
        account_type: 'B2B_ENTERPRISE',
        contact_email: contactEmail,
        department_tag: departmentTag || 'Central Core Laboratory',
        gxp_validation_status: gxpStatus,
        metadata_json: { clia_id: cliaNumber }
      });

      await api.createSubscription({
        tenant_id: tenant.id,
        plan_id: selectedPlanId,
        billing_email: contactEmail,
        payment_method: 'PURCHASE_ORDER',
        purchase_order_number: poNumber || `PO-ENTERPRISE-${Date.now().toString().slice(-6)}`,
        custom_seats: Number(customSeats)
      });

      setShowNewB2BModal(false);
      setOrgName('');
      setContactEmail('');
      setDepartmentTag('');
      setPoNumber('');
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/50 border border-teal-200 dark:border-teal-500/20 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <span>B2B Enterprise Life Science Organizations</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Enterprise multi-seat floating license pools, departmental isolation, GxP vendor validation certificates, and purchase order billing.
          </p>
        </div>
        <button
          onClick={() => setShowNewB2BModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-xs transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Enterprise Org</span>
        </button>
      </div>

      {/* Enterprise Orgs Grid */}
      <div className="grid grid-cols-1 gap-6">
        {b2bTenants.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            No B2B enterprise organizations found. Click "New Enterprise Org" to create one.
          </div>
        ) : (
          b2bTenants.map((t) => {
            const tenantSubs = subscriptions.filter(s => s.tenant_id === t.id);
            const tenantLics = licenses.filter(l => l.tenant_id === t.id);
            const totalMaxSeats = tenantSubs.reduce((acc, s) => acc + (s.allocated_seats || 0), 0);
            const activeActivationsCount = tenantLics.reduce((acc, l) => acc + (l.current_activations || 0), 0);
            const maxAllowedActivations = tenantLics.reduce((acc, l) => acc + (l.max_activations || 0), 0);

            const utilizationPct = maxAllowedActivations > 0
              ? Math.min(100, Math.round((activeActivationsCount / maxAllowedActivations) * 100))
              : 0;

            return (
              <div key={t.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 hover:border-teal-400 dark:hover:border-teal-500/40 transition-all">
                {/* Org Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.name}</h2>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800/80 flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>GxP {t.gxp_validation_status}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      <span>{t.contact_email}</span>
                      <span>•</span>
                      <span>Dept: {t.department_tag || 'Enterprise Core'}</span>
                      {t.metadata_json?.facility_clia_id && (
                        <>
                          <span>•</span>
                          <span className="text-teal-700 dark:text-teal-400 font-semibold">CLIA: {t.metadata_json.facility_clia_id}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Floating Seats Allocated</div>
                      <div className="text-base font-bold text-slate-900 dark:text-white">{totalMaxSeats} Seats</div>
                    </div>
                  </div>
                </div>

                {/* License Pool Utilization Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>Concurrent Floating Pool Utilization</span>
                    </span>
                    <span className="text-teal-700 dark:text-teal-400 font-mono font-bold">
                      {activeActivationsCount} of {maxAllowedActivations} Devices Active ({utilizationPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, utilizationPct)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Subscriptions & Invoicing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Enterprise Contract & Invoicing</span>
                    </div>
                    {tenantSubs.map(s => {
                      const priceFormatted = s.plan?.localized_pricing?.formatted || formatPrice((s.plan?.price_cents || 490000) / 100, countryCode);
                      return (
                        <div key={s.id} className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Plan Tier:</span>
                            <span className="text-slate-900 dark:text-white font-semibold">{s.plan?.name || 'Enterprise Suite'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Purchase Order:</span>
                            <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold">{s.purchase_order_number || 'PO-NET30'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Billing Term:</span>
                            <span className="text-slate-800 dark:text-slate-300">Net 30 Invoicing ({priceFormatted}/mo)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Enterprise License Pools ({tenantLics.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {tenantLics.map(lic => (
                        <div key={lic.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div>
                            <span className="font-mono text-teal-800 dark:text-teal-300 text-[11px] font-semibold">{lic.license_key}</span>
                            <div className="text-[10px] text-slate-500">{lic.license_type} • {lic.allowed_features?.length || 0} features enabled</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 font-mono font-bold">
                            {lic.current_activations}/{lic.max_activations} Nodes
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Enterprise Organization Modal */}
      {showNewB2BModal && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Onboard Enterprise Life Science Organization</span>
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateB2B} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g., Memorial Sloan Therapeutics Lab"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="licensing@memorialsloan.org"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Department / Lab Tag</label>
                  <input
                    type="text"
                    placeholder="Molecular Diagnostic Core"
                    value={departmentTag}
                    onChange={(e) => setDepartmentTag(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">GxP Status</label>
                  <select
                    value={gxpStatus}
                    onChange={(e) => setGxpStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="VALIDATED">VALIDATED (GxP Ready)</option>
                    <option value="PENDING_AUDIT">PENDING AUDIT</option>
                    <option value="CLIA_EXEMPT">CLIA EXEMPT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">CLIA / FDA Registration</label>
                  <input
                    type="text"
                    placeholder="CLIA-33D190284"
                    value={cliaNumber}
                    onChange={(e) => setCliaNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Enterprise Plan ({countryCode})</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  >
                    <option value="">-- Choose Plan --</option>
                    {b2bPlans.map(p => {
                      const priceStr = p.localized_pricing?.formatted || formatPrice(p.price_cents / 100, countryCode);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({priceStr}/mo)
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Allocated Floating Seats</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={customSeats}
                    onChange={(e) => setCustomSeats(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Purchase Order (PO) Number</label>
                <input
                  type="text"
                  placeholder="PO-2026-MED-9941"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewB2BModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm"
                >
                  {loading ? 'Creating...' : 'Provision B2B Org'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
