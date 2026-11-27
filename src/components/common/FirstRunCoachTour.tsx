import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Search, Download, X, ArrowRight, ArrowLeft, Check, Compass } from 'lucide-react';
import { loadFeatureFlags } from '../../config/features';

export const COACH_TOUR_STORAGE_KEY = 'dataanalytix_coach_tour_completed_v1';

interface CoachStep {
  stepNumber: number;
  title: string;
  description: string;
  mobileSummary: string;
  targetHint: string;
  targetSelector: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COACH_STEPS: CoachStep[] = [
  {
    stepNumber: 1,
    title: '1. Sidebar = The Workflow',
    description:
      'Every tool is organized into 5 collapsible stages matching the top stepper: 1 Upload, 2 Clean, 3 Analyze, 4 Present, and Help & Settings. Star any page to pin it at the top.',
    mobileSummary: '5 workflow stages match the top stepper; star any page to pin it.',
    targetHint: 'Left Sidebar & Top Stepper',
    targetSelector: '[data-testid="sidebar-workflow-groups"]',
    icon: Layers,
  },
  {
    stepNumber: 2,
    title: '2. Instant Search & Ctrl+K',
    description:
      'Filter pages by name or purpose using the search field at the top of the sidebar (press Enter to open the first match) or press Ctrl+K anywhere.',
    mobileSummary: 'Filter all 26 pages instantly or press Ctrl+K from anywhere.',
    targetHint: 'Sidebar Search / Ctrl+K',
    targetSelector: '[data-testid="sidebar-search-input"]',
    icon: Search,
  },
  {
    stepNumber: 3,
    title: '3. 1-Click Downloads & Decks',
    description:
      'Use the Download button in any page action bar to export editable 13-slide PowerPoint (.pptx) decks, Executive PDFs, multi-tab Excel workbooks, or Power BI projects.',
    mobileSummary: 'Export editable 13-slide PPTX decks, PDFs, Excel, or Power BI.',
    targetHint: 'Header Action Bar -> Download',
    targetSelector: '[data-testid="download-menu-trigger"]',
    icon: Download,
  },
];

interface DesktopPlacement {
  left: number;
  top: number;
  dockedInSidebarFooter: boolean;
  pointerSide: 'left' | 'bottom' | 'top' | 'none';
}

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
  pad = 4
): boolean {
  return !(
    a.right + pad <= b.left ||
    a.left - pad >= b.right ||
    a.bottom + pad <= b.top ||
    a.top - pad >= b.bottom
  );
}

