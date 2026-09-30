import React, { useState, useMemo } from 'react';
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
  Database,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Info,
  Sliders,
  Type,
  Hash
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { DataType, MessyDataIssue } from '../../types';
import { detectMessyIssues } from '../../engine/dataQuality';

export const DataCleaningLabView: React.FC = () => {
  const { 
    cleanRows, 
    rawRows, 
    columns, 
    transformations, 
    addTransformation, 
    undoTransformation, 
    resetToRaw,
    qualityReport,
    loadDemoDataset
  } = usePlatform();

  // Active view tab: 'doctor' (Messy Data Doctor) | 'checklist' (Analyst Best Practices) | 'diff' (Before/After) | 'manual' (Custom Form)
  const [activeTab, setActiveTab] = useState<'doctor' | 'checklist' | 'diff' | 'manual'>('doctor');

  // Manual transform state
  const [selectedAction, setSelectedAction] = useState<
    | 'trim_whitespace' 
    | 'remove_duplicates' 
    | 'standardize_text' 
    | 'fill_missing' 
    | 'rename_column' 
    | 'change_type' 
    | 'delete_column' 
    | 'clean_dirty_numbers'
    | 'cap_outliers'
    | 'drop_null_rows'
    | 'calculated_column'
  >('trim_whitespace');

  const [targetColumn, setTargetColumn] = useState<string>(columns[0]?.name || '');
  const [paramNewName, setParamNewName] = useState('');
  const [paramType, setParamType] = useState<DataType>('string');
  const [paramFillMethod, setParamFillMethod] = useState<'mean' | 'median' | 'zero' | 'unknown'>('mean');
  const [paramTextFormat, setParamTextFormat] = useState<'uppercase' | 'lowercase' | 'titlecase'>('titlecase');
  const [paramCalcName, setParamCalcName] = useState('');
  const [paramCalcExpr, setParamCalcExpr] = useState('');
  const [diffViewMode, setDiffViewMode] = useState<'cleaned' | 'raw'>('cleaned');
  const [expandedChecklist, setExpandedChecklist] = useState<number | null>(null);

  // Detect messy issues in the current dataset
  const messyIssues = useMemo(() => {
    return detectMessyIssues(columns, cleanRows);
  }, [columns, cleanRows]);

  // Execute 1-Click Master Auto-Clean
  const handleAutoCleanAll = () => {
    addTransformation({
      action: 'auto_clean_all',
      parameters: {},
      description: `1-Click Auto-Clean: Deduplicated rows, trimmed whitespaces, standardized casing, cleaned currency strings, and imputed missing values.`
    });
  };

  // Execute a specific fix from the messy issue card
  const handleFixIssue = (issue: MessyDataIssue) => {
    addTransformation({
      action: issue.suggestedActionType,
      column: issue.column !== 'All Columns' ? issue.column : undefined,
      parameters: issue.actionParameters || {},
      description: `Automated Fix: ${issue.title}`
    });
  };

  // Manual form apply
  const handleApplyManual = () => {
    switch (selectedAction) {
      case 'trim_whitespace':
        addTransformation({
          action: 'trim_whitespace',
          column: targetColumn || undefined,
          parameters: {},
          description: targetColumn ? `Trimmed whitespace from [${targetColumn}]` : 'Trimmed whitespace across all columns'
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

      case 'clean_dirty_numbers':
        addTransformation({
          action: 'clean_dirty_numbers',
          column: targetColumn || undefined,
          parameters: {},
          description: targetColumn ? `Cleaned currency & parsed numbers in [${targetColumn}]` : 'Cleaned currency strings across dataset'
        });
        break;

      case 'cap_outliers':
        addTransformation({
          action: 'cap_outliers',
          column: targetColumn || undefined,
          parameters: {},
          description: targetColumn ? `Capped 1.5x IQR outliers in [${targetColumn}]` : 'Capped statistical outliers'
        });
        break;

      case 'drop_null_rows':
        addTransformation({
          action: 'drop_null_rows',
          column: targetColumn || undefined,
          parameters: {},
          description: targetColumn ? `Dropped rows with null values in [${targetColumn}]` : 'Dropped rows with any null values'
        });
        break;

      case 'calculated_column':
        if (!paramCalcName.trim() || !paramCalcExpr.trim()) return;
        addTransformation({
          action: 'calculated_column',
          parameters: { name: paramCalcName.trim(), expression: paramCalcExpr.trim() },
          description: `Created calculated field [${paramCalcName.trim()}] = ${paramCalcExpr.trim()}`
        });
        setParamCalcName('');
        setParamCalcExpr('');
        break;
    }
  };

  // Export cleaned data to CSV
  const handleExportCleanCSV = () => {
    if (cleanRows.length === 0) return;
    const cols = Object.keys(cleanRows[0]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [
      cols.join(','),
      ...cleanRows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `cleaned_dataset_production.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn w-full max-w-7xl mx-auto">
      {/* 1. Header & Quick Controls */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Wand2 className="w-4 h-4" /> Automated Messy Data Doctor & Transformation Core
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-wide uppercase">
            MESSY DATA DIAGNOSTICS & CLEANING LAB
          </h1>
          <p className="text-xs text-gray-400">
            Detects untrimmed spaces, duplicate records, mixed casing, dirty currencies, nulls, and outliers with 1-click automated fixes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Load Messy Benchmark Button */}
          <button
            onClick={() => loadDemoDataset('messy-crm-raw')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#242424] hover:bg-[#2d2d2d] text-amber-300 text-xs font-medium border border-amber-500/30 hover:border-amber-400 transition-colors"
            title="Load authentic raw dirty dataset to test all cleaning features"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Load Messy Benchmark</span>
          </button>

          {/* Export Cleaned CSV */}
          <button
            onClick={handleExportCleanCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1f1f1f] hover:bg-[#282828] text-white text-xs font-medium border border-[#333] hover:border-[#21F1A8] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#21F1A8]" />
            <span className="hidden sm:inline">Export Clean CSV</span>
          </button>

          {/* Undo Button */}
          <button
            onClick={undoTransformation}
            disabled={transformations.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#242424] hover:bg-[#303030] text-gray-300 disabled:opacity-30 text-xs border border-[#383838] transition-colors"
            title="Undo Last Transformation"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#21F1A8]" /> Undo
          </button>

          {/* Reset to Raw */}
          <button
            onClick={resetToRaw}
            disabled={transformations.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-400 disabled:opacity-30 text-xs border border-red-500/30 transition-colors"
            title="Reset to Original Raw File"
          >
            <Trash2 className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* 2. Live Health & 1-Click Master Auto-Clean Hero */}
      <div className="bg-gradient-to-r from-[#1c1c1c] via-[#1a241f] to-[#1c1c1c] border border-[#21F1A8]/40 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl shadow-black/40">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#21F1A8]/20 text-[#21F1A8] text-xs font-bold font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Data Cleaner
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Audited {cleanRows.length} rows • {transformations.length} cleaning steps applied
            </span>
          </div>

          <h2 className="font-heading text-xl sm:text-2xl font-bold text-white uppercase">
            {messyIssues.length === 0 ? (
              <span className="text-[#21F1A8] flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" /> DATASET IS CLEAN & PRODUCTION READY
              </span>
            ) : (
              <span>DETECTED {messyIssues.length} MESSY DATA ISSUES TO RESOLVE</span>
            )}
          </h2>

          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
            {messyIssues.length === 0 
              ? 'All whitespace trimmed, duplicates removed, text casing standardized, and missing values resolved. Your dataset is clean for Star Schema modeling and Power BI.'
              : 'Our scanner discovered dirty entries that distort KPIs, break SQL joins, or split categories in Power BI. Review individual issues below or resolve them in 1 click.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="bg-[#141414] border border-[#333] px-4 py-2.5 rounded-xl text-center">
            <span className="text-[10px] text-gray-400 uppercase font-mono block">Data Quality</span>
            <span className="text-2xl font-heading font-extrabold text-[#21F1A8]">
              {qualityReport.overallScore}%
            </span>
          </div>

          {messyIssues.length > 0 && (
            <button
              onClick={handleAutoCleanAll}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#21F1A8] text-black font-heading font-bold text-sm uppercase hover:bg-[#1cdb97] hover:glow-neon transition-all transform hover:-translate-y-0.5 shadow-lg shadow-[#21F1A8]/20"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>1-Click Auto-Clean All Issues</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Navigation View Switcher */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        <button
          onClick={() => setActiveTab('doctor')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'doctor'
              ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
              : 'bg-[#1c1c1c] text-gray-300 hover:bg-[#252525] hover:text-white border border-[#2e2e2e]'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" /> Messy Issues & Quick Fixes ({messyIssues.length})
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'checklist'
              ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
              : 'bg-[#1c1c1c] text-gray-300 hover:bg-[#252525] hover:text-white border border-[#2e2e2e]'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> What Else To Clean? (Analyst Guide)
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'diff'
              ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
              : 'bg-[#1c1c1c] text-gray-300 hover:bg-[#252525] hover:text-white border border-[#2e2e2e]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Before vs. After Diff ({cleanRows.length} Cleaned Rows)
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
            activeTab === 'manual'
              ? 'bg-[#21F1A8] text-black shadow-lg shadow-[#21F1A8]/20'
              : 'bg-[#1c1c1c] text-gray-300 hover:bg-[#252525] hover:text-white border border-[#2e2e2e]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Custom Transformation Studio
        </button>
      </div>

      {/* 4. TAB 1: MESSY ISSUES & 1-CLICK ACTIONS */}
      {activeTab === 'doctor' && (
        <div className="space-y-4">
          {messyIssues.length === 0 ? (
            <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[#21F1A8] mx-auto" />
              <h3 className="font-heading text-xl font-bold text-white uppercase">All Issues Cleaned!</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                No active messy entries discovered. All categorical dimensions, numeric columns, and row keys are validated.
              </p>
              <div className="pt-3 flex justify-center gap-3">
                <button
                  onClick={() => loadDemoDataset('messy-crm-raw')}
                  className="px-4 py-2 rounded-xl bg-[#242424] hover:bg-[#2f2f2f] text-amber-300 text-xs font-semibold border border-amber-500/30"
                >
                  Load Messy Benchmark to Test
                </button>
                <button
                  onClick={handleExportCleanCSV}
                  className="px-4 py-2 rounded-xl bg-[#21F1A8] text-black text-xs font-bold hover:bg-[#1cdb97]"
                >
                  Download Cleaned CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {messyIssues.map((issue) => (
                <div 
                  key={issue.id}
                  className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4 hover:border-[#21F1A8]/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Header badge & title */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                          issue.severity === 'high' 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : issue.severity === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {issue.severity} Priority
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          Target: <strong className="text-white">[{issue.column}]</strong>
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {issue.affectedCount} Affected
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-white uppercase">
                      {issue.title}
                    </h3>

                    <p className="text-xs text-gray-300 leading-relaxed">
                      {issue.description}
                    </p>

                    <div className="p-2.5 rounded-xl bg-[#141414] border border-[#262626] text-xs space-y-1">
                      <span className="text-[10px] text-gray-500 uppercase font-mono block">Why Fix This?</span>
                      <p className="text-gray-300 text-[11px]">{issue.recommendedAction}</p>
                    </div>
                  </div>

                  {/* Fix Action Button */}
                  <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-mono uppercase">
                      Operation: {issue.suggestedActionType.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => handleFixIssue(issue)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] hover:glow-neon transition-all"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Fix Now</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 2: ANALYST CLEANING GUIDE ("Kya Kya Krna Chyie") */}
      {activeTab === 'checklist' && (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-white uppercase flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#21F1A8]" />
              DATA ANALYST DATA CLEANING PLAYBOOK & CHECKLIST
            </h2>
            <p className="text-xs text-gray-400">
              When encountering messy raw business data, here is the professional end-to-end cleaning checklist every data analyst must execute:
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                step: '1. Deduplication & Record Identification',
                summary: 'Remove exact duplicate rows and resolve duplicate primary keys.',
                details: 'Duplicate records happen when data pipelines re-ingest logs or batch syncs fail. If not removed, they double-count gross revenue, distort sales volumes, and bias machine learning models. Always deduplicate before aggregations.',
                action: 'Run "Deduplicate Rows" in the cleaning lab.',
                icon: Scissors
              },
              {
                step: '2. String Sanitization & Whitespace Trimming',
                summary: 'Trim leading/trailing padding and non-breaking space characters.',
                details: 'Strings like "  Technology " and "Technology" look the same to humans, but in SQL and Power BI DAX they are treated as two distinct categories, splitting your bar charts into ugly duplicate bars. Always trim strings on all dimensional text fields.',
                action: 'Run "Trim Whitespace" across text columns.',
                icon: Type
              },
              {
                step: '3. Text Normalization & Casing Standardization',
                summary: 'Enforce uniform capitalization across categorical dimensions.',
                details: 'Raw CRM data frequently has "usa", "USA", and "Usa". Standardize them to Title Case ("United States" or "Usa") or UPPERCASE ("USA") so group-by summaries and filters consolidate neatly.',
                action: 'Apply "Standardize Casing (Title Case)".',
                icon: Edit3
              },
              {
                step: '4. Currency & Numeric String Coercion',
                summary: 'Strip symbols ($ € £ , %) and cast text to floating-point numbers.',
                details: 'CSV/Excel exports often store financial columns as "$1,250.00" strings. Because of the "$" and commas, mathematical engines cannot compute SUM(), AVG(), or standard deviations. Strip all non-numeric characters and cast to float.',
                action: 'Use "Clean Currency & Parse Numbers".',
                icon: Hash
              },
              {
                step: '5. Missing Value Treatment (MCAR / MAR / MNAR)',
                summary: 'Impute missing values with mean/median or fill categorical nulls.',
                details: 'Missing Completely at Random (MCAR) can be safely imputed with the mean (for symmetric distributions) or median (for skewed distributions). For categorical fields like Region, impute with "Unknown" so records aren\'t lost from reporting.',
                action: 'Use "Fill Missing Values" with mean or "Unknown".',
                icon: ShieldCheck
              },
              {
                step: '6. Statistical Outlier Capping (Winsorization)',
                summary: 'Cap extreme anomalies outside the 1.5x IQR fence at the 98th percentile.',
                details: 'Outliers often represent data entry errors (e.g. typing $500,000 instead of $5,000) or legitimate whale deals. Instead of deleting the row, Winsorization caps extreme values at reasonable thresholds to keep models stable.',
                action: 'Apply "Cap 1.5x IQR Outliers".',
                icon: AlertTriangle
              },
              {
                step: '7. Zero-Variance & Redundant Column Pruning',
                summary: 'Drop constant columns where 100% of rows have the identical value.',
                details: 'Columns like "RecordStatus = Active" across every row consume memory, clutter data dictionaries, and add zero predictive power. Drop them to keep the schema lean.',
                action: 'Drop constant columns in schema.',
                icon: Trash2
              }
            ].map((guide, idx) => {
              const Icon = guide.icon;
              const isExpanded = expandedChecklist === idx;
              return (
                <div 
                  key={idx}
                  className="bg-[#141414] border border-[#282828] rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedChecklist(isExpanded ? null : idx)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-heading text-sm sm:text-base font-bold text-white uppercase">{guide.step}</h4>
                        <p className="text-xs text-gray-400">{guide.summary}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-[#222] space-y-2 text-xs text-gray-300">
                      <p className="leading-relaxed">{guide.details}</p>
                      <div className="p-2.5 rounded-lg bg-[#1a231f] text-[#21F1A8] font-mono text-[11px] flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>How to do it here: <strong>{guide.action}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TAB 3: BEFORE VS AFTER DIFF PREVIEW */}
      {activeTab === 'diff' && (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-white uppercase flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#21F1A8]" />
                BEFORE VS AFTER DATA TRANSFORMATION DIFF
              </h2>
              <p className="text-xs text-gray-400">
                Compare uncleaned raw ingestion records against your active cleaned dataset.
              </p>
            </div>

            <div className="flex items-center bg-[#141414] p-1 rounded-xl border border-[#333] text-xs">
              <button
                onClick={() => setDiffViewMode('cleaned')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  diffViewMode === 'cleaned' ? 'bg-[#21F1A8] text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                Cleaned Data ({cleanRows.length} rows)
              </button>
              <button
                onClick={() => setDiffViewMode('raw')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  diffViewMode === 'raw' ? 'bg-[#21F1A8] text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                Original Raw ({rawRows.length} rows)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#282828] max-h-96">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#141414] text-gray-400 border-b border-[#2d2d2d] sticky top-0 z-10">
                <tr>
                  <th className="p-3">#</th>
                  {columns.map(c => (
                    <th key={c.name} className="p-3 whitespace-nowrap">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {(diffViewMode === 'cleaned' ? cleanRows : rawRows).slice(0, 20).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#1f1f1f] transition-colors">
                    <td className="p-3 text-gray-500 font-bold">{idx + 1}</td>
                    {columns.map(c => {
                      const val = row[c.name];
                      const isNull = val === null || val === undefined || val === '';
                      return (
                        <td key={c.name} className="p-3 whitespace-nowrap">
                          {isNull ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 text-[10px] font-bold">
                              NULL
                            </span>
                          ) : (
                            <span className="text-gray-200">{String(val)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 4: MANUAL TRANSFORMATION STUDIO */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 sm:p-6 space-y-5">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-white uppercase">
              SELECT MANUAL CLEANING OPERATION
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-medium">
              {[
                { id: 'trim_whitespace', label: 'Trim Whitespace' },
                { id: 'remove_duplicates', label: 'Deduplicate Rows' },
                { id: 'clean_dirty_numbers', label: 'Clean Currency / Numbers' },
                { id: 'standardize_text', label: 'Standardize Casing' },
                { id: 'fill_missing', label: 'Fill Missing Values' },
                { id: 'cap_outliers', label: 'Cap 1.5x Outliers' },
                { id: 'drop_null_rows', label: 'Drop Null Rows' },
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

            {/* Form controls */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#141414] border border-[#2a2a2a] space-y-4 text-xs">
              {selectedAction !== 'remove_duplicates' && selectedAction !== 'calculated_column' && (
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Target Column</label>
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
                  <label className="text-gray-300 font-medium">New Column Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Clean_Revenue_USD"
                    value={paramNewName}
                    onChange={(e) => setParamNewName(e.target.value)}
                    className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  />
                </div>
              )}

              {selectedAction === 'change_type' && (
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Target Type</label>
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
                  <label className="text-gray-300 font-medium">Missing Value Imputation Strategy</label>
                  <select
                    value={paramFillMethod}
                    onChange={(e) => setParamFillMethod(e.target.value as any)}
                    className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    <option value="mean">Arithmetic Mean (For Numerical Columns)</option>
                    <option value="median">Median (For Skewed Distributions)</option>
                    <option value="zero">Constant 0</option>
                    <option value="unknown">"Unknown" / "Unassigned" (For Categoricals)</option>
                  </select>
                </div>
              )}

              {selectedAction === 'standardize_text' && (
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Casing Target</label>
                  <select
                    value={paramTextFormat}
                    onChange={(e) => setParamTextFormat(e.target.value as any)}
                    className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    <option value="titlecase">Title Case ("North America")</option>
                    <option value="uppercase">UPPERCASE ("NORTH AMERICA")</option>
                    <option value="lowercase">lowercase ("north america")</option>
                  </select>
                </div>
              )}

              {selectedAction === 'calculated_column' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-gray-300 font-medium">New Column Name</label>
                    <input
                      type="text"
                      placeholder="e.g. NetProfitMargin"
                      value={paramCalcName}
                      onChange={(e) => setParamCalcName(e.target.value)}
                      className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-gray-300 font-medium">Formula Expression</label>
                    <input
                      type="text"
                      placeholder="e.g. [GrossRevenue] - [EstimatedCost]"
                      value={paramCalcExpr}
                      onChange={(e) => setParamCalcExpr(e.target.value)}
                      className="w-full bg-[#1e1e1e] text-[#21F1A8] font-mono p-2.5 rounded-lg border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-500">Wrap column names in brackets like [Revenue] * 0.15</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleApplyManual}
                className="w-full py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold hover:bg-[#1cdb97] hover:glow-neon transition-all"
              >
                Apply Transformation
              </button>
            </div>
          </div>

          {/* Right: Audit Trail */}
          <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4">
            <h3 className="font-heading text-lg font-bold text-white uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#21F1A8]" />
              TRANSFORMATION AUDIT TRAIL ({transformations.length})
            </h3>

            {transformations.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500 bg-[#141414] rounded-xl border border-[#262626]">
                No transformations applied yet. Dataset matches original raw state.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {transformations.map((step, idx) => (
                  <div 
                    key={step.id} 
                    className="p-3 rounded-xl bg-[#141414] border border-[#2a2a2a] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                      <span>Step #{idx + 1}</span>
                      <span>{step.timestamp.split('T')[1]?.split('.')[0] || step.timestamp}</span>
                    </div>
                    <div className="font-medium text-white">{step.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
