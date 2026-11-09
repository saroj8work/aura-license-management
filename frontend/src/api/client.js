import { getSelectedCountry } from '../utils/country';

const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const currentCountry = getSelectedCountry();

  const headers = {
    'Content-Type': 'application/json',
    'X-Country-Code': currentCountry,
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin'
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorMsg;
    } catch (e) {
      // fallback
    }
    throw new Error(errorMsg);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
}

export const api = {
  // Analytics
  getOverview: () => request('/analytics/overview'),

  // Tenants
  getTenants: (accountType) => request(`/tenants${accountType ? `?account_type=${accountType}` : ''}`),
  createTenant: (data) => request('/tenants', { method: 'POST', body: JSON.stringify(data) }),

  // Products & Plans
  getProducts: () => request('/products'),
  getCurrencies: () => request('/products/currencies'),

  // Subscriptions
  getSubscriptions: (tenantId) => request(`/subscriptions${tenantId ? `?tenant_id=${tenantId}` : ''}`),
  createSubscription: (data) => request('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  upgradeSubscription: (id, data) => request(`/subscriptions/${id}/upgrade`, { method: 'POST', body: JSON.stringify(data) }),
  cancelSubscription: (id, reason) => request(`/subscriptions/${id}/cancel?reason=${encodeURIComponent(reason || '')}`, { method: 'POST' }),

  // Licenses
  getLicenses: (tenantId) => request(`/licenses${tenantId ? `?tenant_id=${tenantId}` : ''}`),
  issueLicense: (data) => request('/licenses', { method: 'POST', body: JSON.stringify(data) }),
  activateLicense: (data) => request('/licenses/activate', { method: 'POST', body: JSON.stringify(data) }),
  heartbeatLicense: (data) => request('/licenses/heartbeat', { method: 'POST', body: JSON.stringify(data) }),
  deactivateLicense: (data) => request('/licenses/deactivate', { method: 'POST', body: JSON.stringify(data) }),
  revokeLicense: (id, data) => request(`/licenses/${id}/revoke`, { method: 'POST', body: JSON.stringify(data) }),
  getPublicKey: () => request('/licenses/public-key'),
  getAirgapFile: (id) => request(`/licenses/${id}/airgap-file`),
  offlineVerify: (data) => request('/licenses/offline-verify', { method: 'POST', body: JSON.stringify(data) }),

  // 21 CFR Part 11 Audit Trail
  getAuditLogs: (limit = 50, action = null) => request(`/audit/logs?limit=${limit}${action ? `&action=${action}` : ''}`),
  verifyAuditChain: () => request('/audit/verify-chain'),
  tamperAuditTest: () => request('/audit/tamper-test', { method: 'POST' }),
  repairAuditChain: () => request('/audit/repair-chain', { method: 'POST' })
};
