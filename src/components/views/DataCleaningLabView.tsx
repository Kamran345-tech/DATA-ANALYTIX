import React, { useState } from 'react';
import { 
  Wand2, 
  RotateCcw, 
  Trash2, 
  Edit3, 
  Filter, 
  Plus, 
  Check, 
  Clock, 
  Layers, 
  Scissors, 
  ArrowRight,
  Database
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { DataType } from '../../types';

export const DataCleaningLabView: React.FC = () => {
  const { 
    cleanRows, 
    rawRows, 
    columns, 
    transformations, 
    addTransformation, 
    undoTransformation, 
    resetToRaw 
  } = usePlatform();

  const [selectedAction, setSelectedAction] = useState<
    | 'trim_whitespace' 
    | 'remove_duplicates' 
    | 'standardize_text' 
    | 'fill_missing' 
    | 'rename_column' 
    | 'change_type' 
    | 'delete_column' 
    | 'calculated_column'
  >('trim_whitespace');

  // Form states
  const [targetColumn, setTargetColumn] = useState<string>(columns[0]?.name || '');
  const [paramNewName, setParamNewName] = useState('');
  const [paramType, setParamType] = useState<DataType>('string');
  const [paramFillMethod, setParamFillMethod] = useState<'mean' | 'median' | 'zero' | 'unknown'>('unknown');
  const [paramTextFormat, setParamTextFormat] = useState<'uppercase' | 'lowercase' | 'titlecase'>('titlecase');
  const [paramCalcName, setParamCalcName] = useState('');
  const [paramCalcExpr, setParamCalcExpr] = useState('');

  const handleApply = () => {
    switch (selectedAction) {
      case 'trim_whitespace':
        addTransformation({
          action: 'trim_whitespace',
          column: targetColumn || undefined,
          parameters: {},
          description: targetColumn ? `Trimmed whitespace from [${targetColumn}]` : 'Trimmed whitespace across all text columns'
        });
        break;

      case 'remove_duplicates':
        addTransformation({
          action: 'remove_duplicates',
          parameters: {},
          description: 'Removed exact duplicate rows from active dataset'
        });
        break;

      case 'standardize_text':
        if (!targetColumn) return;
        addTransformation({
          action: 'standardize_text',
          column: targetColumn,
          parameters: { format: paramTextFormat },
          description: `Standardized casing for [${targetColumn}] to ${paramTextFormat}`
        });
        break;

      case 'fill_missing':
        if (!targetColumn) return;
        addTransformation({
          action: 'fill_missing',
          column: targetColumn,
          parameters: { method: paramFillMethod },
          description: `Filled missing values in [${targetColumn}] using ${paramFillMethod}`
        });
        break;

      case 'rename_column':
        if (!targetColumn || !paramNewName.trim()) return;
        addTransformation({
          action: 'rename_column',
          column: targetColumn,
          parameters: { newName: paramNewName.trim() },
          description: `Renamed column [${targetColumn}] to [${paramNewName.trim()}]`
        });
        setParamNewName('');
        break;

      case 'change_type':
        if (!targetColumn) return;
        addTransformation({
          action: 'change_type',
          column: targetColumn,
          parameters: { targetType: paramType },
          description: `Converted [${targetColumn}] data type to ${paramType}`
        });
        break;

      case 'delete_column':
        if (!targetColumn) return;
        addTransformation({
          action: 'delete_column',
          column: targetColumn,
          parameters: {},
          description: `Dropped column [${targetColumn}]`
        });
        break;

      case 'calculated_column':
        if (!paramCalcName.trim() || !paramCalcExpr.trim()) return;
        addTransformation({
          action: 'calculated_column',
          parameters: { name: paramCalcName.trim(), expression: paramCalcExpr.trim() },
          description: `Created calculated column [${paramCalcName.trim()}] = ${paramCalcExpr.trim()}`
        });
        setParamCalcName('');
        setParamCalcExpr('');
        break;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Wand2 className="w-4 h-4" /> Immutable Data Transformation Engine
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            DATA CLEANING LAB
          </h1>
          <p className="text-xs text-gray-400">
            Apply visual cleaning operations. <span className="text-[#21F1A8]">01_Original_Data</span> is permanently preserved while <span className="text-[#21F1A8]">02_Cleaned_Data</span> updates with complete audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undoTransformation}
            disabled={transformations.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#242424] hover:bg-[#303030] text-gray-300 disabled:opacity-40 text-xs border border-[#383838] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#21F1A8]" /> Undo Last
          </button>
          <button
            onClick={resetToRaw}
            disabled={transformations.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-400 disabled:opacity-40 text-xs border border-red-500/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Reset to Original
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Operations Form */}
        <div className="lg:col-span-2 bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-6">
          <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wide">
            AVAILABLE CLEANING TRANSFORMATIONS
          </h2>

          {/* Action selection pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium">
            {[
              { id: 'trim_whitespace', label: 'Trim Whitespace' },
              { id: 'remove_duplicates', label: 'Deduplicate Rows' },
              { id: 'standardize_text', label: 'Standardize Casing' },
              { id: 'fill_missing', label: 'Fill Missing Values' },
              { id: 'rename_column', label: 'Rename Column' },
              { id: 'change_type', label: 'Change Data Type' },
              { id: 'delete_column', label: 'Drop Column' },
              { id: 'calculated_column', label: 'Calculated Field' },
            ].map(act => (
              <button
                key={act.id}
                onClick={() => setSelectedAction(act.id as any)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  selectedAction === act.id 
                    ? 'bg-[#21F1A8]/15 border-[#21F1A8] text-[#21F1A8] font-bold' 
                    : 'bg-[#141414] border-[#2c2c2c] text-gray-400 hover:text-white hover:bg-[#202020]'
                }`}
              >
                {act.label}
              </button>
            ))}
          </div>

          {/* Action parameter form */}
          <div className="p-5 rounded-xl bg-[#141414] border border-[#2a2a2a] space-y-4 text-xs">
            {selectedAction !== 'remove_duplicates' && selectedAction !== 'calculated_column' && (
              <div className="space-y-1.5">
                <label className="text-gray-400 font-medium">Target Field / Column</label>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                >
                  {columns.map(c => (
                    <option key={c.name} value={c.name}>{c.name} ({c.dataType})</option>
                  ))}
                </select>
              </div>
            )}

            {selectedAction === 'rename_column' && (
              <div className="space-y-1.5">
                <label className="text-gray-400 font-medium">New Column Title</label>
                <input
                  type="text"
                  placeholder="e.g. Total_Revenue_USD"
                  value={paramNewName}
                  onChange={(e) => setParamNewName(e.target.value)}
                  className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                />
              </div>
            )}

            {selectedAction === 'change_type' && (
              <div className="space-y-1.5">
                <label className="text-gray-400 font-medium">Target Data Type</label>
                <select
                  value={paramType}
                  onChange={(e) => setParamType(e.target.value as DataType)}
                  className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                >
                  <option value="number">Number (Float / Integer)</option>
                  <option value="string">Text / String</option>
                  <option value="date">Date (YYYY-MM-DD)</option>
                  <option value="boolean">Boolean (True / False)</option>
                </select>
              </div>
            )}

            {selectedAction === 'fill_missing' && (
              <div className="space-y-1.5">
                <label className="text-gray-400 font-medium">Imputation Strategy</label>
                <select
                  value={paramFillMethod}
                  onChange={(e) => setParamFillMethod(e.target.value as any)}
                  className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                >
                  <option value="unknown">Fill with "Unknown" (Categorical)</option>
                  <option value="zero">Fill with 0 (Numeric)</option>
                  <option value="mean">Impute with Column Mean (Numeric)</option>
                  <option value="median">Impute with Column Median (Numeric)</option>
                </select>
              </div>
            )}

            {selectedAction === 'standardize_text' && (
              <div className="space-y-1.5">
                <label className="text-gray-400 font-medium">Casing Standard</label>
                <select
                  value={paramTextFormat}
                  onChange={(e) => setParamTextFormat(e.target.value as any)}
                  className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                >
                  <option value="titlecase">Proper Title Case (e.g. North America)</option>
                  <option value="uppercase">UPPERCASE (e.g. NORTH AMERICA)</option>
                  <option value="lowercase">lowercase (e.g. north america)</option>
                </select>
              </div>
            )}

            {selectedAction === 'calculated_column' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-medium">Calculated Column Name</label>
                  <input
                    type="text"
                    placeholder="e.g. GrossMargin"
                    value={paramCalcName}
                    onChange={(e) => setParamCalcName(e.target.value)}
                    className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-medium">Mathematical Expression</label>
                  <input
                    type="text"
                    placeholder="e.g. [Revenue] - [Cost]"
                    value={paramCalcExpr}
                    onChange={(e) => setParamCalcExpr(e.target.value)}
                    className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-gray-500 block">Use square brackets around existing numeric column names.</span>
                </div>
              </div>
            )}

            <button
              onClick={handleApply}
              className="w-full py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Apply Transformation
            </button>
          </div>
        </div>

        {/* Right: Transformation Audit Log */}
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#21F1A8]" />
              AUDIT LOG ({transformations.length})
            </h3>
            <span className="text-[10px] font-mono text-gray-400">Replayable Trail</span>
          </div>

          {transformations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500 bg-[#141414] rounded-xl border border-[#282828]">
              No manual transformations recorded. Cleaned state is identical to validated ingestion.
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {transformations.map((t, idx) => (
                <div 
                  key={t.id}
                  className="p-3 rounded-xl bg-[#141414] border border-[#282828] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-gray-400 text-[10px] font-mono">
                    <span>Step #{idx + 1}</span>
                    <span>{t.timestamp}</span>
                  </div>
                  <div className="text-white font-medium">{t.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
