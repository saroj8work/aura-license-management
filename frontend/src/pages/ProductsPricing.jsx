import React, { useState } from 'react';
import {
  Package,
  Check,
  X,
  CreditCard,
  Building2,
  UserCheck,
  ShieldCheck,
  Dna,
  Zap,
  Sparkles,
  Globe
} from 'lucide-react';
import { formatPrice } from '../utils/country';

export default function ProductsPricing({ products, countryCode }) {
  const featureMatrix = [
    { name: 'Target Customer', b2cMo: 'Individual Researcher', b2cYr: 'Private Clinician', b2bLab: 'Lab Team (10 seats)', b2bEnt: 'Enterprise CRO / Pharma' },
    { name: 'Seat Allocation', b2cMo: '1 User Seat', b2cYr: '1 User Seat', b2bLab: '10 Floating Seats', b2bEnt: '50-500 Floating Seats' },
    { name: 'Hardware Node Activations', b2cMo: '2 Devices', b2cYr: '2 Devices', b2bLab: '20 Instruments', b2bEnt: '150 Instruments' },
    { name: 'NGS Alignment & Variant Calling', b2cMo: true, b2cYr: true, b2bLab: true, b2bEnt: true },
    { name: 'Diagnostic Clinical PDF Reports', b2cMo: true, b2cYr: true, b2bLab: true, b2bEnt: true },
    { name: 'HL7 & FHIR EHR Integration', b2cMo: false, b2cYr: false, b2bLab: true, b2bEnt: true },
    { name: 'Automated Robotic Batch Pipeline', b2cMo: false, b2cYr: false, b2bLab: true, b2bEnt: true },
    { name: '21 CFR Part 11 Hash-Chained Audit', b2cMo: false, b2cYr: false, b2bLab: false, b2bEnt: true },
    { name: 'Air-Gapped Instrument .lic Tokens', b2cMo: false, b2cYr: false, b2bLab: false, b2bEnt: true },
    { name: 'Hardware Node-Locking (CPU/MB)', b2cMo: false, b2cYr: false, b2bLab: true, b2bEnt: true },
    { name: 'Vendor GxP Validation Package', b2cMo: false, b2cYr: false, b2bLab: false, b2bEnt: true },
  ];

  // Helper to extract localized formatted price
  const getPlanPrice = (planCode, defaultUsd) => {
    for (const prod of products) {
      const match = (prod.plans || []).find(p => p.code === planCode);
      if (match) {
        if (match.localized_pricing?.formatted) {
          return match.localized_pricing.formatted;
        }
        return formatPrice(match.price_cents / 100, countryCode);
      }
    }
    return formatPrice(defaultUsd, countryCode);
  };

  const b2cMoPrice = getPlanPrice('B2C-GENOMICS-PRO-MO', 149);
  const b2cYrPrice = getPlanPrice('B2C-GENOMICS-PRO-YR', 1490);
  const b2bLabPrice = getPlanPrice('B2B-LAB-STARTER', 950);
  const b2bEntPrice = getPlanPrice('B2B-ENTERPRISE-GXP', 4900);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-400 text-xs font-semibold">
          <Globe className="w-3.5 h-3.5" />
          <span>Localized Life Sciences Licensing ({countryCode})</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Transparent Licensing for Clinicians & Laboratories
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          From independent genomics researchers to global pharmaceutical lab networks.
          Every tier is cryptographically protected with Ed25519 digital signatures and priced in your regional currency.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* B2C Monthly */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-emerald-400 dark:hover:border-emerald-500/40 transition-all shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                B2C PRO
              </span>
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">Genomics Pro Monthly</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Single researcher or bioinformatics consultant.</p>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{b2cMoPrice}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">/ month</span>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>1 Clinician / Researcher Seat</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Up to 2 Workstation Activations</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>NGS Alignment & Variant Calling</span>
              </li>
              <li className="flex items-center space-x-2 text-slate-400">
                <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Air-Gapped Cleanroom Tokens</span>
              </li>
            </ul>
          </div>
          <div className="pt-6">
            <span className="block text-center text-xs font-semibold py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Credit Card Instant Checkout
            </span>
          </div>
        </div>

        {/* B2C Annual */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/40 flex flex-col justify-between relative shadow-md">
          <div className="absolute -top-2.5 right-4 text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full shadow">
            SAVE 17%
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                B2C ANNUAL
              </span>
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">Genomics Pro Annual</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Private clinical practice with continuous workflow.</p>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{b2cYrPrice}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">/ year</span>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>1 Clinician Seat (2 mos free)</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Up to 2 Workstation Activations</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Priority Compute Queue</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Clinical ACMG PDF Generator</span>
              </li>
            </ul>
          </div>
          <div className="pt-6">
            <span className="block text-center text-xs font-bold py-2 rounded-xl bg-emerald-600 text-white shadow-sm">
              Annual License Pack
            </span>
          </div>
        </div>

        {/* B2B Lab Starter */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-teal-400 dark:hover:border-teal-500/40 transition-all shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800">
                B2B LAB POOL
              </span>
              <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">Lab Team Standard</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hospital pathology lab or university core facility.</p>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{b2bLabPrice}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">/ month</span>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>10 Floating User Seats</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>20 Connected Lab Workstations</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>HL7 & FHIR EHR Integration</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Hardware Node-Locking Support</span>
              </li>
            </ul>
          </div>
          <div className="pt-6">
            <span className="block text-center text-xs font-semibold py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Net 30 Invoicing / PO
            </span>
          </div>
        </div>

        {/* B2B Enterprise GxP Suite */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-white to-teal-50/50 dark:from-slate-900 dark:to-teal-950/40 border border-teal-300 dark:border-teal-500/50 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-700 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                <span>ENTERPRISE GXP</span>
              </span>
              <Dna className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">Enterprise GxP Suite</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pharmaceutical CRO, diagnostic network, FDA audited.</p>
            <div className="mt-4">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{b2bEntPrice}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">/ month</span>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-800 dark:text-slate-200">
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>50+ Multi-Site Floating Seats</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>150+ Hardware Node Leases</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>21 CFR Part 11 Tamper-Evident Ledger</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Air-Gapped Cleanroom .lic Tokens</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>Full GxP Software Validation Docs</span>
              </li>
            </ul>
          </div>
          <div className="pt-6">
            <span className="block text-center text-xs font-bold py-2 rounded-xl bg-teal-600 text-white shadow-sm">
              Enterprise Master Agreement
            </span>
          </div>
        </div>
      </div>

      {/* Feature Matrix Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Life Sciences Entitlement & Capability Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare software capabilities and regulatory features across all B2C and B2B plans.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Capability / Feature</th>
                <th className="px-4 py-3 text-center">B2C Monthly</th>
                <th className="px-4 py-3 text-center">B2C Annual</th>
                <th className="px-4 py-3 text-center">B2B Lab Standard</th>
                <th className="px-4 py-3 text-center text-teal-700 dark:text-teal-400">B2B Enterprise GxP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {featureMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.name}</td>
                  {['b2cMo', 'b2cYr', 'b2bLab', 'b2bEnt'].map((colKey) => {
                    const val = row[colKey];
                    return (
                      <td key={colKey} className="px-4 py-3 text-center">
                        {typeof val === 'boolean' ? (
                          val ? (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                          )
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
