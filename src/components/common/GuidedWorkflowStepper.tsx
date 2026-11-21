import React, { useState } from 'react';
import {
  UploadCloud,
  Wand2,
  Layers,
  FileText,
  Check,
  ChevronRight,
  Search,
  HelpCircle,
  X,
} from 'lucide-react';
import { NavigationTab, usePlatform } from '../../store/usePlatformStore';
import { loadFeatureFlags } from '../../config/features';
import { PAGE_HEADER_CATALOG } from './PageHeader';

interface StepDefinition {
  id: 'upload' | 'clean' | 'analyze' | 'present';
  label: string;
  targetTab: NavigationTab;
  matchTabs: NavigationTab[];
  icon: React.ComponentType<{ className?: string }>;
  statusText: string;
  isComplete: boolean;
}

export interface GuidedWorkflowStepperProps {
  onOpenCommandPalette?: () => void;
}

/**
 * Guided 4-Stage Workflow Stepper: Upload -> Clean -> Analyze -> Present (Phase 3.3).
 * Tracks real dataset progress and lets analysts jump between stages, open the contextual "?" guide, or trigger Ctrl+K search.
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

  const flags = loadFeatureFlags();
  if (!flags.designSystemV3) return null;

  const hasData = cleanRows.length > 0 && columns.length > 0;
  const isCleanComplete =
    hasData && (qualityReport.overallScore >= 95 || transformations.length > 0);
  const isAnalyzeComplete = hasData && Boolean(activePackId);
  const pageSpec = PAGE_HEADER_CATALOG[currentTab] || PAGE_HEADER_CATALOG.executive_dashboard;

  const steps: StepDefinition[] = [
    {
      id: 'upload',
      label: '1. Upload',
      targetTab: 'upload',
      matchTabs: ['upload', 'live_connector', 'preview'],
      icon: UploadCloud,
      statusText: hasData ? `${cleanRows.length.toLocaleString()} rows` : 'Select source',
      isComplete: hasData,
    },
    {
      id: 'clean',
      label: '2. Clean',
      targetTab: 'cleaning',
      matchTabs: ['cleaning', 'quality', 'modeling', 'data_engineering', 'excel_automation'],
      icon: Wand2,
      statusText: hasData ? `${qualityReport.overallScore}% hygiene` : 'Audit & fix',
      isComplete: isCleanComplete,
    },
    {
      id: 'analyze',
      label: '3. Analyze',
      targetTab: flags.analyticsPacks ? 'analytics_packs' : 'analysis',
      matchTabs: ['analytics_packs', 'analysis', 'sql_lab', 'dax_lab', 'python_lab', 'ai_insights'],
      icon: Layers,
      statusText: hasData ? `Pack: ${activePackId.toUpperCase()}` : '14 domain packs',
      isComplete: isAnalyzeComplete,
    },
    {
      id: 'present',
      label: '4. Present',
      targetTab: 'reports',
      matchTabs: ['executive_dashboard', 'dashboard_builder', 'reports', 'export_center'],
      icon: FileText,
      statusText: hasData ? 'Deck & PDF ready' : 'Reports & exports',
      isComplete: hasData && currentTab === 'reports',
    },
  ];

  return (
    <div className="mb-4 space-y-2">
      <nav
        aria-label="Guided workflow stages"
        data-testid="guided-workflow-stepper"
        className="rounded-2xl border border-subtle bg-card px-2.5 sm:px-3 py-2 shadow-2xs flex items-center justify-between gap-1.5 sm:gap-2"
      >
        <ol className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
          {steps.map((step, idx) => {
            const isCurrent = step.matchTabs.includes(currentTab);
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <li className="min-w-0 shrink-0">
                  <button
                    type="button"
                    data-testid={`workflow-step-${step.id}`}
                    onClick={() => setCurrentTab(step.targetTab)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer border ${
                      isCurrent
                        ? 'bg-accent text-on-accent border-subtle font-bold shadow-2xs'
                        : step.isComplete
                        ? 'bg-input hover:bg-elevated text-primary border-subtle font-semibold'
                        : 'bg-transparent hover:bg-input text-secondary border-transparent font-medium'
                    }`}
                  >
                    <span
                      className={`hidden sm:flex w-4 h-4 rounded-full items-center justify-center text-xs font-mono shrink-0 ${
                        isCurrent
                          ? 'bg-card/20 text-on-accent font-bold'
                          : step.isComplete
                          ? 'bg-accent-soft text-accent font-bold'
                          : 'bg-elevated text-muted'
                      }`}
                    >
                      {step.isComplete && !isCurrent ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : (
                        <Icon className="w-2.5 h-2.5" />
                      )}
                    </span>
                    <span className="whitespace-nowrap">{step.label}</span>
                    <span
                      className={`hidden 2xl:inline text-xs font-mono truncate max-w-[105px] ${
                        isCurrent ? 'text-on-accent/90' : 'text-muted'
                      }`}
                    >
                      · {step.statusText}
                    </span>
                  </button>
                </li>

                {idx < steps.length - 1 && (
                  <li aria-hidden="true" className="text-muted hidden md:flex items-center shrink-0">
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
            onClick={() => setIsGuideOpen(prev => !prev)}
            className={`min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              isGuideOpen
                ? 'bg-accent-soft text-accent border-strong'
                : 'bg-input hover:bg-elevated text-secondary hover:text-primary border-subtle'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-accent" />
            <span className="hidden lg:inline">? Guide</span>
          </button>

          {onOpenCommandPalette && (
            <button
              type="button"
              data-testid="stepper-command-palette-trigger"
              onClick={onOpenCommandPalette}
              aria-label="Open Command Palette (Ctrl+K)"
              className="min-h-[36px] px-2 sm:px-2.5 py-1 rounded-xl bg-input hover:bg-elevated border border-subtle text-xs text-secondary hover:text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-accent" />
              <span className="hidden xl:inline">Quick Jump</span>
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
          className="rounded-2xl border border-subtle bg-card p-4 space-y-2.5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Quick Guide: {pageSpec.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              aria-label="Close quick guide"
              className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-input cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-secondary">{pageSpec.purpose}</p>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-secondary">
            {pageSpec.guideSteps.map((stepText, idx) => (
              <li
                key={idx}
                className="p-3 rounded-xl bg-input border border-subtle flex items-start gap-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-accent-soft text-accent font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-relaxed text-primary">{stepText}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

