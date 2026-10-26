import React, { useState, useMemo } from 'react';
import { 
  X, 
  Check, 
  Calculator, 
  Sparkles, 
  Sliders, 
  Hash, 
  Percent, 
  DollarSign, 
  Layers, 
  RotateCcw,
  Eye,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { KPI, KPIStatus } from '../../types';
import { usePlatform } from '../../store/usePlatformStore';
import { calculateKpiFromParameters, CustomKpiParams } from '../../engine/analyticsEngine';

interface KpiCardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpi: KPI;
}

export const KpiCardEditorModal: React.FC<KpiCardEditorModalProps> = ({
  isOpen,
  onClose,
  kpi
}) => {
  const { columns, cleanRows, recalculateKpiCard, dataModel, themeMode } = usePlatform();
  const isLight = themeMode === 'light';

  // Local form state initialized from KPI
  const [name, setName] = useState<string>(kpi.name);
  const [sourceColumn, setSourceColumn] = useState<string>(
    kpi.sourceColumn && kpi.sourceColumn !== '*' ? kpi.sourceColumn : (columns[0]?.name || '*')
  );
  const [aggregation, setAggregation] = useState<KPI['aggregation']>(
    kpi.aggregation || 'sum'
  );
  
  // Detect initial format type
  const initialFormatType = useMemo(() => {
    if (kpi.unit?.includes('$') || kpi.formattedValue.includes('$')) return 'currency';
    if (kpi.unit === '%' || kpi.formattedValue.includes('%')) return 'percent';
    if (kpi.aggregation === 'count' || kpi.aggregation === 'distinct_count') return 'integer';
    return 'custom';
  }, [kpi]);

  const [formatType, setFormatType] = useState<'currency' | 'percent' | 'integer' | 'decimal' | 'custom'>(initialFormatType);
  const [customUnit, setCustomUnit] = useState<string>(kpi.unit || '');
  const [statusMode, setStatusMode] = useState<KPIStatus | 'auto'>('auto');

  // Available numeric and general columns
  const numericCols = useMemo(() => columns.filter(c => c.dataType === 'number'), [columns]);
  const allCols = useMemo(() => columns, [columns]);

  // Compute live preview
  const previewKpi = useMemo(() => {
    const tableName = dataModel.tables[0]?.name || 'FactTable';
    const dateCol = columns.find(c => c.dataType === 'date')?.name;
    const params: CustomKpiParams = {
      id: kpi.id,
      name: name.trim() || 'Custom Metric',
      sourceColumn,
      aggregation,
      formatType,
      customUnit: formatType === 'custom' ? customUnit : undefined,
      status: statusMode
    };
    return calculateKpiFromParameters(params, cleanRows, dateCol, tableName);
  }, [name, sourceColumn, aggregation, formatType, customUnit, statusMode, cleanRows, columns, dataModel, kpi.id]);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalName = name.trim() || previewKpi.name;
    recalculateKpiCard(kpi.id, {
      name: finalName,
      sourceColumn,
      aggregation,
      formatType,
      customUnit: formatType === 'custom' ? customUnit.trim() : undefined,
      status: statusMode
    });
    onClose();
  };

  const handleReset = () => {
    setName(kpi.name);
    setSourceColumn(kpi.sourceColumn || columns[0]?.name || '*');
    setAggregation(kpi.aggregation || 'sum');
    setFormatType(initialFormatType);
    setCustomUnit(kpi.unit || '');
    setStatusMode('auto');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#181818] border-[#333] text-gray-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-panel/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#21F1A8]/15 border border-[#21F1A8]/30 flex items-center justify-center text-[#21F1A8]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base tracking-tight text-on-surface">
                Customize KPI Card & Calculation
              </h3>
              <p className="text-xs text-on-surface-variant">
                Change heading, select dataset column, aggregation method, and value format
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-elevated text-on-surface-variant hover:text-on-surface transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Card Heading / Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
              <span>Card Heading / Title</span>
              <span className="text-[11px] font-normal text-metric-emerald">Editable label across dashboard & reports</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Total Invoiced Amount, Average Rating, Net Revenue..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#21F1A8] transition-all shadow-xs ${
                isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-[#121212] border-[#2c2c2c] text-white'
              }`}
            />
          </div>

          {/* 2. Column Selection & Aggregation Formula */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Column Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Target Dataset Column
              </label>
              <select
                value={sourceColumn}
                onChange={(e) => setSourceColumn(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#21F1A8] cursor-pointer shadow-xs ${
                  isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-[#121212] border-[#2c2c2c] text-white'
                }`}
              >
                <option value="*">* (All Rows / Total Count)</option>
                <optgroup label="Numerical Measures">
                  {numericCols.map((c) => (
                    <option key={c.name} value={c.name}>
                      # {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All Other Fields">
                  {allCols.filter(c => c.dataType !== 'number').map((c) => (
                    <option key={c.name} value={c.name}>
                      [{c.dataType.toUpperCase()}] {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Aggregation Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Aggregation Formula
              </label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as KPI['aggregation'])}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#21F1A8] cursor-pointer shadow-xs ${
                  isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-[#121212] border-[#2c2c2c] text-white'
                }`}
              >
                <option value="sum">SUM (Total Sum of all values)</option>
                <option value="avg">AVERAGE (Statistical Mean)</option>
                <option value="count">COUNT (Total Row Entries)</option>
                <option value="distinct_count">DISTINCT COUNT (Unique Values)</option>
                <option value="max">MAX (Highest Observed Value)</option>
                <option value="min">MIN (Lowest Observed Value)</option>
              </select>
            </div>
          </div>

          {/* 3. Value Format & Unit */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Format & Unit Display
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setFormatType('currency')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                  formatType === 'currency'
                    ? 'bg-[#21F1A8] text-black border-[#21F1A8] font-bold shadow-sm'
                    : 'bg-surface-panel border-border-subtle text-on-surface hover:bg-surface-elevated'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Currency ($)
              </button>
              <button
                type="button"
                onClick={() => setFormatType('percent')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                  formatType === 'percent'
                    ? 'bg-[#21F1A8] text-black border-[#21F1A8] font-bold shadow-sm'
                    : 'bg-surface-panel border-border-subtle text-on-surface hover:bg-surface-elevated'
                }`}
              >
                <Percent className="w-3.5 h-3.5" /> Percent (%)
              </button>
              <button
                type="button"
                onClick={() => setFormatType('integer')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                  formatType === 'integer'
                    ? 'bg-[#21F1A8] text-black border-[#21F1A8] font-bold shadow-sm'
                    : 'bg-surface-panel border-border-subtle text-on-surface hover:bg-surface-elevated'
                }`}
              >
                <Hash className="w-3.5 h-3.5" /> Integer
              </button>
              <button
                type="button"
                onClick={() => setFormatType('decimal')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                  formatType === 'decimal'
                    ? 'bg-[#21F1A8] text-black border-[#21F1A8] font-bold shadow-sm'
                    : 'bg-surface-panel border-border-subtle text-on-surface hover:bg-surface-elevated'
                }`}
              >
                <span>0.00</span> Decimal
              </button>
              <button
                type="button"
                onClick={() => setFormatType('custom')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                  formatType === 'custom'
                    ? 'bg-[#21F1A8] text-black border-[#21F1A8] font-bold shadow-sm'
                    : 'bg-surface-panel border-border-subtle text-on-surface hover:bg-surface-elevated'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Custom
              </button>
            </div>

            {/* Custom Suffix Input */}
            {formatType === 'custom' && (
              <div className="pt-2 animate-fadeIn">
                <input
                  type="text"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="Custom unit suffix e.g. pts, °C, hrs, kg, tickets, orders..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[#21F1A8] shadow-xs ${
                    isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-[#121212] border-[#2c2c2c] text-white'
                  }`}
                />
              </div>
            )}
          </div>

          {/* 4. Target Status Badge */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Status Threshold
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              {(['auto', 'Above Target', 'On Track', 'At Risk', 'Below Target'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusMode(s)}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    statusMode === s
                      ? 'bg-[#21F1A8]/20 border-[#21F1A8] text-[#21F1A8] font-bold'
                      : 'bg-surface-panel border-border-subtle text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {s === 'auto' ? 'Auto (Paced vs Prior)' : s}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Live Calculation Preview Box */}
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#21F1A8]" />
              <span>Live Calculation Preview</span>
            </label>
            <div className={`p-4 rounded-xl border shadow-inner ${
              isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#121212] border-[#222]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold truncate max-w-[200px]">
                  {previewKpi.name}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#21F1A8]/20 text-[#21F1A8] border border-[#21F1A8]/30">
                  {previewKpi.status}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-3xl font-extrabold text-on-surface tracking-tight">
                  {previewKpi.formattedValue}
                </span>
                {previewKpi.changePercent !== undefined && (
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${
                    previewKpi.changePercent >= 0 ? 'text-[#21F1A8]' : 'text-red-400'
                  }`}>
                    {previewKpi.changePercent >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {previewKpi.changePercent >= 0 ? '+' : ''}{previewKpi.changePercent}%
                  </span>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-on-surface-variant">
                <span>Formula: <strong className="text-on-surface">{previewKpi.calculation}</strong></span>
                <span>Src: <strong className="text-on-surface">{previewKpi.traceableSource}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-surface-panel/50">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Form
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#21F1A8] text-black text-xs font-bold hover:bg-[#1cdb97] transition-all shadow-md shadow-[#21F1A8]/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" /> Save & Apply Everywhere
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
