import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Wand2,
  Layers,
  FileText,
  HelpCircle,
  Check,
  ChevronRight,
  Search,
  X,
  Compass,
} from 'lucide-react';
import { NavigationTab, usePlatform } from '../../store/usePlatformStore';
import { loadFeatureFlags } from '../../config/features';
import { PAGE_HEADER_CATALOG } from './PageHeader';
import {
  WORKFLOW_SIDEBAR_GROUPS,
  findWorkflowGroupForTab,
  WorkflowGroupId,
} from '../../config/navigationConfig';

export interface GuidedWorkflowStepperProps {
  onOpenCommandPalette?: () => void;
}

const GROUP_ICONS: Record<WorkflowGroupId, React.ComponentType<{ className?: string }>> = {
  upload: UploadCloud,
  clean: Wand2,
  analyze: Layers,
  present: FileText,
  help_settings: HelpCircle,
};

/**
 * Slim Top Workflow Stepper matching the Sidebar Groups:
 * 1 Upload -> 2 Clean -> 3 Analyze -> 4 Present -> Help & Settings.
 * Highlights the active page's group, auto-scrolls the active step into view on mobile,
 * and expands/focuses that group in the sidebar on click.
 */
export const GuidedWorkflowStepper: React.FC<GuidedWorkflowStepperProps> = ({
  onOpenCommandPalette,
}) => {
  const {
    currentTab,
    setCurrentTab,
    cleanRows,
    columns,
    qualityReport,
    transformations,
    activePackId,
  } = usePlatform();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const olRef = useRef<HTMLOListElement>(null);

  const flags = loadFeatureFlags();
  const activeGroup = findWorkflowGroupForTab(currentTab);

  // Auto-scroll the active workflow step into view on mobile (375/414px)
  useEffect(() => {
    const ol = olRef.current;
    if (!ol) return;
    if (ol.scrollWidth <= ol.clientWidth) {
      ol.scrollLeft = 0;
      return;
    }
    const activeBtn = ol.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeBtn) return;
    const targetLeft = Math.max(
      0,
      activeBtn.offsetLeft - ol.clientWidth / 2 + activeBtn.clientWidth / 2
    );
    ol.scrollLeft = targetLeft;
  }, [currentTab, activeGroup.id]);

  if (!flags.designSystemV3) return null;

  if (flags.premiumUX) {
    const isUploadOrCleanFlow = [
      'upload',
      'live_connector',
      'preview',
      'quality',
      'cleaning',
      'data_dictionary',
    ].includes(currentTab);
    if (!isUploadOrCleanFlow) {
      return null;
    }
  }

  const hasData = cleanRows.length > 0 && columns.length > 0;
  const isCleanComplete =
    hasData && (qualityReport.overallScore >= 95 || transformations.length > 0);
  const isAnalyzeComplete = hasData && Boolean(activePackId);
  const pageSpec =
    PAGE_HEADER_CATALOG[currentTab] || PAGE_HEADER_CATALOG.executive_dashboard;

  const getStepCompletion = (groupId: WorkflowGroupId): boolean => {
    switch (groupId) {
      case 'upload':
        return hasData;
      case 'clean':
        return isCleanComplete;
      case 'analyze':
        return isAnalyzeComplete;
      case 'present':
        return hasData && activeGroup.id === 'present';
      case 'help_settings':
        return false;
    }
  };

  const getTargetTab = (groupId: WorkflowGroupId, defaultTab: NavigationTab): NavigationTab => {
    if (groupId === 'analyze' && !flags.analyticsPacks) {
      return 'analysis';
    }
    return defaultTab;
  };

  const handleStepClick = (groupId: WorkflowGroupId, defaultTab: NavigationTab) => {
    window.dispatchEvent(
      new CustomEvent('dataanalytix:focus-sidebar-group', {
        detail: { groupId },
      })
    );
    const target = getTargetTab(groupId, defaultTab);
    setCurrentTab(target);
  };

  const numericStepIndex =
    activeGroup.stageNum === '1' ||
    activeGroup.stageNum === '2' ||
    activeGroup.stageNum === '3' ||
    activeGroup.stageNum === '4'
      ? activeGroup.stageNum
      : '4';

  return (
    <div className="mb-2 space-y-1.5">
      <nav
        aria-label="Guided workflow stages"
        data-testid="guided-workflow-stepper"
        className="rounded-xl border border-subtle bg-card px-2 sm:px-2.5 py-1 shadow-2xs flex flex-nowrap items-center justify-between gap-1.5"
      >
        <span
          data-testid="stepper-mobile-step-counter"
          className="sm:hidden shrink-0 px-1.5 py-0.5 rounded-md bg-accent-soft text-accent font-mono text-xs font-bold"
        >
          {numericStepIndex}/4
        </span>

        <ol
          ref={olRef}
          className="relative flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar"
        >
          {WORKFLOW_SIDEBAR_GROUPS.map((group, idx) => {
            const isCurrent = activeGroup.id === group.id;
            const isComplete = getStepCompletion(group.id);
            const Icon = GROUP_ICONS[group.id] || Layers;

            return (
              <React.Fragment key={group.id}>
                <li className="min-w-0 shrink-0">
                  <button
                    type="button"
                    data-testid={`workflow-step-${group.id}`}
                    data-active={isCurrent ? 'true' : 'false'}
                    onClick={() => handleStepClick(group.id, group.defaultTab)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`min-h-[30px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer border ${
                      isCurrent
                        ? 'bg-accent text-on-accent border-subtle font-bold shadow-2xs'
                        : isComplete
                        ? 'bg-input hover:bg-elevated text-primary border-subtle font-semibold'
                        : 'bg-transparent hover:bg-input text-secondary border-transparent font-medium'
                    }`}
                  >
                    <span
                      className={`hidden sm:flex w-4 h-4 rounded-full items-center justify-center text-xs font-mono shrink-0 ${
                        isCurrent
                          ? 'bg-card/20 text-on-accent font-bold'
                          : isComplete
                          ? 'bg-accent-soft text-accent font-bold'
                          : 'bg-elevated text-muted'
                      }`}
                    >
                      {isComplete && !isCurrent ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : (
                        <Icon className="w-2.5 h-2.5" />
                      )}
                    </span>
                    <span className="whitespace-nowrap">{group.stepperLabel}</span>
                  </button>
                </li>

                {idx < WORKFLOW_SIDEBAR_GROUPS.length - 1 && (
                  <li
                    aria-hidden="true"
                    className="text-muted hidden md:flex items-center shrink-0"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </li>
                )}
              </React.Fragment>
            );
          })}
        </ol>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="stepper-page-guide-trigger"
            aria-expanded={isGuideOpen}
            aria-label={`How to use ${pageSpec.title}`}
            title={`Quick guide for ${pageSpec.title}`}
            onClick={() => setIsGuideOpen((prev) => !prev)}
            className={`min-h-[30px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
              isGuideOpen
                ? 'bg-accent text-on-accent border-subtle font-bold'
                : 'bg-input hover:bg-elevated text-secondary hover:text-primary border-subtle'
            }`}
          >
            <HelpCircle
              className={`w-3.5 h-3.5 ${isGuideOpen ? 'text-on-accent' : 'text-accent'}`}
            />
            <span className="hidden lg:inline">? Guide</span>
          </button>

          {onOpenCommandPalette && !flags.premiumUX && (
            <button
              type="button"
              data-testid="stepper-command-palette-trigger"
              onClick={onOpenCommandPalette}
              aria-label="Open Command Palette (Ctrl+K)"
              className="min-h-[30px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-input hover:bg-elevated border border-subtle text-xs text-secondary hover:text-primary inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-accent" />
              <span className="hidden xl:inline">Search</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-card border border-subtle font-mono text-xs text-muted">
                Ctrl+K
              </kbd>
            </button>
          )}
        </div>
      </nav>

      {isGuideOpen && (
        <div
          data-testid="stepper-page-guide-panel"
          role="region"
          aria-label={`Quick guide for ${pageSpec.title}`}
          className="rounded-xl border border-subtle bg-card p-3.5 space-y-2.5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Quick Guide: {pageSpec.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="stepper-replay-tour-btn"
                onClick={() => {
                  setIsGuideOpen(false);
                  window.dispatchEvent(new CustomEvent('dataanalytix:start-coach-tour'));
                }}
                className="px-2.5 py-1 rounded-lg bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-primary inline-flex items-center gap-1 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-accent" />
                <span>Replay 3-Step Tour</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                aria-label="Close quick guide"
                className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-input cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-secondary">{pageSpec.purpose}</p>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-secondary">
            {pageSpec.guideSteps.map((stepText, idx) => (
              <li
                key={idx}
                className="p-2.5 rounded-lg bg-input border border-subtle flex items-start gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-accent-soft text-accent font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-snug text-primary">{stepText}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
