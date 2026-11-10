import React from 'react';

export interface VerifiedAiCardProps {
  text: string;
  isRuleBased?: boolean;
  model?: string;
  sourceMetrics?: string[];
  contextValues?: Record<string, number | string>;
  className?: string;
}

export const VerifiedAiCard: React.FC<VerifiedAiCardProps> = ({
  text,
  isRuleBased = false,
  model = 'gemini-2.5-flash',
  sourceMetrics = [],
  contextValues = {},
  className = ''
}) => {
  // Extract numbers mentioned in text to check if they exist in contextValues
  const mentionedNumbers = React.useMemo(() => {
    const matches = text.match(/\$?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?%?/g) || [];
    return Array.from(new Set(matches.map(m => m.replace(/[\$,%]/g, ''))))
      .filter(n => n.length > 0 && !isNaN(Number(n)))
      .map(Number);
  }, [text]);

  const contextNumbers = React.useMemo(() => {
    const list: number[] = [];
    Object.values(contextValues).forEach(v => {
      const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) list.push(num);
    });
    return list;
  }, [contextValues]);

  // If numbers are present in context, verify coverage
  const unverifiedCount = React.useMemo(() => {
    if (contextNumbers.length === 0 || mentionedNumbers.length === 0) return 0;
    return mentionedNumbers.filter(mn => {
      // Check if within 5% or rounded match of any context number
      return !contextNumbers.some(cn => Math.abs(cn - mn) < 1 || Math.abs((cn - mn) / (cn || 1)) < 0.05);
    }).length;
  }, [mentionedNumbers, contextNumbers]);

  const isVerified = unverifiedCount === 0;

  return (
    <div className={`rounded-xl border border-slate-800 bg-app p-5 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Verified AI Citation
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              {unverifiedCount} Unverified Metric Claim{unverifiedCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[11px] font-mono text-secondary">
            {model} {isRuleBased ? '(Deterministic)' : '(Grounded)'}
          </span>
        </div>

        {sourceMetrics.length > 0 && (
          <div className="text-[11px] text-secondary">
            Grounded against {sourceMetrics.length} KPI{sourceMetrics.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="text-sm leading-relaxed text-primary whitespace-pre-line space-y-2">
        {text}
      </div>

      {sourceMetrics.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-secondary font-medium">Audited Sources:</span>
          {sourceMetrics.map(metric => (
            <span key={metric} className="text-[10px] font-mono px-2 py-0.5 rounded bg-elevated text-secondary">
              {metric}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
