import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Wand2,
  Info,
  HelpCircle,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { DownloadMenu } from '../common/DownloadMenu';
import {
  QUALITY_SCORE_FORMULA_TEXT,
  computeQualityGrade,
  computeQualityStatusLabel,
  dismissQualityIssue,
  evaluateDataQuality,
  getDismissedQualityIssues,
  restoreDismissedQualityIssues,
} from '../../engine/dataQuality';
import { toast } from '../../store/useToast';

export const DataQualityView: React.FC = () => {
  const {
    columns,
    cleanRows,
    setCurrentTab,
    themeMode,
    addTransformation,
  } = usePlatform();
  const isLight = themeMode === 'light';
  const [showFormulaPopover, setShowFormulaPopover] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
    getDismissedQualityIssues()
  );

  // Compute live unified quality report from shared engine
  const liveQualityReport = useMemo(
    () => evaluateDataQuality(columns, cleanRows, dismissedIds),
    [columns, cleanRows, dismissedIds]
  );

  const grade =
    liveQualityReport.grade ||
    computeQualityGrade(
      liveQualityReport.overallScore,
      liveQualityReport.issues.length
    );

  const statusLabel =
    liveQualityReport.statusLabel ||
    computeQualityStatusLabel(
      liveQualityReport.overallScore,
      liveQualityReport.issues.length
    );

  const handleKeepAsIs = (issueId: string, colName: string) => {
    const updated = dismissQualityIssue(issueId);
    setDismissedIds(new Set(updated));
    toast.info(
      'Finding Acknowledged ("Keep as is")',
      `Dismissed quality finding on [${colName}]. Overall quality score updated.`
    );
  };

  const handleRestoreDismissed = () => {
    restoreDismissedQualityIssues();
    setDismissedIds(new Set());
    toast.info('Restored Dismissed Findings', 'All acknowledged findings are visible again.');
  };

  const handleQuickFixInAuditor = (
    issue: DataQualityReportIssueItem
  ) => {
    if (issue.suggestedActionType) {
      addTransformation({
        action: issue.suggestedActionType,
        column: issue.column === 'All Columns' ? undefined : issue.column,
        parameters: issue.actionParameters || {},
        description: `Fixed [${issue.column}]: ${issue.recommendedAction}`,
      });
      toast.success(
        'Issue Fixed Immediately',
        `Applied "${issue.suggestedActionType.replace(/_/g, ' ')}" on [${issue.column}].`
      );
    } else {
      setCurrentTab('cleaning');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight leading-tight flex items-center gap-2.5 text-primary">
            <ShieldCheck className="w-7 h-7 text-accent shrink-0" />
            <span>Data Quality &amp; Hygiene Auditor</span>
          </h1>
          <p
            className={`text-xs font-mono mt-1 min-w-0 max-w-full ${
              isLight ? 'text-muted' : 'text-secondary'
            }`}
          >
            Unified completeness, uniqueness, validity & consistency diagnostics •{' '}
            <strong data-testid="auditor-status-label" className="text-primary">
              {statusLabel}
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {dismissedIds.size > 0 && (
            <button
              type="button"
              onClick={handleRestoreDismissed}
              data-testid="restore-dismissed-issues-btn"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-card-hover text-secondary hover:text-primary border border-subtle text-xs font-semibold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore {dismissedIds.size} Kept Finding(s)</span>
            </button>
          )}
          <button
            onClick={() => setCurrentTab('cleaning')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-primary font-semibold text-xs transition-all shadow-lg shadow-sky-600/20 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Go to Data Cleaning Studio</span>
          </button>
          <DownloadMenu context="quality" />
        </div>
      </div>

      {/* Main Score & Sub-metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Overall Score Card */}
        <div
          className={`lg:col-span-1 rounded-2xl p-6 flex flex-col items-center justify-center text-center border relative overflow-hidden ${
            isLight
              ? 'bg-gradient-to-b from-sky-50/70 to-white border-sky-200 shadow-sm'
              : 'bg-card border-cyan-500/30'
          }`}
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className={`text-[11px] font-mono uppercase tracking-widest ${
                isLight ? 'text-muted font-semibold' : 'text-secondary'
              }`}
            >
              Overall Quality Index
            </span>
            <button
              type="button"
              data-testid="why-quality-score-btn"
              onClick={() => setShowFormulaPopover((prev) => !prev)}
              aria-label="Why this score?"
              title="Why this score?"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-elevated hover:bg-card-hover text-accent border border-subtle text-[10px] font-mono font-semibold cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Why this score?</span>
            </button>
          </div>

          <div
            data-testid="quality-overall-score"
            className={`text-5xl font-heading font-extrabold my-2 ${
              isLight ? 'text-primary' : 'text-primary'
            }`}
          >
            {liveQualityReport.overallScore}%
          </div>

          <span
            data-testid="quality-grade-badge"
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
              grade === 'A+'
                ? isLight
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-emerald-500/20 text-[var(--success)] border border-emerald-500/30'
                : liveQualityReport.overallScore >= 85
                ? isLight
                  ? 'bg-sky-100 text-sky-900 border border-sky-300'
                  : 'bg-sky-500/20 text-[var(--info)] border border-sky-500/30'
                : isLight
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-amber-500/20 text-[var(--warning)] border border-amber-500/30'
            }`}
          >
            Grade {grade} • {statusLabel}
          </span>

          {showFormulaPopover && (
            <div
              data-testid="quality-score-formula-popover"
              className="mt-3 p-3 rounded-xl bg-elevated border border-subtle text-left text-[11px] text-secondary font-mono leading-relaxed"
            >
              <div className="font-bold text-primary mb-1">
                Weighted Quality Formula:
              </div>
              <p>{QUALITY_SCORE_FORMULA_TEXT}</p>
            </div>
          )}
        </div>

        {/* 4 Pillars */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Completeness (40%)',
              score: liveQualityReport.completenessScore,
              desc: 'Non-null record coverage across all attributes',
              color: 'cyan',
            },
            {
              label: 'Uniqueness (30%)',
              score: liveQualityReport.uniquenessScore,
              desc: 'Freedom from duplicate record rows',
              color: 'indigo',
            },
            {
              label: 'Validity (20%)',
              score: liveQualityReport.validityScore,
              desc: 'Adherence to 1.5x IQR / 99th-pct statistical bounds',
              color: 'emerald',
            },
            {
              label: 'Consistency (10%)',
              score: liveQualityReport.consistencyScore,
              desc: 'Uniform casing, whitespace & format representation',
              color: 'purple',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-card rounded-2xl p-5 flex flex-col justify-between border border-subtle shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono uppercase ${
                      isLight ? 'text-muted font-semibold' : 'text-secondary'
                    }`}
                  >
                    {item.label}
                  </span>
                  <Info
                    className={`w-3.5 h-3.5 ${
                      isLight ? 'text-muted' : 'text-muted'
                    }`}
                  />
                </div>
                <div
                  className={`text-3xl font-heading font-bold mt-2 ${
                    isLight ? 'text-primary' : 'text-primary'
                  }`}
                >
                  {item.score}%
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div
                  className={`w-full h-1.5 rounded-full overflow-hidden ${
                    isLight ? 'bg-input' : 'bg-elevated'
                  }`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <p
                  className={`text-[11px] leading-tight ${
                    isLight ? 'text-muted' : 'text-muted'
                  }`}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Issues Detected Table */}
      <div className="bg-card rounded-2xl p-5 border border-subtle space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <h2
            className={`font-heading text-lg font-bold tracking-wide uppercase flex items-center gap-2 ${
              isLight ? 'text-primary' : 'text-primary'
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
            <span>
              DETECTED ANOMALIES & HYGIENE ISSUES (
              {liveQualityReport.issues.length})
            </span>
          </h2>
        </div>

        {liveQualityReport.issues.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[var(--success)] mx-auto" />
            <div
              className={`text-sm font-semibold ${
                isLight ? 'text-primary' : 'text-primary'
              }`}
            >
              Zero Data Quality Issues Found
            </div>
            <p
              className={`text-xs ${
                isLight ? 'text-muted' : 'text-secondary'
              }`}
            >
              All columns satisfy completeness, uniqueness, 1.5x IQR validity,
              and consistency checks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {liveQualityReport.issues.map((issue) => (
              <div
                key={issue.id}
                data-testid={`auditor-issue-${issue.id}`}
                className="p-4 rounded-xl border border-subtle bg-elevated hover:border-strong transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      issue.severity === 'high'
                        ? isLight
                          ? 'bg-red-100 text-red-700'
                          : 'bg-red-500/15 text-[var(--danger)]'
                        : issue.severity === 'medium'
                        ? isLight
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-amber-500/15 text-[var(--warning)]'
                        : isLight
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-sky-500/15 text-[var(--info)]'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold text-sm ${
                          isLight ? 'text-primary' : 'text-primary'
                        }`}
                      >
                        {issue.column}
                      </span>
                      <span
                        data-testid={`auditor-severity-${issue.id}`}
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                          issue.severity === 'high'
                            ? isLight
                              ? 'bg-red-100 text-red-900 border border-red-300'
                              : 'bg-red-500/20 text-[var(--danger)] border border-red-500/30'
                            : issue.severity === 'medium'
                            ? isLight
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-amber-500/20 text-[var(--warning)] border border-amber-500/30'
                            : isLight
                            ? 'bg-sky-100 text-sky-900 border border-sky-300'
                            : 'bg-sky-500/20 text-[var(--info)] border border-sky-500/30'
                        }`}
                      >
                        {issue.severity} severity
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          isLight ? 'text-muted' : 'text-muted'
                        }`}
                      >
                        • {issue.affectedRows} rows affected
                      </span>
                    </div>
                    <p
                      className={`text-xs ${
                        isLight ? 'text-secondary' : 'text-secondary'
                      }`}
                    >
                      {issue.description}
                    </p>
                    <div className="text-[11px] font-mono text-sky-700 dark:text-cyan-400 pt-1">
                      Recommendation: {issue.recommendedAction}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid={`auditor-keep-btn-${issue.id}`}
                    onClick={() => handleKeepAsIs(issue.id, issue.column)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card hover:bg-card-hover text-secondary hover:text-primary border border-subtle text-xs font-medium transition-colors cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Keep as is</span>
                  </button>
                  <button
                    type="button"
                    data-testid={`auditor-fix-btn-${issue.id}`}
                    onClick={() => handleQuickFixInAuditor(issue)}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-primary border border-subtle text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                  >
                    Fix Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

type DataQualityReportIssueItem = ReturnType<
  typeof evaluateDataQuality
>['issues'][number];
