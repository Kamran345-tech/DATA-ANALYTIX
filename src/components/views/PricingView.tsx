import React, { useState } from 'react';
import { Check, Zap, Shield, Sparkles } from 'lucide-react';
import { getBrandText, loadFeatureFlags } from '../../config/features';

export interface PricingViewProps {
  onSelectPlan?: (planId: string) => void;
}

export const PricingView: React.FC<PricingViewProps> = () => {
  const flags = loadFeatureFlags();
  const brandName = getBrandText('primary', flags);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeCheckoutPlan, setActiveCheckoutPlan] = useState<string | null>(null);
  const [checkoutComplete, setCheckoutComplete] = useState<boolean>(false);

  const plans = [
    {
      id: 'free',
      name: 'Free Community',
      badge: 'Classic',
      priceMonthly: 0,
      priceAnnual: 0,
      description: 'Zero-cost browser data analyst sandbox for personal exploration and learning.',
      features: [
        'Up to 100,000 rows per in-browser dataset',
        'Local CSV & Excel file ingestion',
        'Deterministic data hygiene & cleaning',
        'Star schema modeling & ERD generator',
        'Community AlaSQL & Python sandbox',
        'Standard Excel & CSV downloads',
      ],
      ctaText: 'Current Active Tier',
      isPopular: false
    },
    {
      id: 'pro',
      name: 'Pro Analyst',
      badge: 'Most Popular',
      priceMonthly: 29,
      priceAnnual: 24,
      description: 'Dedicated analytics superpower for professional BI engineers and consultants.',
      features: [
        'Up to 2,000,000 rows per dataset',
        'Native Power BI PBIP enterprise bundle exports',
        'Multi-sheet formatted Excel financial models',
        'Grounded Gemini AI copilot analysis (1,000 queries/mo)',
        'Custom interactive dashboard composer & save',
        'Priority email & developer support',
      ],
      ctaText: 'Upgrade to Pro',
      isPopular: true
    },
    {
      id: 'team',
      name: 'Enterprise Team',
      badge: 'Full Governance',
      priceMonthly: 79,
      priceAnnual: 65,
      description: 'Multi-seat shared analytical workspaces with strict role-based data governance.',
      features: [
        'Unlimited rows & datasets (indexed Firestore sync)',
        'Multi-user shared workspaces (Owner / Editor / Viewer)',
        'Live REST & SQL database continuous ingestion',
        'Custom corporate branding & white-label PDF decks',
        'Audit logs, RBAC, and SOC-2 data isolation rules',
        'Dedicated SLA & custom analytical onboarding',
      ],
      ctaText: 'Start Team Trial',
      isPopular: false
    }
  ];

  const handleOpenCheckout = (planId: string) => {
    setActiveCheckoutPlan(planId);
    setCheckoutComplete(false);
  };

  const handleSimulatePayment = () => {
    setTimeout(() => {
      setCheckoutComplete(true);
    }, 800);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Zap className="w-3.5 h-3.5" />
          Transparent Enterprise Pricing
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Scale Your Analytics with {brandName}
        </h1>
        <p className="text-sm text-slate-400">
          Choose the plan that matches your data volume and governance requirements.
        </p>

        {/* Billing Switcher */}
        <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl mt-4">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              billingCycle === 'monthly' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Annual
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const price = billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly;

          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-7 flex flex-col justify-between transition-all relative ${
                p.isPopular
                  ? 'bg-gradient-to-b from-[#131E35] to-[#0F172A] border-cyan-500/50 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                  : 'bg-[#0F172A]/70 border-slate-800'
              }`}
            >
              {p.badge && (
                <div className="absolute -top-3 left-6">
                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      p.isPopular
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>
              )}

              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1 my-6">
                  <span className="text-4xl font-extrabold text-white">${price}</span>
                  <span className="text-xs text-slate-400">/ seat / month</span>
                </div>

                <ul className="space-y-3 mb-8 text-xs text-slate-300">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleOpenCheckout(p.id)}
                className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm ${
                  p.isPopular
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {p.ctaText}
              </button>
            </div>
          );
        })}
      </div>

      {/* Simulated Stripe Checkout Modal */}
      {activeCheckoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Secure Stripe Test Checkout</h3>
              </div>
              <button
                onClick={() => setActiveCheckoutPlan(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {checkoutComplete ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-lg">Subscription Activated!</h4>
                <p className="text-xs text-slate-400">
                  Your tenant has been granted higher row caps and unlocked export capabilities.
                </p>
                <button
                  onClick={() => setActiveCheckoutPlan(null)}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold mt-4"
                >
                  Return to Workspace
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Selected Plan:</span>
                  <span className="font-bold text-cyan-400 uppercase">{activeCheckoutPlan}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Cardholder Name</label>
                  <input
                    type="text"
                    defaultValue="Alex Mercer"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Card Number (Simulated)</label>
                  <input
                    type="text"
                    defaultValue="4242 •••• •••• 4242"
                    disabled
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveCheckoutPlan(null)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSimulatePayment}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Complete Test Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
