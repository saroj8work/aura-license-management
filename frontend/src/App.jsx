import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import B2CSubscriptions from './pages/B2CSubscriptions';
import B2BEnterprise from './pages/B2BEnterprise';
import LicenseManager from './pages/LicenseManager';
import LabSimulator from './pages/LabSimulator';
import AuditTrail from './pages/AuditTrail';
import ProductsPricing from './pages/ProductsPricing';
import { api } from './api/client';
import { getInitialTheme, applyTheme } from './utils/theme';
import { getSelectedCountry, setSelectedCountry } from './utils/country';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTenant, setCurrentTenant] = useState(null);

  // Theme State: Default is LIGHT
  const [theme, setTheme] = useState(() => {
    const t = getInitialTheme();
    applyTheme(t);
    return t;
  });

  // Country / Currency State
  const [countryCode, setCountryCode] = useState(() => getSelectedCountry());

  // Core Data States
  const [overview, setOverview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [error, setError] = useState(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const handleCountryChange = (newCode) => {
    setSelectedCountry(newCode);
    setCountryCode(newCode);
    fetchAllData();
  };

  const fetchAllData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const [overviewData, tenantsData, productsData, subsData, licsData] = await Promise.all([
        api.getOverview(),
        api.getTenants(),
        api.getProducts(),
        api.getSubscriptions(currentTenant ? currentTenant.id : null),
        api.getLicenses(currentTenant ? currentTenant.id : null)
      ]);

      setOverview(overviewData);
      setTenants(tenantsData);
      setProducts(productsData);
      setSubscriptions(subsData);
      setLicenses(licsData);
    } catch (err) {
      console.error('Error fetching platform data:', err);
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentTenant]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Navbar */}
      <Navbar
        onRefresh={fetchAllData}
        isRefreshing={isRefreshing}
        currentTenant={currentTenant}
        tenants={tenants}
        onSelectTenant={setCurrentTenant}
        theme={theme}
        onToggleTheme={toggleTheme}
        countryCode={countryCode}
        onChangeCountry={handleCountryChange}
      />

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          overview={overview}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
              <div>
                <strong>Service Communication Error:</strong> {error}
                <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                  Verify backend gateway connectivity on http://127.0.0.1:8090.
                </div>
              </div>
              <button
                onClick={fetchAllData}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              overview={overview}
              licenses={licenses}
              onNavigate={setActiveTab}
              onRefresh={fetchAllData}
              countryCode={countryCode}
            />
          )}

          {activeTab === 'b2c' && (
            <B2CSubscriptions
              tenants={tenants}
              subscriptions={subscriptions}
              licenses={licenses}
              products={products}
              onRefresh={fetchAllData}
              countryCode={countryCode}
            />
          )}

          {activeTab === 'b2b' && (
            <B2BEnterprise
              tenants={tenants}
              subscriptions={subscriptions}
              licenses={licenses}
              products={products}
              onRefresh={fetchAllData}
              countryCode={countryCode}
            />
          )}

          {activeTab === 'licenses' && (
            <LicenseManager
              licenses={licenses}
              tenants={tenants}
              products={products}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'lab_simulator' && (
            <LabSimulator
              licenses={licenses}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTrail
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'products' && (
            <ProductsPricing
              products={products}
              countryCode={countryCode}
            />
          )}
        </main>
      </div>
    </div>
  );
}
