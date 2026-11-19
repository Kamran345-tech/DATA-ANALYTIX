import React, { useState, useEffect } from 'react';
import { DataType } from '../../types';

export interface ColumnMappingModalProps {
  isOpen: boolean;
  columns: string[];
  detectedTypes: Record<string, DataType>;
  onConfirm: (customMapping: Record<string, string>) => void;
  onCancel: () => void;
  packRoles?: { value: string; label: string; required?: boolean }[];
  initialMapping?: Record<string, string>;
  packName?: string;
}

const DEFAULT_ROLE_OPTIONS = [
  { value: 'metric_revenue', label: 'Primary Revenue ($)' },
  { value: 'metric_cost', label: 'Total Cost / COGS ($)' },
  { value: 'metric_profit', label: 'Gross Profit ($)' },
  { value: 'metric_units', label: 'Units / Volume' },
  { value: 'metric_general', label: 'General Numeric Metric' },
  { value: 'dimension_date', label: 'Primary Date / Time' },
  { value: 'dimension_customer', label: 'Customer / Entity' },
  { value: 'dimension_category', label: 'Category / Slicer' },
  { value: 'dimension_general', label: 'General Dimension' },
  { value: 'ignore', label: 'Ignore / Exclude' },
];

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  columns,
  detectedTypes,
  onConfirm,
  onCancel,
  packRoles,
  initialMapping,
  packName,
}) => {
  const buildDefaultMapping = () => {
    if (initialMapping && Object.keys(initialMapping).length > 0) {
      return { ...initialMapping };
    }
    const initial: Record<string, string> = {};
    columns.forEach(col => {
      const lower = col.toLowerCase();
      if (/revenue|sales|amount|price/i.test(lower)) initial[col] = 'metric_revenue';
      else if (/cost|cogs|expense/i.test(lower)) initial[col] = 'metric_cost';
      else if (/profit|margin/i.test(lower)) initial[col] = 'metric_profit';
      else if (/date|time|period|year|month/i.test(lower)) initial[col] = 'dimension_date';
      else if (/unit|qty|quantity|count/i.test(lower)) initial[col] = 'metric_units';
      else if (/customer|client|account/i.test(lower)) initial[col] = 'dimension_customer';
      else if (/category|segment|region|channel/i.test(lower)) initial[col] = 'dimension_category';
      else initial[col] = detectedTypes[col] === 'number' ? 'metric_general' : 'dimension_general';
    });
    return initial;
  };

  const [mapping, setMapping] = useState<Record<string, string>>(buildDefaultMapping);

  useEffect(() => {
    if (isOpen) {
      setMapping(buildDefaultMapping());
    }
  }, [isOpen, columns.join(','), JSON.stringify(initialMapping || {})]);

  if (!isOpen) return null;

  const isPackMode = Array.isArray(packRoles) && packRoles.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="col-mapping-title"
        data-testid="column-mapping-modal"
        className="bg-app border border-subtle rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-5 border-b border-subtle flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                {isPackMode ? `${packName || 'Analytics Pack'} Role Mapping` : 'Pre-Flight Schema Mapping'}
              </span>
            </div>
            <h2 id="col-mapping-title" className="text-lg font-bold text-primary mt-1">
              {isPackMode ? 'Map Semantic Roles to Dataset Columns' : 'Verify Column Semantics & Roles'}
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              {isPackMode
                ? 'Assign each pack role to a column in your dataset to unlock domain KPIs, lenses, and charts.'
                : 'Confirm or adjust auto-detected field roles before calculations and model generation.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close schema mapping dialog"
            className="min-w-[40px] min-h-[40px] text-secondary hover:text-primary p-1 rounded-md transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 divide-y divide-[var(--border-subtle)]">
          {isPackMode ? (
            packRoles!.map(role => (
              <div key={role.value} className="pt-3 first:pt-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary font-semibold truncate">{role.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        role.required
                          ? 'bg-accent-soft text-accent font-bold'
                          : 'bg-elevated text-secondary'
                      }`}
                    >
                      {role.required ? 'REQUIRED' : 'OPTIONAL'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-muted mt-0.5">role: {role.value}</div>
                </div>
                <div className="w-full sm:w-64 shrink-0">
                  <select
                    data-testid={`role-select-${role.value}`}
                    aria-label={`Dataset column for role ${role.label}`}
                    value={mapping[role.value] || ''}
                    onChange={e => setMapping({ ...mapping, [role.value]: e.target.value })}
                    className="w-full min-h-[40px] bg-card border border-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)]"
                  >
                    <option value="">— Unmapped —</option>
                    {columns.map(col => (
                      <option key={col} value={col}>
                        {col} ({detectedTypes[col] || 'string'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          ) : (
            columns.map(col => (
              <div key={col} className="pt-3 first:pt-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary font-medium truncate">{col}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-elevated text-secondary">
                      {detectedTypes[col] || 'unknown'}
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-56 shrink-0">
                  <select
                    aria-label={`Role for column ${col}`}
                    value={mapping[col] || ''}
                    onChange={e => setMapping({ ...mapping, [col]: e.target.value })}
                    className="w-full min-h-[40px] bg-card border border-subtle rounded-lg px-2.5 py-1.5 text-xs text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)]"
                  >
                    {DEFAULT_ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-subtle bg-app flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-secondary">
            {isPackMode ? `${packRoles!.length} pack roles configured` : `${columns.length} columns verified`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[40px] px-4 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-elevated transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="confirm-column-mapping"
              onClick={() => onConfirm(mapping)}
              className="min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-on-accent hover:opacity-90 transition-colors shadow-sm cursor-pointer"
            >
              Confirm Mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
