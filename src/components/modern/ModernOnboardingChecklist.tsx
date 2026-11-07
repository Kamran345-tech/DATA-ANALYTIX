import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, X, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

interface OnboardingState {
  hasLoadedData: boolean;
  hasCheckedQuality: boolean;
  hasBuiltDashboard: boolean;
  hasExported: boolean;
  dismissed: boolean;
}

const STORAGE_KEY = 'dataanalytix_onboarding';

export const ModernOnboardingChecklist: React.FC = () => {
  const { currentTab, cleanRows, setCurrentTab } = usePlatform();

  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      hasLoadedData: false,
      hasCheckedQuality: false,
      hasBuiltDashboard: false,
      hasExported: false,
      dismissed: false
    };
  });

  const [isMinimized, setIsMinimized] = useState(false);

  // Auto-advance checklist based on user activity
  useEffect(() => {
    let updated = false;
    const next = { ...state };

    if (!next.hasLoadedData && cleanRows && cleanRows.length > 0) {
      next.hasLoadedData = true;
      updated = true;
    }
    if (!next.hasCheckedQuality && (currentTab === 'quality' || currentTab === 'cleaning')) {
      next.hasCheckedQuality = true;
      updated = true;
    }
    if (!next.hasBuiltDashboard && (currentTab === 'executive_dashboard' || currentTab === 'dashboard_builder')) {
      next.hasBuiltDashboard = true;
      updated = true;
    }
    if (!next.hasExported && currentTab === 'export_center') {
      next.hasExported = true;
      updated = true;
    }

    if (updated) {
      setState(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, [cleanRows, currentTab, state]);

  const handleDismiss = () => {
    const next = { ...state, dismissed: true };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  if (state.dismissed) return null;

  const completedCount = [
    state.hasLoadedData,
    state.hasCheckedQuality,
    state.hasBuiltDashboard,
    state.hasExported
  ].filter(Boolean).length;

  const progressPercent = Math.round((completedCount / 4) * 100);

  return (
    <div className="fixed bottom-14 md:bottom-4 right-2 sm:right-4 z-30 max-w-[280px] sm:max-w-xs w-full bg-[var(--modern-bg-surface)] border border-[var(--modern-border)] rounded-2xl shadow-xl p-3 sm:p-4 modern-slide-up text-xs select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--modern-border)]">
        <div className="flex items-center gap-2">
          {/* Progress Ring Indicator */}
          <div className="w-5 h-5 rounded-full border-2 border-[var(--modern-border)] border-t-[var(--modern-primary)] flex items-center justify-center font-bold text-[9px] text-[var(--modern-primary)] font-mono">
            {completedCount}
          </div>
          <span className="font-bold text-[var(--modern-text)]">Getting Started ({progressPercent}%)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]"
            aria-label={isMinimized ? 'Expand checklist' : 'Minimize checklist'}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]"
            aria-label="Dismiss checklist"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-2 pt-1">
          <button
            onClick={() => setCurrentTab('upload')}
            className="w-full flex items-center gap-2.5 text-left text-[var(--modern-text)] hover:text-[var(--modern-primary)] transition-colors"
          >
            {state.hasLoadedData ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-[var(--modern-text-muted)] shrink-0" />
            )}
            <span className={state.hasLoadedData ? 'line-through text-[var(--modern-text-muted)]' : 'font-medium'}>
              1. Ingest flat spreadsheet or demo
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('quality')}
            className="w-full flex items-center gap-2.5 text-left text-[var(--modern-text)] hover:text-[var(--modern-primary)] transition-colors"
          >
            {state.hasCheckedQuality ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-[var(--modern-text-muted)] shrink-0" />
            )}
            <span className={state.hasCheckedQuality ? 'line-through text-[var(--modern-text-muted)]' : 'font-medium'}>
              2. Audit health & resolve messy keys
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('executive_dashboard')}
            className="w-full flex items-center gap-2.5 text-left text-[var(--modern-text)] hover:text-[var(--modern-primary)] transition-colors"
          >
            {state.hasBuiltDashboard ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-[var(--modern-text-muted)] shrink-0" />
            )}
            <span className={state.hasBuiltDashboard ? 'line-through text-[var(--modern-text-muted)]' : 'font-medium'}>
              3. Explore Executive Dashboard
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('export_center')}
            className="w-full flex items-center gap-2.5 text-left text-[var(--modern-text)] hover:text-[var(--modern-primary)] transition-colors"
          >
            {state.hasExported ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-[var(--modern-text-muted)] shrink-0" />
            )}
            <span className={state.hasExported ? 'line-through text-[var(--modern-text-muted)]' : 'font-medium'}>
              4. Export Power BI bundle / Excel
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
