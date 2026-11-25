import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ArrowRight,
  Database,
  Table2,
  Key,
  Calendar,
  Hash,
  Type,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { DEMO_DATASETS } from '../../data/demoDatasets';
import { loadFeatureFlags, FeatureFlags } from '../../config/features';
import { ColumnMappingModal } from '../common/ColumnMappingModal';
import { PageHeader } from '../common/PageHeader';
import type { PackDetectionMatch, AnalyticsPackConfig } from '../../analytics';

export const UploadIngestionView: React.FC = () => {
  const { 
    ingestFile, 
    loadDemoDataset, 
    isProcessing, 
    pipelineStep, 
    error,
    project,
    columns,
    cleanRows,
    detectedTypes,
    setCurrentTab,
    themeMode,
    activePackId,
    setActivePackId
  } = usePlatform();

  const isLight = themeMode === 'light';
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const [detectedPacks, setDetectedPacks] = useState<PackDetectionMatch[]>([]);
  const [allPacks, setAllPacks] = useState<AnalyticsPackConfig[]>([]);
  const [isPackMappingOpen, setIsPackMappingOpen] = useState(false);
  const [activePackRoles, setActivePackRoles] = useState<{ value: string; label: string; required?: boolean }[]>([]);
  const [activePackRoleMap, setActivePackRoleMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleFlags = (e: any) => setFlags(e.detail || loadFeatureFlags());
    window.addEventListener('dataanalytix:features-updated', handleFlags);
    return () => window.removeEventListener('dataanalytix:features-updated', handleFlags);
  }, []);

  React.useEffect(() => {
    if (!flags.analyticsPacks || columns.length === 0) {
      setDetectedPacks([]);
      return;
    }
    let cancelled = false;
    import('../../analytics').then(mod => {
      if (cancelled) return;
      const matches = mod.detectPack({ columns, rows: cleanRows });
      setDetectedPacks(matches);
      setAllPacks(mod.ANALYTICS_PACKS);
      const topId = matches[0]?.packId || activePackId;
      if (matches[0] && matches[0].confidence >= 40) {
        setActivePackId(topId);
      }
      const packObj = mod.getPackById(topId);
      const dsId = project?.id || project?.name || 'default';
      const persisted = mod.getPersistedPackRoleMap(dsId, packObj.id);
      const mapped = mod.mapRoles({ columns, rows: cleanRows, datasetId: dsId }, packObj, persisted);
      setActivePackRoleMap(mapped);
      const reqSet = new Set(packObj.detect.requiredRoles);
      setActivePackRoles(
        Object.entries(packObj.roles).map(([roleKey, roleDef]) => ({
          value: roleKey,
          label: roleDef.description || `${roleKey} (${roleDef.aliases.slice(0, 2).join(', ')})`,
          required: reqSet.has(roleKey),
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [flags.analyticsPacks, columns, cleanRows]);

  const handlePackSelectChange = (newPackId: string) => {
    setActivePackId(newPackId);
    import('../../analytics').then(mod => {
      const packObj = mod.getPackById(newPackId);
      const dsId = project?.id || project?.name || 'default';
      const persisted = mod.getPersistedPackRoleMap(dsId, packObj.id);
      const mapped = mod.mapRoles({ columns, rows: cleanRows, datasetId: dsId }, packObj, persisted);
      setActivePackRoleMap(mapped);
      const reqSet = new Set(packObj.detect.requiredRoles);
      setActivePackRoles(
        Object.entries(packObj.roles).map(([roleKey, roleDef]) => ({
          value: roleKey,
          label: roleDef.description || `${roleKey} (${roleDef.aliases.slice(0, 2).join(', ')})`,
          required: reqSet.has(roleKey),
        }))
      );
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
  };

  const executeAnalysis = () => {
    if (selectedFile) {
      ingestFile(selectedFile);
    }
  };

  const inferColumnRole = (col: typeof columns[0]): string => {
    if (roleOverrides[col.name]) return roleOverrides[col.name];
    if (col.isPrimaryKeyCandidate || /id$|_id|^id/i.test(col.name)) return 'Identifier / Key';
    if (col.dataType === 'date' || /date|time|month|year|period/i.test(col.name)) return 'Time Dimension';
    if (col.dataType === 'number') {
      if (/rev|sales|amount|price|profit|margin|cost|mrr|arr/i.test(col.name)) return 'Financial Metric';
      return 'Quantitative Measure';
    }
    return 'Categorical Dimension';
  };

  const activeStep = isProcessing ? 2 : columns.length > 0 ? 3 : 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-fadeIn">
      {/* Shared PageHeader (Design System v3) or Classic Centered Header */}
      {flags.designSystemV3 ? (
        <PageHeader
          pageId="upload"
          primaryAction={{
            label: 'Browse Local File',
            onClick: () => fileInputRef.current?.click(),
            icon: UploadCloud,
            testId: 'upload-header-browse-btn',
          }}
          secondaryActions={[
            {
              label: 'Live Database Connector',
              onClick: () => setCurrentTab('live_connector'),
              icon: Database,
            },
            {
              label: 'Explore Analytics Packs',
              onClick: () => setCurrentTab('analytics_packs'),
              icon: Layers,
            },
          ]}
        />
      ) : (
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight uppercase text-primary">
              INGEST &amp; ANALYZE BUSINESS DATA
            </h1>
            <p className={`text-sm max-w-xl mx-auto ${isLight ? 'text-muted' : 'text-secondary'}`}>
              Upload your raw file or connect directly to any live database server. The engine validates structure, maps column roles, models star schemas, and compiles dashboards.
            </p>
          </div>
        </div>
      )}

      {/* 3-Step Workflow Stepper & Ingestion Mode Switcher */}
      <div className="flex flex-col min-[1400px]:flex-row items-stretch min-[1400px]:items-center justify-between gap-3">
        <ol className="grid grid-cols-3 gap-2 sm:gap-3 p-2 rounded-2xl border bg-card border-subtle shadow-xs flex-1">
          {[
            { step: 1, title: 'Select Source', sub: 'CSV, XLSX or Demo' },
            { step: 2, title: 'Map Column Roles', sub: 'Types & Grain' },
            { step: 3, title: 'Ready for BI', sub: `${cleanRows.length.toLocaleString()} rows active` }
          ].map((item) => {
            const isCompleted = activeStep > item.step;
            const isCurrent = activeStep === item.step;
            return (
              <li
                key={item.step}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                  isCurrent
                    ? isLight
                      ? 'bg-teal-50 border border-teal-200 text-teal-900'
                      : 'bg-teal-500/10 border border-teal-500/30 text-teal-300'
                    : isCompleted
                    ? isLight
                      ? 'bg-elevated text-muted'
                      : 'bg-card text-secondary'
                    : isLight
                    ? 'text-secondary'
                    : 'text-muted'
                }`}
              >
                <span className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-teal-500 text-primary'
                    : isCompleted
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                    : isLight
                    ? 'bg-input text-muted'
                    : 'bg-elevated text-secondary'
                }`}>
                  {isCompleted ? '✓' : item.step}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate" title={item.title}>{item.title}</div>
                  <div className="text-xs font-mono opacity-80 truncate hidden sm:block" title={item.sub}>{item.sub}</div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Ingestion Mode Switcher */}
        <div className="inline-flex p-1 rounded-2xl border gap-1 shadow-xs bg-elevated border-subtle self-start min-[1400px]:self-auto shrink-0">
          <button
            type="button"
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all bg-accent text-on-accent shadow-xs flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Local File Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('live_connector')}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer text-secondary hover:text-primary hover:bg-card"
          >
            <Database className="w-4 h-4 text-accent" />
            <span>Live Database Connector</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent-soft text-accent border border-subtle">
              Live
            </span>
          </button>
        </div>
      </div>

      {/* Dashed Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`depth-card border-2 border-dashed rounded-[20px] p-8 sm:p-10 text-center transition-all ${
          dragActive
            ? 'border-accent bg-accent-soft shadow-lg'
            : 'bg-card border-strong hover:border-accent shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json,.txt"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto shadow-lg">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-heading text-xl font-bold text-primary">
              {flags.designSystemV3
                ? 'Drag & Drop Raw Spreadsheet or Data File'
                : 'DRAG & DROP RAW SPREADSHEET OR FILE'}
            </h3>
            <p className={`text-sm ${isLight ? 'text-muted' : 'text-secondary'}`}>
              Supports CSV, Microsoft Excel (.xlsx, .xls), JSON, and Delimited TXT
            </p>
            <div className="flex items-center justify-center gap-2 pt-1 font-mono text-xs">
              {['.CSV', '.XLSX', '.XLS', '.JSON'].map(ext => (
                <span
                  key={ext}
                  className={`px-2 py-0.5 rounded border ${
                    isLight ? 'bg-elevated border-subtle text-muted' : 'bg-card border-subtle text-secondary'
                  }`}
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer bg-elevated hover:bg-input text-primary border-subtle"
          >
            Browse Local Machine
          </button>
        </div>
      </div>

      {/* Selected File Stage & Analyze Action */}
      {selectedFile && (
        <div className="depth-card p-5 rounded-[20px] bg-card border border-subtle space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary">{selectedFile.name}</h4>
                <p className="text-xs text-secondary font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Type: {selectedFile.type || 'Standard Flat File'}
                </p>
              </div>
            </div>

            <button
              onClick={executeAnalysis}
              disabled={isProcessing}
              className="min-h-[44px] px-6 py-3 rounded-xl bg-accent hover:opacity-95 text-on-accent font-heading text-sm font-bold tracking-wide transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Analyze My Data</span>
                </>
              )}
            </button>
          </div>

          {isProcessing && (
            <div className="pt-3 border-t border-subtle text-xs font-mono text-accent flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
              {pipelineStep}
            </div>
          )}

          {error && (
            <div className="pt-3 border-t border-subtle text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Post-Upload Analytics Pack Detection Banner — Redesigned Full-Width Card (Phase 3.4) */}
      {flags.analyticsPacks && columns.length > 0 && detectedPacks.length > 0 && (() => {
        const topMatch = detectedPacks[0];
        const isUncertain = topMatch.isUncertain || topMatch.confidence < 60;
        const topPackObj = allPacks.find(p => p.id === topMatch.packId);
        const topAccent = isUncertain
          ? 'var(--warning)'
          : (topPackObj as any)?.theme?.gradientFrom || 'var(--accent)';
        const ringRadius = 22;
        const ringCircumference = 2 * Math.PI * ringRadius;
        const ringOffset = ringCircumference - (Math.min(100, Math.max(0, topMatch.confidence)) / 100) * ringCircumference;

        return (
          <div
            data-testid="upload-pack-detection-banner"
            style={
              flags.depthUI
                ? ({
                    '--pack-from': topAccent,
                    '--pack-to': (topPackObj as any)?.theme?.gradientTo || 'var(--accent-2)',
                  } as React.CSSProperties)
                : undefined
            }
            className="depth-card pack-insight-banner w-full rounded-[20px] p-5 sm:p-6 border bg-card border-subtle shadow-sm space-y-5"
          >
            {/* Top Row: Gauge + Full-Width Headline + Action Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90" aria-hidden="true">
                    <circle
                      cx="28"
                      cy="28"
                      r={ringRadius}
                      fill="none"
                      stroke="var(--border-subtle)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r={ringRadius}
                      fill="none"
                      stroke={topAccent}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                    />
                  </svg>
                  <span
                    className="absolute text-xs font-mono tabular-nums font-bold"
                    style={{ color: topAccent }}
                  >
                    {topMatch.confidence}%
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-secondary font-mono">
                    <span className="font-semibold" style={{ color: topAccent }}>
                      {isUncertain ? 'Low Schema Confidence (<60%)' : 'Recommended for your data'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{columns.length} columns analyzed across {cleanRows.length.toLocaleString()} rows</span>
                  </div>
                  <h3 className="font-heading text-lg sm:text-xl font-bold text-primary leading-snug">
                    {isUncertain
                      ? `Not sure, pick one — closest match is ${topMatch.packName} (${topMatch.confidence}%)`
                      : `Best Match: ${topMatch.packName} (${topMatch.confidence}% schema match)`}
                  </h3>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <label className="sr-only" htmlFor="upload-change-pack-select">
                  Change pack
                </label>
                <select
                  id="upload-change-pack-select"
                  aria-label="Change pack"
                  data-testid="upload-change-pack-select"
                  value={activePackId}
                  onChange={e => handlePackSelectChange(e.target.value)}
                  className="min-h-[44px] rounded-xl bg-elevated border border-subtle px-3 py-1.5 text-xs font-semibold text-primary focus:outline-hidden cursor-pointer"
                >
                  {allPacks.map(p => (
                    <option key={p.id} value={p.id}>
                      Change pack: {p.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  data-testid="upload-map-columns-btn"
                  onClick={() => setIsPackMappingOpen(true)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-semibold text-primary flex items-center gap-1.5 cursor-pointer transition-colors pack-btn-press"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
                  <span>Map columns</span>
                </button>

                <button
                  type="button"
                  data-testid="upload-open-pack-btn"
                  onClick={() => {
                    if (!isUncertain && topMatch.packId) {
                      setActivePackId(topMatch.packId);
                    }
                    setCurrentTab('analytics_packs');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer transition-opacity pack-btn-press"
                >
                  <span>{isUncertain ? 'Browse Packs' : `Use ${topMatch.packName}`}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Full-Width 3-Column Recommended Pack Cards */}
            <div
              data-testid="upload-top-pack-matches-grid"
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-subtle"
            >
              {detectedPacks.slice(0, 3).map((match, idx) => {
                const matchPack = allPacks.find(p => p.id === match.packId) as any;
                const barColor =
                  match.confidence < 60
                    ? 'var(--warning)'
                    : matchPack?.theme?.gradientFrom || 'var(--accent)';
                const isSelectedPack = activePackId === match.packId;
                return (
                  <button
                    key={match.packId}
                    type="button"
                    onClick={() => handlePackSelectChange(match.packId)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelectedPack
                        ? 'bg-elevated border-strong shadow-xs'
                        : 'bg-input/70 border-subtle hover:bg-elevated'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-xs font-mono text-muted block">
                          Rank #{idx + 1}
                        </span>
                        <span className="text-sm font-bold text-primary block leading-snug">
                          {match.packName}
                        </span>
                      </div>
                      <span
                        className="text-xs font-mono tabular-nums font-bold px-2 py-0.5 rounded-md bg-card border border-subtle shrink-0"
                        style={{ color: barColor }}
                      >
                        {match.confidence}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-card overflow-hidden border border-subtle">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(8, match.confidence)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Column-Role Mapping & Schema Inspection Table */}
      {columns.length > 0 && (
        <div className="depth-card rounded-[20px] border bg-card border-subtle shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-subtle bg-elevated flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Table2 className="w-4 h-4 text-teal-500 dark:text-teal-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <h3
                  title={project.name}
                  aria-label={project.name}
                  className={`font-heading text-sm font-bold uppercase tracking-wide line-clamp-2 [overflow-wrap:anywhere] ${
                    isLight ? 'text-primary' : 'text-primary'
                  }`}
                >
                  COLUMN-ROLE SCHEMA TABLE ({project.name})
                </h3>
                <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>
                  {columns.length} columns profiled across {cleanRows.length.toLocaleString()} clean records
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('executive_dashboard')}
              className="px-3.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-600 dark:text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>Open Executive Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto no-depth-3d">
            <table className="w-full text-left border-collapse no-depth-3d">
              <thead>
                <tr className={`border-b font-mono text-[11px] uppercase tracking-wider ${
                  isLight ? 'bg-elevated text-muted border-slate-200' : 'bg-card text-secondary border-slate-800'
                }`}>
                  <th className="py-2.5 px-4">Column Name</th>
                  <th className="py-2.5 px-4">Detected Type</th>
                  <th className="py-2.5 px-4">Analytical Role</th>
                  <th className="py-2.5 px-4 text-right">Completeness</th>
                  <th className="py-2.5 px-4 text-right">Distinct</th>
                  <th className="py-2.5 px-4">Sample Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70 text-xs font-mono">
                {columns.map((col) => {
                  const role = inferColumnRole(col);
                  const completeness = Math.max(0, Math.min(100, Math.round(100 - (col.nullPercentage || 0))));
                  const sampleVal = cleanRows[0]?.[col.name];
                  return (
                    <tr
                      key={col.name}
                      className={isLight ? 'hover:bg-elevated' : 'hover:bg-card'}
                    >
                      <td className={`py-2.5 px-4 font-semibold flex items-center gap-2 ${
                        isLight ? 'text-primary' : 'text-primary'
                      }`}>
                        {col.dataType === 'number' ? (
                          <Hash className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        ) : col.dataType === 'date' ? (
                          <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        ) : col.isPrimaryKeyCandidate ? (
                          <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Type className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        )}
                        <span>{col.name}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          col.dataType === 'number'
                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-500/25'
                            : col.dataType === 'date'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/25'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/25'
                        }`}>
                          {col.dataType}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        <select
                          aria-label={`Role for ${col.name}`}
                          value={role}
                          onChange={(e) => setRoleOverrides(prev => ({ ...prev, [col.name]: e.target.value }))}
                          className={`text-xs rounded-lg px-2 py-1 border focus:outline-none cursor-pointer ${
                            isLight
                              ? 'bg-elevated border-slate-200 text-primary'
                              : 'bg-card border-slate-700 text-primary'
                          }`}
                        >
                          <option value="Identifier / Key">Identifier / Key</option>
                          <option value="Time Dimension">Time Dimension</option>
                          <option value="Financial Metric">Financial Metric</option>
                          <option value="Quantitative Measure">Quantitative Measure</option>
                          <option value="Categorical Dimension">Categorical Dimension</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        <span className={completeness >= 98 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                          {completeness}%
                        </span>
                      </td>
                      <td className={`py-2.5 px-4 text-right tabular-nums ${isLight ? 'text-muted' : 'text-secondary'}`}>
                        {(col.distinctCount || 0).toLocaleString()}
                      </td>
                      <td className={`py-2.5 px-4 truncate max-w-[160px] ${isLight ? 'text-muted' : 'text-secondary'}`}>
                        {sampleVal !== undefined && sampleVal !== null ? String(sampleVal) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Curated Benchmark Templates */}
      <div className={`space-y-4 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`font-heading text-xl font-bold tracking-wide uppercase ${
            isLight ? 'text-primary' : 'text-primary'
          }`}>
            CURATED INDUSTRY BENCHMARK DATASETS
          </h3>
          <span className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border ${
            isLight 
              ? 'text-sky-800 bg-sky-50 border-sky-300' 
              : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
          }`}>
            Instant Analytical Templates
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_DATASETS.map(demo => (
            <div
              key={demo.id}
              className="depth-card p-5 rounded-[20px] border bg-card border-subtle hover:border-accent/50 space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono ${isLight ? 'text-muted' : 'text-secondary'}`}>{demo.category}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  isLight 
                    ? 'text-teal-800 bg-teal-50 border-teal-200' 
                    : 'text-teal-400 bg-teal-500/10 border-teal-500/20'
                }`}>
                  Ready to Analyze
                </span>
              </div>

              <h4 className={`font-heading text-lg font-bold ${isLight ? 'text-primary' : 'text-primary'}`}>{demo.name}</h4>
              <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>{demo.description}</p>

              <div className="pt-2 flex items-center justify-between">
                <span className={`text-xs font-mono ${isLight ? 'text-muted' : 'text-muted'}`}>{demo.rowsCount} records</span>
                <button
                  onClick={() => {
                    loadDemoDataset(demo.id);
                    setCurrentTab('executive_dashboard');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isLight 
                      ? 'bg-elevated hover:bg-teal-50 text-teal-800 border-slate-300 hover:border-teal-500' 
                      : 'bg-card hover:bg-elevated text-primary border-slate-700 hover:border-teal-400'
                  }`}
                >
                  <span>Load Benchmark</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {flags.analyticsPacks && (
        <ColumnMappingModal
          isOpen={isPackMappingOpen}
          columns={columns.map(c => c.name)}
          detectedTypes={detectedTypes}
          packRoles={activePackRoles}
          initialMapping={activePackRoleMap}
          packName={allPacks.find(p => p.id === activePackId)?.name || 'Analytics Pack'}
          onCancel={() => setIsPackMappingOpen(false)}
          onConfirm={customMap => {
            const dsId = project?.id || project?.name || 'default';
            import('../../analytics').then(mod => {
              mod.savePersistedPackRoleMap(dsId, activePackId, customMap);
              setActivePackRoleMap(customMap);
            });
            setIsPackMappingOpen(false);
          }}
        />
      )}
    </div>
  );
};
