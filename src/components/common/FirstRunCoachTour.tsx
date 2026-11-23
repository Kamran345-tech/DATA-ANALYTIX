import React, { useState, useEffect } from 'react';
import { Layers, Search, Download, X, ArrowRight, ArrowLeft, Check, Compass } from 'lucide-react';
import { loadFeatureFlags } from '../../config/features';

export const COACH_TOUR_STORAGE_KEY = 'dataanalytix_coach_tour_completed_v1';

interface CoachStep {
  stepNumber: number;
  title: string;
  description: string;
  targetHint: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COACH_STEPS: CoachStep[] = [
  {
    stepNumber: 1,
    title: '1. Sidebar = The Workflow',
    description:
      'Every tool is organized into 5 collapsible stages matching the top stepper: 1 Upload, 2 Clean, 3 Analyze, 4 Present, and Help & Settings. Star any page to pin it at the top.',
    targetHint: 'Left Sidebar & Top Stepper',
    icon: Layers,
  },
  {
    stepNumber: 2,
    title: '2. Instant Search & Ctrl+K',
    description:
      'Filter pages by name or purpose using the search field at the top of the sidebar (press Enter to open the first match) or press Ctrl+K anywhere.',
    targetHint: 'Sidebar Search / Ctrl+K',
    icon: Search,
  },
  {
    stepNumber: 3,
    title: '3. 1-Click Downloads & Decks',
    description:
      'Use the Download button in any page action bar to export editable 13-slide PowerPoint (.pptx) decks, Executive PDFs, multi-tab Excel workbooks, or Power BI projects.',
    targetHint: 'Header Action Bar -> Download',
    icon: Download,
  },
];

/**
 * 3-Step First-Run Coach Mark Tour (Sidebar Groups -> Search / Ctrl+K -> Download).
 * Shown once on first visit, skippable anytime, and replayable from Help & Guide.
 */
export const FirstRunCoachTour: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      return window.localStorage.getItem(COACH_TOUR_STORAGE_KEY) !== 'true';
    } catch {
      return false;
    }
  });
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const handleStartTour = () => {
      try {
        window.localStorage.removeItem(COACH_TOUR_STORAGE_KEY);
      } catch {
        // ignore
      }
      setStepIdx(0);
      setIsOpen(true);
    };
    window.addEventListener('dataanalytix:start-coach-tour', handleStartTour);
    return () => {
      window.removeEventListener('dataanalytix:start-coach-tour', handleStartTour);
    };
  }, []);

  const flags = loadFeatureFlags();
  if (!flags.designSystemV3 || !isOpen) return null;

  const completeOrSkipTour = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(COACH_TOUR_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
    }
  };

  const currentStep = COACH_STEPS[stepIdx] || COACH_STEPS[0];
  const StepIcon = currentStep.icon;
  const isLastStep = stepIdx === COACH_STEPS.length - 1;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-label="Quick Start Coach Tour"
      data-testid="first-run-coach-tour"
      data-tour-step={currentStep.stepNumber}
      className="fixed bottom-20 md:bottom-4 left-3 sm:left-4 z-40 w-[330px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-strong bg-card text-primary p-3.5 shadow-2xl space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent">
          <Compass className="w-3.5 h-3.5" />
          <span data-testid="coach-tour-step-indicator">
            Quick Tour · Step {currentStep.stepNumber} of {COACH_STEPS.length}
          </span>
        </div>
        <button
          type="button"
          data-testid="coach-tour-skip"
          onClick={completeOrSkipTour}
          aria-label="Skip quick tour"
          className="px-2 py-0.5 rounded-lg bg-input hover:bg-elevated border border-subtle text-[11px] font-semibold text-secondary hover:text-primary inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Skip</span>
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-accent text-on-accent flex items-center justify-center shrink-0 mt-0.5">
          <StepIcon className="w-4 h-4" />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <h3
            data-testid="coach-tour-step-title"
            className="text-xs sm:text-sm font-bold text-primary leading-snug"
          >
            {currentStep.title}
          </h3>
          <p className="text-xs text-secondary leading-relaxed">
            {currentStep.description}
          </p>
          <div className="text-[11px] font-mono text-accent pt-0.5">
            Target: {currentStep.targetHint}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-subtle">
        <div className="flex items-center gap-1">
          {COACH_STEPS.map((s, idx) => (
            <button
              key={s.stepNumber}
              type="button"
              onClick={() => setStepIdx(idx)}
              aria-label={`Go to tour step ${s.stepNumber}`}
              className={`h-1.5 rounded-full cursor-pointer ${
                idx === stepIdx ? 'w-5 bg-accent' : 'w-2 bg-input border border-subtle'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {stepIdx > 0 && (
            <button
              type="button"
              data-testid="coach-tour-prev"
              onClick={() => setStepIdx((prev) => Math.max(0, prev - 1))}
              className="px-2.5 py-1 rounded-lg bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-primary inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          )}

          {!isLastStep ? (
            <button
              type="button"
              data-testid="coach-tour-next"
              onClick={() => setStepIdx((prev) => Math.min(COACH_STEPS.length - 1, prev + 1))}
              className="px-3 py-1 rounded-lg bg-accent text-on-accent text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              data-testid="coach-tour-done"
              onClick={completeOrSkipTour}
              className="px-3 py-1 rounded-lg bg-accent text-on-accent text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