/**
 * 3-Step First-Run Coach Mark Tour (Sidebar Groups -> Search / Ctrl+K -> Download).
 * - Desktop: Spotlights the real target and positions the card beside its target (or docked
 *   bottom-left over the sidebar footer if beside-target placement would cover the page
 *   header or first KPI card row). Never overlaps the dashboard header or KPI row.
 * - Mobile (375px): Renders as a compact bottom sheet (<= 110px) and sets
 *   `data-coach-tour-open="true"` on `<html>` so page bottom padding keeps the first KPI card
 *   (including its delta badge and source line) 100% visible above the sheet.
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
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [desktopPos, setDesktopPos] = useState<DesktopPlacement>({
    left: 8,
    top: 660,
    dockedInSidebarFooter: true,
    pointerSide: 'top',
  });

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

  const currentStep = COACH_STEPS[stepIdx] || COACH_STEPS[0];

  const computePlacementAndSpotlight = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    document.querySelectorAll('[data-coach-spotlight="true"]').forEach((el) => {
      el.removeAttribute('data-coach-spotlight');
    });

    const flags = loadFeatureFlags();
    if (!flags.designSystemV3 || !isOpen) {
      document.documentElement.removeAttribute('data-coach-tour-open');
      return;
    }

    document.documentElement.setAttribute('data-coach-tour-open', 'true');

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = vw < 768;
    setIsMobile(mobile);

    const candidates = Array.from(document.querySelectorAll(currentStep.targetSelector));
    const visibleTarget =
      candidates.find((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) || candidates[0];

    if (visibleTarget) {
      visibleTarget.setAttribute('data-coach-spotlight', 'true');
    }

    if (mobile) return;

    // Desktop placement calculation:
    // Measure forbidden content zones: page header panel, KPI cards row, and sidebar workflow items
    const CARD_W = 244;
    const CARD_H = 192;
    const targetRect = visibleTarget?.getBoundingClientRect();

    const forbiddenRects: { left: number; top: number; right: number; bottom: number }[] = [];
    document
      .querySelectorAll(
        '#main-content section.glass-panel-luminous, [data-testid^="page-header-"], [data-testid="vip-recognition-banner"], [data-testid="vip-control-bar"]'
      )
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          forbiddenRects.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
        }
      });
    document
      .querySelectorAll(
        '[data-testid^="exec-kpi-label-"], [data-testid^="exec-kpi-value-"], [data-testid^="exec-kpi-card-"], [data-testid^="pack-kpi-card-"], [data-testid^="vip-kpi-card-"], [data-testid="vip-hero-kpi-band"]'
      )
      .forEach((el) => {
        const card =
          el.closest('.depth-card, .glass-card, [data-testid^="pack-kpi-card-"], [data-testid^="vip-kpi-card-"]') || el;
        const r = card.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          forbiddenRects.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
        }
      });

    const minSafeTopBelowKpis =
      forbiddenRects.length > 0
        ? Math.max(...forbiddenRects.map((f) => Math.round(f.bottom + 12)))
        : 64;

    // Candidate 1: Directly beside target (right of sidebar), vertically aligned or below KPI row if needed
    if (targetRect && targetRect.width > 0) {
      const isSidebarTarget = targetRect.left < 260;
      const candidateLeft = isSidebarTarget
        ? Math.max(268, Math.round(targetRect.right + 12))
        : Math.max(268, Math.min(vw - CARD_W - 16, Math.round(targetRect.right - CARD_W)));

      // Try aligning directly to targetRect.top first
      let candidateTop = isSidebarTarget
        ? Math.max(64, Math.min(vh - CARD_H - 16, Math.round(targetRect.top)))
        : Math.max(64, Math.min(vh - CARD_H - 16, Math.round(targetRect.bottom + 10)));

      let candidateBox = {
        left: candidateLeft,
        top: candidateTop,
        right: candidateLeft + CARD_W,
        bottom: candidateTop + CARD_H,
      };

      let hitsForbidden = forbiddenRects.some((f) => rectsIntersect(candidateBox, f, 4));
      let hitsTarget = rectsIntersect(candidateBox, targetRect, 2);

      // If direct vertical alignment intersects header or KPI cards, shift down right below the KPI row
      // while staying strictly beside the sidebar (never covering the sidebar items!)
      if ((hitsForbidden || hitsTarget) && minSafeTopBelowKpis + CARD_H <= vh - 8) {
        candidateTop = Math.max(64, Math.min(vh - CARD_H - 12, minSafeTopBelowKpis));
        candidateBox = {
          left: candidateLeft,
          top: candidateTop,
          right: candidateLeft + CARD_W,
          bottom: candidateTop + CARD_H,
        };
        hitsForbidden = forbiddenRects.some((f) => rectsIntersect(candidateBox, f, 4));
        hitsTarget = rectsIntersect(candidateBox, targetRect, 2);
      }

      if (!hitsForbidden && !hitsTarget) {
        setDesktopPos({
          left: candidateLeft,
          top: candidateTop,
          dockedInSidebarFooter: false,
          pointerSide: isSidebarTarget ? 'left' : 'top',
        });
        return;
      }
    }

    // Fallback: place beside sidebar at bottom-left of main canvas (x = 268), never over sidebar items or KPI cards
    const safeLeft = 268;
    const safeTop = Math.max(64, vh - CARD_H - 12);
    setDesktopPos({
      left: safeLeft,
      top: safeTop,
      dockedInSidebarFooter: false,
      pointerSide: 'left',
    });
  }, [currentStep.targetSelector, isOpen]);

  useEffect(() => {
    computePlacementAndSpotlight();
    window.addEventListener('resize', computePlacementAndSpotlight);
    window.addEventListener('scroll', computePlacementAndSpotlight, true);

    let rafId: number | null = null;
    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(() => {
              rafId = null;
              computePlacementAndSpotlight();
            });
          })
        : null;
    if (observer && typeof document !== 'undefined' && document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', computePlacementAndSpotlight);
      window.removeEventListener('scroll', computePlacementAndSpotlight, true);
      if (typeof document !== 'undefined') {
        document.querySelectorAll('[data-coach-spotlight="true"]').forEach((el) => {
          el.removeAttribute('data-coach-spotlight');
        });
        document.documentElement.removeAttribute('data-coach-tour-open');
      }
    };
  }, [computePlacementAndSpotlight]);

  const flags = loadFeatureFlags();
  if (!flags.designSystemV3 || !isOpen) return null;

  const completeOrSkipTour = () => {
    setIsOpen(false);
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-coach-tour-open');
      document.querySelectorAll('[data-coach-spotlight="true"]').forEach((el) => {
        el.removeAttribute('data-coach-spotlight');
      });
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(COACH_TOUR_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
    }
  };

  const StepIcon = currentStep.icon;
  const isLastStep = stepIdx === COACH_STEPS.length - 1;

  if (isMobile) {
    // Compact mobile bottom sheet (max ~104px tall) so first KPI card + delta stay 100% visible above it
    return (
      <aside
        role="dialog"
        aria-modal="false"
        aria-label="Quick Start Coach Tour"
        data-testid="first-run-coach-tour"
        data-tour-step={currentStep.stepNumber}
        data-spotlight-selector={currentStep.targetSelector}
        className="fixed inset-x-0 bottom-0 z-40 w-full max-h-[104px] rounded-t-2xl border-t-2 border-accent bg-card text-primary px-3 py-2 shadow-2xl flex flex-col justify-between gap-1"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-5 h-5 rounded-md bg-accent text-on-accent flex items-center justify-center shrink-0">
              <StepIcon className="w-3 h-3" />
            </span>
            <h3
              data-testid="coach-tour-step-title"
              className="text-xs font-bold text-primary truncate"
            >
              {currentStep.title}
            </h3>
            <span
              data-testid="coach-tour-step-indicator"
              className="text-xs font-mono text-accent shrink-0"
            >
              ({currentStep.stepNumber}/{COACH_STEPS.length})
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid="coach-tour-skip"
              onClick={completeOrSkipTour}
              aria-label="Skip quick tour"
              className="px-2 py-0.5 rounded-lg bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-secondary hover:text-primary inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Skip</span>
              <X className="w-3 h-3" />
            </button>
            {!isLastStep ? (
              <button
                type="button"
                data-testid="coach-tour-next"
                onClick={() => setStepIdx((prev) => Math.min(COACH_STEPS.length - 1, prev + 1))}
                className="px-2.5 py-0.5 rounded-lg bg-accent text-on-accent text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="coach-tour-done"
                onClick={completeOrSkipTour}
                className="px-2.5 py-0.5 rounded-lg bg-accent text-on-accent text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Done</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-secondary truncate leading-tight">
          {currentStep.mobileSummary}
        </p>
      </aside>
    );
  }

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-label="Quick Start Coach Tour"
      data-testid="first-run-coach-tour"
      data-tour-step={currentStep.stepNumber}
      data-spotlight-selector={currentStep.targetSelector}
      data-docked-sidebar-footer={desktopPos.dockedInSidebarFooter ? 'true' : 'false'}
      style={{
        left: `${desktopPos.left}px`,
        top: `${desktopPos.top}px`,
        width: '244px',
      }}
      className="fixed z-40 rounded-2xl border border-strong bg-card text-primary p-3 shadow-2xl space-y-2"
    >
      {/* Desktop directional pointer indicator */}
      <span
        aria-hidden="true"
        data-testid="coach-tour-spotlight"
        className={
          desktopPos.pointerSide === 'left'
            ? 'block absolute -left-2 top-6 w-3.5 h-3.5 rotate-45 bg-card border-l border-b border-strong'
            : 'block absolute left-10 -top-2 w-3.5 h-3.5 rotate-45 bg-card border-l border-t border-strong'
        }
      />

      <div className="flex items-center justify-between gap-1.5">
        <div className="inline-flex items-center gap-1 text-xs font-mono font-bold text-accent">
          <Compass className="w-3.5 h-3.5 shrink-0" />
          <span data-testid="coach-tour-step-indicator">
            Quick Tour · Step {currentStep.stepNumber} of {COACH_STEPS.length}
          </span>
        </div>
        <button
          type="button"
          data-testid="coach-tour-skip"
          onClick={completeOrSkipTour}
          aria-label="Skip quick tour"
          className="px-2 py-0.5 rounded-lg bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-secondary hover:text-primary inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Skip</span>
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-xl bg-accent text-on-accent flex items-center justify-center shrink-0 mt-0.5">
          <StepIcon className="w-3.5 h-3.5" />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <h3
            data-testid="coach-tour-step-title"
            className="text-xs font-bold text-primary leading-snug"
          >
            {currentStep.title}
          </h3>
          <p className="text-xs text-secondary leading-snug line-clamp-3">
            {currentStep.description}
          </p>
          <div className="text-xs font-mono text-accent truncate" title={currentStep.targetHint}>
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
                idx === stepIdx ? 'w-4 bg-accent' : 'w-2 bg-input border border-subtle'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1">
          {stepIdx > 0 && (
            <button
              type="button"
              data-testid="coach-tour-prev"
              onClick={() => setStepIdx((prev) => Math.max(0, prev - 1))}
              className="px-2 py-1 rounded-lg bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-primary inline-flex items-center gap-1 cursor-pointer"
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
              className="px-2.5 py-1 rounded-lg bg-accent text-on-accent text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              data-testid="coach-tour-done"
              onClick={completeOrSkipTour}
              className="px-2.5 py-1 rounded-lg bg-accent text-on-accent text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
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

