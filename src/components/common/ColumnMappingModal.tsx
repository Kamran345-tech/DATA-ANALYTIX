import React, { useState } from 'react';
import { DataType } from '../../types';

export interface ColumnMappingModalProps {
  isOpen: boolean;
  columns: string[];
  detectedTypes: Record<string, DataType>;
  onConfirm: (customMapping: Record<string, string>) => void;
  onCancel: () => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  columns,
  detectedTypes,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const [mapping, setMapping] = useState<Record<string, string>>(() => {
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
  });

  const roleOptions = [
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div 
        role="dialog"
        aria-labelledby="col-mapping-title"
        className="bg-[#0F172A] border border-[#1E293B] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-5 border-b border-[#1E293B] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                Pre-Flight Schema Mapping
              </span>
            </div>
            <h2 id="col-mapping-title" className="text-lg font-bold text-white mt-1">
              Verify Column Semantics & Roles
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Confirm or adjust auto-detected field roles before calculations and model generation.
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close schema mapping dialog"
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 divide-y divide-[#1E293B]/60">
          {columns.map(col => (
            <div key={col} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white font-medium truncate">{col}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {detectedTypes[col] || 'unknown'}
                  </span>
                </div>
              </div>
              <div className="w-56 shrink-0">
                <select
                  aria-label={`Role for column ${col}`}
                  value={mapping[col]}
                  onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}
                  className="w-full bg-[#1E293B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                >
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[#1E293B] bg-[#0B1120] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {columns.length} columns verified
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Skip (Use Defaults)
            </button>
            <button
              onClick={() => onConfirm(mapping)}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
            >
              Confirm Schema & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
