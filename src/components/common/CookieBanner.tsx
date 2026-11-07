import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const consent = localStorage.getItem('dataanalytix_cookie_consent');
      if (!consent) {
        setShow(true);
      }
    }
  }, []);

  const accept = () => {
    localStorage.setItem('dataanalytix_cookie_consent', 'accepted');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-[#0F172A] border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col gap-3 text-xs text-slate-300 animate-fadeIn">
      <div className="flex items-center gap-2 text-cyan-400 font-semibold">
        <Shield className="w-4 h-4" />
        Privacy & Telemetry Consent
      </div>
      <p className="leading-relaxed text-slate-400">
        Data Analytix processes your datasets purely in your local browser sandbox and does not transmit raw records to third parties.
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={accept}
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
        >
          Acknowledge & Continue
        </button>
      </div>
    </div>
  );
};
