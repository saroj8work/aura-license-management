import React, { useState } from 'react';
import {
  UserCheck,
  CreditCard,
  KeyRound,
  Laptop,
  PlusCircle,
  Copy,
  Check,
  Download,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { formatPrice } from '../utils/country';

export default function B2CSubscriptions({ tenants, subscriptions, licenses, products, onRefresh, countryCode }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [showNewB2CModal, setShowNewB2CModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New B2C Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const b2cTenants = tenants.filter(t => t.account_type === 'B2C_INDIVIDUAL');
  const b2cPlans = products.flatMap(p => p.plans || []).filter(plan => plan.target_audience === 'B2C');

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateB2C = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !selectedPlanId) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-clinic';
      const tenant = await api.createTenant({
        name: fullName,
        slug,
        account_type: 'B2C_INDIVIDUAL',
        contact_email: email,
        department_tag: 'Independent Practice'
      });

      await api.createSubscription({
        tenant_id: tenant.id,
        plan_id: selectedPlanId,
        billing_email: email,
        payment_method: 'CREDIT_CARD'
      });

      setShowNewB2CModal(false);
      setFullName('');
      setEmail('');
      setSelectedPlanId('');
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (licenseKey, machineFp) => {
    try {
      await api.deactivateLicense({
        license_key: licenseKey,
        machine_fingerprint: machineFp,
        reason: 'Clinician removed device from self-service portal'
      });
      onRefresh();
    } catch (err) {
      alert(`Deactivation failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>B2C Clinicians & Independent Labs</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Single-seat self-service subscriptions with automated card billing, personal workstation licensing, and immediate key issuance.
          </p>
        </div>
        <button
          onClick={() => setShowNewB2CModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Subscriber</span>
        </button>
      </div>

      {/* B2C Subscribers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {b2cTenants.length === 0 ? (
          <div className="col-span-2 p-8 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            No B2C individual subscribers found. Click "New Subscriber" to onboard an individual clinician.
          </div>
        ) : (
          b2cTenants.map((t) => {
            const tenantSubs = subscriptions.filter(s => s.tenant_id === t.id);
            const tenantLics = licenses.filter(l => l.tenant_id === t.id);

            return (
              <div key={t.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                      B2C Single-Seat
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{t.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.contact_email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-500/30">
                      Active Customer
                    </span>
                  </div>
                </div>

                {/* Subscriptions Info */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Subscription Plan</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Card on File •••• 4242</span>
                  </div>
                  {tenantSubs.length === 0 ? (
                    <p className="text-xs text-slate-400">No active subscription found.</p>
                  ) : (
                    tenantSubs.map(sub => {
                      const priceFormatted = sub.plan?.localized_pricing?.formatted || formatPrice((sub.plan?.price_cents || 14900) / 100, countryCode);
                      return (
                        <div key={sub.id} className="flex items-center justify-between text-xs pt-1">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{sub.plan?.name || 'Genomics Pro Plan'}</span>
                            <span className="text-teal-700 dark:text-teal-400 ml-2 font-mono font-bold">
                              {priceFormatted} / {sub.plan?.billing_interval?.toLowerCase() || 'mo'}
                            </span>
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Renews {new Date(sub.current_period_end).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Personal Licenses & Activations */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Issued License Key</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Max {tenantLics[0]?.max_activations || 2} devices
                    </span>
                  </div>

                  {tenantLics.map(lic => (
                    <div key={lic.id} className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-teal-800 dark:text-teal-300 text-xs font-semibold bg-teal-50 dark:bg-teal-950/80 px-2.5 py-1 rounded border border-teal-200 dark:border-teal-800/80">
                          {lic.license_key}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => copyKey(lic.license_key)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs border border-slate-300 dark:border-slate-700 shadow-sm"
                            title="Copy License Key"
                          >
                            {copiedKey === lic.license_key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={`/api/v1/licenses/${lic.id}/airgap-file`}
                            download
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs border border-slate-300 dark:border-slate-700 shadow-sm"
                            title="Download .lic airgap file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Device Activations */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 pt-1">
                        <div className="font-medium text-slate-700 dark:text-slate-300">Activated Workstations:</div>
                        {(!lic.activations || lic.activations.length === 0) ? (
                          <div className="text-slate-400 italic">No devices activated yet.</div>
                        ) : (
                          lic.activations.map(act => (
                            <div key={act.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                              <div className="flex items-center space-x-2">
                                <Laptop className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white">{act.device_label || act.hostname}</div>
                                  <div className="font-mono text-[10px] text-slate-400">{act.platform_os || 'OS'} • {act.ip_address}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeactivate(lic.license_key, act.machine_fingerprint)}
                                className="text-[10px] text-red-600 dark:text-red-400 hover:underline px-2 py-1 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 font-medium"
                              >
                                Release Device
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New B2C Subscriber Modal */}
      {showNewB2CModal && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Onboard New B2C Clinician / Researcher</span>
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateB2C} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Subscriber Full Name / Practice</label>
                <input
                  type="text"
                  placeholder="e.g., Dr. Robert Miles, MD"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Contact & Billing Email</label>
                <input
                  type="email"
                  placeholder="robert.miles@pathology.clinic"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Select Subscription Plan ({countryCode})</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Plan --</option>
                  {b2cPlans.map(plan => {
                    const priceStr = plan.localized_pricing?.formatted || formatPrice(plan.price_cents / 100, countryCode);
                    return (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({priceStr}/{plan.billing_interval?.toLowerCase()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewB2CModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                >
                  {loading ? 'Provisioning...' : 'Provision Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
