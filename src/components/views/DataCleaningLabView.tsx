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
    loadDemoDataset,
    themeMode
  } = usePlatform();

  const isLight = themeMode === 'light';

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
      <div className="bg-card border border-subtle rounded-2xl p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono text-accent">
            <Wand2 className="w-4 h-4" /> Automated Messy Data Doctor & Transformation Core
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-primary tracking-wide uppercase">
            MESSY DATA DIAGNOSTICS & CLEANING LAB
          </h1>
          <p className="text-xs text-secondary">
            Detects untrimmed spaces, duplicate records, mixed casing, dirty currencies, nulls, and outliers with 1-click automated fixes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Load Messy Benchmark Button */}
          <button
            onClick={() => loadDemoDataset('messy-crm-raw')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-card-hover text-[var(--warning)] text-xs font-medium border border-amber-500/30 hover:border-amber-400 transition-colors cursor-pointer"
            title="Load authentic raw dirty dataset to test all cleaning features"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)]" />
            <span className="hidden sm:inline">Load Messy Benchmark</span>
          </button>

          {/* Export Cleaned CSV */}
          <button
            onClick={handleExportCleanCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-card-hover text-primary text-xs font-medium border border-subtle hover:border-accent transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Export Clean CSV</span>
          </button>

          {/* Undo Button */}
          <button
            onClick={undoTransformation}
            disabled={transformations.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-elevated hover:bg-card-hover text-secondary disabled:opacity-30 text-xs border border-subtle transition-colors cursor-pointer"
            title="Undo Last Transformation"
          >
            <RotateCcw className="w-3.5 h-3.5 text-accent" /> Undo
          </button>

          {/* Reset to Raw */}
          <button
            onClick={resetToRaw}
            disabled={transformations.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[var(--danger)] disabled:opacity-30 text-xs border border-red-500/30 transition-colors cursor-pointer"
            title="Reset to Original Raw File"
          >
            <Trash2 className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* 2. Live Health & 1-Click Master Auto-Clean Hero */}
      <div className={`border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-5 transition-all ${
        isLight 
          ? 'bg-gradient-to-r from-sky-50/70 via-white to-cyan-50/70 border-sky-300 shadow-sm text-slate-900' 
          : 'bg-gradient-to-r from-[#1c1c1c] via-[#132238] to-[#1c1c1c] border-cyan-500/40 shadow-xl shadow-black/40 text-white'
      }`}>
        <div className="space-y-2 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono flex items-center gap-1.5 border ${
              isLight 
                ? 'bg-sky-100 text-sky-900 border-sky-300' 
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            }`}>
              <Sparkles className="w-3.5 h-3.5" /> AI Data Cleaner
            </span>
            <span className={`text-xs font-mono ${isLight ? 'text-slate-600 font-medium' : 'text-gray-400'}`}>
              Audited {cleanRows.length} rows • {transformations.length} cleaning steps applied
            </span>
          </div>

          <h2 className={`font-heading text-xl sm:text-2xl font-bold uppercase ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            {messyIssues.length === 0 ? (
              <span className="text-sky-600 dark:text-cyan-400 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" /> DATASET IS CLEAN & PRODUCTION READY
              </span>
            ) : (
              <span>DETECTED {messyIssues.length} MESSY DATA ISSUES TO RESOLVE</span>
            )}
          </h2>

          <p className={`text-xs max-w-2xl leading-relaxed ${
            isLight ? 'text-slate-600 font-medium' : 'text-gray-300'
          }`}>
            {messyIssues.length === 0 
              ? 'All whitespace trimmed, duplicates removed, text casing standardized, and missing values resolved. Your dataset is clean for Star Schema modeling and Power BI.'
              : 'Our scanner discovered dirty entries that distort KPIs, break SQL joins, or split categories in Power BI. Review individual issues below or resolve them in 1 click.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className={`px-4 py-2.5 rounded-xl text-center border ${
            isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-[#141414] border-[#333]'
          }`}>
            <span className={`text-[10px] uppercase font-mono block ${isLight ? 'text-slate-500 font-semibold' : 'text-gray-400'}`}>Data Quality</span>
            <span className="text-2xl font-heading font-extrabold text-sky-600 dark:text-cyan-400">
              {qualityReport.overallScore}%
            </span>
          </div>

          {messyIssues.length > 0 && (
            <button
              onClick={handleAutoCleanAll}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-heading font-bold text-sm uppercase transition-all transform hover:-translate-y-0.5 shadow-lg shadow-sky-600/30 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>1-Click Auto-Clean All Issues</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Navigation View Switcher */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        <button
          onClick={() => setActiveTab('doctor')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'doctor'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold'
              : 'bg-card text-secondary hover:bg-card-hover hover:text-primary border border-subtle'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" /> Messy Issues & Quick Fixes ({messyIssues.length})
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'checklist'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold'
              : 'bg-card text-secondary hover:bg-card-hover hover:text-primary border border-subtle'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> What Else To Clean? (Analyst Guide)
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'diff'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold'
              : 'bg-card text-secondary hover:bg-card-hover hover:text-primary border border-subtle'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Before vs. After Diff ({cleanRows.length} Cleaned Rows)
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-bold'
              : 'bg-card text-secondary hover:bg-card-hover hover:text-primary border border-subtle'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Custom Transformation Studio
        </button>
      </div>

      {/* 4. TAB 1: MESSY ISSUES & 1-CLICK ACTIONS */}
      {activeTab === 'doctor' && (
        <div className="space-y-4">
          {messyIssues.length === 0 ? (
            <div className="bg-card border border-subtle rounded-2xl p-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
              <h3 className="font-heading text-xl font-bold text-primary uppercase">All Issues Cleaned!</h3>
              <p className="text-xs text-secondary max-w-md mx-auto">
                No active messy entries discovered. All categorical dimensions, numeric columns, and row keys are validated.
              </p>
              <div className="pt-3 flex justify-center gap-3">
                <button
                  onClick={() => loadDemoDataset('messy-crm-raw')}
                  className="px-4 py-2 rounded-xl bg-elevated hover:bg-card-hover text-[var(--warning)] text-xs font-semibold border border-amber-500/30 cursor-pointer"
                >
                  Load Messy Benchmark to Test
                </button>
                <button
                  onClick={handleExportCleanCSV}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 cursor-pointer"
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
                  className="bg-card border border-subtle rounded-2xl p-5 space-y-4 hover:border-accent/50 transition-all flex flex-col justify-between shadow-xs"
                >
                  <div className="space-y-2.5">
                    {/* Header badge & title */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                          issue.severity === 'high' 
                            ? 'bg-red-500/15 text-[var(--danger)] border border-red-500/30' 
                            : issue.severity === 'medium'
                            ? 'bg-amber-500/15 text-[var(--warning)] border border-amber-500/30'
                            : 'bg-sky-500/15 text-[var(--info)] border border-sky-500/30'
                        }`}>
                          {issue.severity} Priority
                        </span>
                        <span className="text-[10px] text-muted font-mono">
                          Target: <strong className="text-primary">[{issue.column}]</strong>
                        </span>
                      </div>
                      <span className="text-[10px] text-muted font-mono">
                        {issue.affectedCount} Affected
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-primary uppercase">
                      {issue.title}
                    </h3>

                    <p className="text-xs text-secondary leading-relaxed">
                      {issue.description}
                    </p>

                    <div className="p-2.5 rounded-xl bg-elevated border border-subtle text-xs space-y-1">
                      <span className="text-[10px] text-muted uppercase font-mono block">Why Fix This?</span>
                      <p className="text-secondary text-[11px]">{issue.recommendedAction}</p>
                    </div>
                  </div>

                  {/* Fix Action Button */}
                  <div className="pt-3 border-t border-subtle flex items-center justify-between">
                    <span className="text-[10px] text-muted font-mono uppercase">
                      Operation: {issue.suggestedActionType.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => handleFixIssue(issue)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer"
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
        <div className="bg-card border border-subtle rounded-2xl p-4 sm:p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary uppercase flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-accent" />
              DATA ANALYST DATA CLEANING PLAYBOOK & CHECKLIST
            </h2>
            <p className="text-xs text-secondary">
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
                  className="bg-elevated border border-subtle rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedChecklist(isExpanded ? null : idx)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-card-hover transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-heading text-sm sm:text-base font-bold text-primary uppercase">{guide.step}</h4>
                        <p className="text-xs text-secondary">{guide.summary}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-subtle space-y-2 text-xs text-secondary">
                      <p className="leading-relaxed">{guide.details}</p>
                      <div className="p-2.5 rounded-lg bg-accent-soft text-accent font-mono text-[11px] flex items-center gap-2 border border-accent/30">
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
        <div className="bg-card border border-subtle rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-primary uppercase flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                BEFORE VS AFTER DATA TRANSFORMATION DIFF
              </h2>
              <p className="text-xs text-secondary">
                Compare uncleaned raw ingestion records against your active cleaned dataset.
              </p>
            </div>

            <div className="flex items-center bg-elevated p-1 rounded-xl border border-subtle text-xs">
              <button
                onClick={() => setDiffViewMode('cleaned')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  diffViewMode === 'cleaned' ? 'bg-sky-600 text-white' : 'text-secondary hover:text-primary'
                }`}
              >
                Cleaned Data ({cleanRows.length} rows)
              </button>
              <button
                onClick={() => setDiffViewMode('raw')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  diffViewMode === 'raw' ? 'bg-sky-600 text-white' : 'text-secondary hover:text-primary'
                }`}
              >
                Original Raw ({rawRows.length} rows)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-subtle max-h-96">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-elevated text-secondary border-b border-subtle sticky top-0 z-10">
                <tr>
                  <th className="p-3">#</th>
                  {columns.map(c => (
                    <th key={c.name} className="p-3 whitespace-nowrap">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {(diffViewMode === 'cleaned' ? cleanRows : rawRows).slice(0, 20).map((row, idx) => (
                  <tr key={idx} className="hover:bg-card-hover transition-colors">
                    <td className="p-3 text-muted font-bold">{idx + 1}</td>
                    {columns.map(c => {
                      const val = row[c.name];
                      const isNull = val === null || val === undefined || val === '';
                      return (
                        <td key={c.name} className="p-3 whitespace-nowrap">
                          {isNull ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-[var(--danger)] text-[10px] font-bold">
                              NULL
                            </span>
                          ) : (
                            <span className="text-primary">{String(val)}</span>
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
          <div className="lg:col-span-2 bg-card border border-subtle rounded-2xl p-5 sm:p-6 space-y-5">
            <h2 className="font-heading text-lg sm:text-xl font-bold text-primary uppercase">
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
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedAction === act.id 
                      ? 'bg-accent-soft border-accent text-accent font-bold' 
                      : 'bg-elevated border-subtle text-secondary hover:text-primary hover:bg-card-hover'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>

            {/* Form controls */}
            <div className="p-4 sm:p-5 rounded-xl bg-elevated border border-subtle space-y-4 text-xs">
              {selectedAction !== 'remove_duplicates' && selectedAction !== 'calculated_column' && (
                <div className="space-y-1.5">
                  <label className="text-secondary font-medium">Target Column</label>
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    className="w-full bg-input text-primary p-2.5 rounded-lg border border-subtle focus:border-accent focus:outline-none"
                  >
                    {columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name} ({c.dataType})</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedAction === 'rename_column' && (
                <div className="space-y-1.5">
                  <label className="text-secondary font-medium">New Column Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Clean_Revenue_USD"
                    value={paramNewName}
                    onChange={(e) => setParamNewName(e.target.value)}
                    className="w-full bg-input text-primary p-2.5 rounded-lg border border-subtle focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              {selectedAction === 'change_type' && (
                <div className="space-y-1.5">
                  <label className="text-secondary font-medium">Target Type</label>
                  <select
                    value={paramType}
                    onChange={(e) => setParamType(e.target.value as DataType)}
                    className="w-full bg-input text-primary p-2.5 rounded-lg border border-subtle focus:border-accent focus:outline-none"
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
                  <label className="text-secondary font-medium">Missing Value Imputation Strategy</label>
                  <select
                    value={paramFillMethod}
                    onChange={(e) => setParamFillMethod(e.target.value as any)}
                    className="w-full bg-input text-primary p-2.5 rounded-lg border border-subtle focus:border-accent focus:outline-none"
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
                  <label className="text-secondary font-medium">Casing Target</label>
                  <select
                    value={paramTextFormat}
                    onChange={(e) => setParamTextFormat(e.target.value as any)}
                    className="w-full bg-input text-primary p-2.5 rounded-lg border border-subtle focus:border-accent focus:outline-none"
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
                    <label className="text-secondary font-medium">New Column Name</label>
                    <input
                      type="text"
                      placeholder="e.g. NetProfitMargin"
                      value={paramCalcName}
                      onChange={(e) => setParamCalcName(e.target.value)}
                      className="w-full bg-input text-primary p-2.5 rounded-lg border border-subtle focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-secondary font-medium">Formula Expression</label>
                    <input
                      type="text"
                      placeholder="e.g. [GrossRevenue] - [EstimatedCost]"
                      value={paramCalcExpr}
                      onChange={(e) => setParamCalcExpr(e.target.value)}
                      className="w-full bg-input text-accent font-mono p-2.5 rounded-lg border border-subtle focus:border-accent focus:outline-none"
                    />
                    <span className="text-[10px] text-muted">Wrap column names in brackets like [Revenue] * 0.15</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleApplyManual}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all shadow-md shadow-sky-600/20 cursor-pointer"
              >
                Apply Transformation
              </button>
            </div>
          </div>

          {/* Right: Audit Trail */}
          <div className="bg-card border border-subtle rounded-2xl p-5 space-y-4">
            <h3 className="font-heading text-lg font-bold text-primary uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              TRANSFORMATION AUDIT TRAIL ({transformations.length})
            </h3>

            {transformations.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted bg-elevated rounded-xl border border-subtle">
                No transformations applied yet. Dataset matches original raw state.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {transformations.map((step, idx) => (
                  <div 
                    key={step.id} 
                    className="p-3 rounded-xl bg-elevated border border-subtle space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                      <span>Step #{idx + 1}</span>
                      <span>{step.timestamp.split('T')[1]?.split('.')[0] || step.timestamp}</span>
                    </div>
                    <div className="font-medium text-primary">{step.description}</div>
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
