import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Wand2, 
  HelpCircle, 
  Zap, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { DownloadMenu } from '../common/DownloadMenu';

export const DataQualityView: React.FC = () => {
  const { qualityReport, setCurrentTab } = usePlatform();

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-card border border-subtle rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent font-mono">
            <ShieldCheck className="w-4 h-4" /> Multi-Dimensional Quality Audit
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary tracking-wide uppercase">
            DATA QUALITY SCORE & AUDITOR
          </h1>
          <p className="text-xs text-secondary">
            Computed from real cell completeness, primary key uniqueness, data type compliance, and text consistency.
          </p>
        </div>

        {/* Big Overall Quality Score Gauge */}
        <div className="flex items-center gap-4 bg-elevated border border-subtle px-6 py-4 rounded-2xl">
          <div className="text-right">
            <span className="text-[10px] text-muted uppercase font-mono block">Overall Score</span>
            <span className="text-4xl font-heading font-extrabold text-accent">
              {qualityReport.overallScore}%
            </span>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-sky-500 border-t-transparent flex items-center justify-center font-bold text-xs text-primary">
            {qualityReport.overallScore >= 90 ? 'A+' : qualityReport.overallScore >= 80 ? 'B' : 'C'}
          </div>
          <DownloadMenu context="quality" />
        </div>
      </div>

      {/* Sub-Dimension Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-subtle rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary font-medium">Completeness</span>
            <span className="text-primary font-bold font-mono">{qualityReport.completenessScore}%</span>
          </div>
          <div className="w-full bg-elevated h-2 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full" style={{ width: `${qualityReport.completenessScore}%` }} />
          </div>
          <span className="text-[10px] text-muted block">Evaluates missing or null cell ratios</span>
        </div>

        <div className="bg-card border border-subtle rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary font-medium">Uniqueness</span>
            <span className="text-primary font-bold font-mono">{qualityReport.uniquenessScore}%</span>
          </div>
          <div className="w-full bg-elevated h-2 rounded-full overflow-hidden">
            <div className="bg-blue-400 h-full rounded-full" style={{ width: `${qualityReport.uniquenessScore}%` }} />
          </div>
          <span className="text-[10px] text-muted block">Deduplication & key candidate audit</span>
        </div>

        <div className="bg-card border border-subtle rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary font-medium">Validity</span>
            <span className="text-primary font-bold font-mono">{qualityReport.validityScore}%</span>
          </div>
          <div className="w-full bg-elevated h-2 rounded-full overflow-hidden">
            <div className="bg-purple-400 h-full rounded-full" style={{ width: `${qualityReport.validityScore}%` }} />
          </div>
          <span className="text-[10px] text-muted block">Type casting & IQR outlier detection</span>
        </div>

        <div className="bg-card border border-subtle rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="text-secondary font-medium">Consistency</span>
            <span className="text-primary font-bold font-mono">{qualityReport.consistencyScore}%</span>
          </div>
          <div className="w-full bg-elevated h-2 rounded-full overflow-hidden">
            <div className="bg-sky-400 h-full rounded-full" style={{ width: `${qualityReport.consistencyScore}%` }} />
          </div>
          <span className="text-[10px] text-muted block">Formatting & text casing conformity</span>
        </div>
      </div>

      {/* Issues Breakdown List */}
      <div className="bg-card border border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-primary tracking-wide uppercase flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            DETECTED DATA ANOMALIES & AUDIT FINDINGS ({qualityReport.issues.length})
          </h2>

          <button
            onClick={() => setCurrentTab('cleaning')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-soft border border-accent/30 text-accent text-xs font-semibold hover:opacity-90 transition-colors cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" /> Clean Data in Cleaning Lab
          </button>
        </div>

        {qualityReport.issues.length === 0 ? (
          <div className="p-8 text-center bg-elevated rounded-xl border border-subtle space-y-2">
            <CheckCircle2 className="w-8 h-8 text-accent mx-auto" />
            <h4 className="font-bold text-primary text-sm">Pristine Dataset Health</h4>
            <p className="text-xs text-secondary">Zero missing values, duplicates, or formatting inconsistencies detected.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {qualityReport.issues.map(issue => (
              <div 
                key={issue.id}
                className="bg-elevated border border-subtle rounded-xl p-4 flex flex-wrap items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary font-mono">{issue.column}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      issue.severity === 'high' ? 'bg-red-500/15 text-[var(--danger)] border border-red-500/30' :
                      issue.severity === 'medium' ? 'bg-amber-500/15 text-[var(--warning)] border border-amber-500/30' :
                      'bg-sky-500/15 text-[var(--info)] border border-sky-500/30'
                    }`}>
                      {issue.severity}
                    </span>
                    <span className="text-muted font-mono text-[10px]">
                      {issue.affectedRows} rows impacted
                    </span>
                  </div>
                  <p className="text-secondary">{issue.description}</p>
                  <p className="text-accent font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Fix: {issue.recommendedAction}
                  </p>
                </div>

                <button
                  onClick={() => setCurrentTab('cleaning')}
                  className="px-3 py-1.5 rounded-lg bg-card border border-subtle hover:border-accent text-secondary hover:text-primary text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  Resolve <ArrowRight className="w-3 h-3 text-accent" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
