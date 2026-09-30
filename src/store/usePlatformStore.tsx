import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  ColumnProfile, 
  DataModel, 
  DataQualityReport, 
  DAXMeasure, 
  KPI, 
  ProjectMetadata, 
  TransformationStep, 
  VisualConfig, 
  BrandConfig,
  AIInsight,
  DataType,
  DrillThroughBreadcrumb,
  DrillThroughState
} from '../types';
import { inferTypes, castRows, parseFile } from '../engine/dataParser';
import { profileDataset } from '../engine/dataProfiler';
import { evaluateDataQuality } from '../engine/dataQuality';
import { applyTransformation, replayTransformations } from '../engine/transformationEngine';
import { buildDataModel } from '../engine/dataModeler';
import { computeAnalytics, AnalyticsSummary } from '../engine/analyticsEngine';
import { generateDAXMeasures } from '../engine/daxEngine';
import { registerTablesInSQL } from '../engine/sqlEngine';
import { DEMO_DATASETS, DemoDatasetInfo } from '../data/demoDatasets';

export type NavigationTab = 
  | 'landing'
  | 'executive_dashboard'
  | 'upload'
  | 'live_connector'
  | 'preview'
  | 'quality'
  | 'cleaning'
  | 'modeling'
  | 'analysis'
  | 'dax_lab'
  | 'sql_lab'
  | 'python_lab'
  | 'dashboard_builder'
  | 'ai_insights'
  | 'reports'
  | 'data_dictionary'
  | 'export_center'
  | 'how_to_modify'
  | 'settings'
  | 'blog';

export interface LiveConnectionState {
  isConnected: boolean;
  serverType: string;
  host: string;
  port: number | string;
  database: string;
  tableName: string;
  autoRefreshInterval: number; // in seconds (0 = manual)
  lastSynced: string | null;
  fetchCount: number;
  isSyncing: boolean;
  queryExecuted?: string;
}

export interface GlobalFilterState {
  dateRange: { start?: string; end?: string };
  selectedDimension: string | null;
  selectedDimensionValue: string | null;
  searchQuery: string;
}

export interface PlatformContextType {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isPresentationMode: boolean;
  setIsPresentationMode: (mode: boolean) => void;

  // Dark & Light Mode Theme
  themeMode: 'dark' | 'light';
  setThemeMode: (mode: 'dark' | 'light') => void;
  toggleThemeMode: () => void;

  // Project state
  project: ProjectMetadata;
  brand: BrandConfig;
  setBrand: (b: BrandConfig) => void;
  updateProjectMetadata: (updates: Partial<ProjectMetadata>) => void;

  // Data state
  rawRows: Record<string, any>[];
  cleanRows: Record<string, any>[];
  columns: ColumnProfile[];
  detectedTypes: Record<string, DataType>;
  qualityReport: DataQualityReport;
  transformations: TransformationStep[];
  dataModel: DataModel;
  analytics: AnalyticsSummary;
  daxMeasures: DAXMeasure[];

  // Global filters
  filters: GlobalFilterState;
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
  filteredRows: Record<string, any>[];

  // Pipeline processing
  isProcessing: boolean;
  pipelineStep: string;
  error: string | null;

  // Live Data & Database Server Connection
  liveConnection: LiveConnectionState;
  setLiveConnection: React.Dispatch<React.SetStateAction<LiveConnectionState>>;
  syncLiveStream: () => Promise<void>;
  ingestDatasetFromRows: (sourceName: string, rows: Record<string, any>[], metadata?: { connectionType?: string; serverHost?: string; database?: string; queryExecuted?: string }) => void;
  applyCleanedRows: (newRows: Record<string, any>[], sourceLabel: 'SQL' | 'PYTHON' | 'MANUAL', details?: string) => void;

  // Actions
  ingestFile: (file: File) => Promise<void>;
  loadDemoDataset: (demoId: string) => void;
  runAnalysisPipeline: () => void;
  addTransformation: (step: Omit<TransformationStep, 'id' | 'timestamp'>) => void;
  undoTransformation: () => void;
  resetToRaw: () => void;
  customVisuals: VisualConfig[];
  setCustomVisuals: React.Dispatch<React.SetStateAction<VisualConfig[]>>;
  addCustomVisual: (visual: VisualConfig) => void;
  removeCustomVisual: (id: string) => void;
  auditLogs: { timestamp: string; action: string; details: string }[];

  // Drill-Through Granular Inspection & Breadcrumbs
  drillThrough: DrillThroughState;
  openDrillThrough: (params: {
    title: string;
    subtitle?: string;
    kpi?: KPI;
    filterColumn?: string;
    filterValue?: any;
    sourceContext?: DrillThroughState['sourceContext'];
  }) => void;
  drillDeeper: (step: {
    label: string;
    filterColumn: string;
    filterValue: any;
    subLabel?: string;
  }) => void;
  navigateBreadcrumb: (index: number) => void;
  closeDrillThrough: () => void;
  applyDrillThroughFilter: () => void;
}

const defaultBrand: BrandConfig = {
  companyName: 'Acme Enterprise Holdings',
  tagline: 'Autonomous AI Data Intelligence & Performance Center',
  department: 'Strategic Analytics & BI',
  author: 'Lead Data Analyst',
  themeColor: '#21F1A8',
  backgroundColor: '#171717',
  accentColor: '#00D8F6'
};

const defaultProject: ProjectMetadata = {
  id: 'proj-001',
  name: 'Global Enterprise Omnichannel Sales',
  companyName: 'Acme Enterprise Holdings',
  department: 'Strategic Analytics & BI',
  author: 'Lead Data Analyst',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDemo: false,
  version: 'v1.0.0',
  dataQualityScore: 96,
  rowCount: 120,
  columnCount: 12,
  sourceFileName: 'global_retail_sales_dataset.csv'
};

const PlatformContext = createContext<PlatformContextType | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('executive_dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  // Theme mode: 'dark' or 'light'
  const [themeMode, setThemeModeState] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexusbi_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const setThemeMode = (mode: 'dark' | 'light') => {
    setThemeModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexusbi_theme', mode);
      if (mode === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.classList.add('theme-dark');
      }
    }
  };

  const toggleThemeMode = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (themeMode === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.classList.add('theme-dark');
      }
    }
  }, [themeMode]);

  const [project, setProject] = useState<ProjectMetadata>(defaultProject);
  const [brand, setBrand] = useState<BrandConfig>(defaultBrand);

  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [cleanRows, setCleanRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<ColumnProfile[]>([]);
  const [detectedTypes, setDetectedTypes] = useState<Record<string, DataType>>({});
  const [qualityReport, setQualityReport] = useState<DataQualityReport>({
    overallScore: 100,
    completenessScore: 100,
    uniquenessScore: 100,
    validityScore: 100,
    consistencyScore: 100,
    totalIssuesCount: 0,
    issues: []
  });
  const [transformations, setTransformations] = useState<TransformationStep[]>([]);
  const [dataModel, setDataModel] = useState<DataModel>({ tables: [], relationships: [], schemaType: 'flat', validationWarnings: [] });
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    kpis: [],
    trends: [],
    anomalies: [],
    opportunities: [],
    forecasts: {},
    insights: [],
    visuals: [],
    correlationMatrix: [],
    categoryPerformance: {}
  });
  const [daxMeasures, setDaxMeasures] = useState<DAXMeasure[]>([]);
  const [customVisuals, setCustomVisuals] = useState<VisualConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<{ timestamp: string; action: string; details: string }[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<GlobalFilterState>({
    dateRange: {},
    selectedDimension: null,
    selectedDimensionValue: null,
    searchQuery: ''
  });

  // Live Data Connection State
  const [liveConnection, setLiveConnection] = useState<LiveConnectionState>({
    isConnected: false,
    serverType: 'postgres',
    host: '',
    port: 5432,
    database: '',
    tableName: '',
    autoRefreshInterval: 0,
    lastSynced: null,
    fetchCount: 0,
    isSyncing: false
  });

  // Auto-polling live stream effect
  useEffect(() => {
    if (!liveConnection.isConnected || !liveConnection.autoRefreshInterval || liveConnection.autoRefreshInterval <= 0) {
      return;
    }
    const timer = setInterval(() => {
      syncLiveStream();
    }, liveConnection.autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [liveConnection.isConnected, liveConnection.autoRefreshInterval, liveConnection.serverType, liveConnection.host, liveConnection.database, liveConnection.tableName]);

  // Load initial demo dataset on start
  useEffect(() => {
    loadDemoDataset('global-retail-sales');
  }, []);

  function logAction(action: string, details: string) {
    setAuditLogs(prev => [
      { timestamp: new Date().toLocaleTimeString(), action, details },
      ...prev.slice(0, 49)
    ]);
  }

  function loadDemoDataset(demoId: string) {
    const demo = DEMO_DATASETS.find(d => d.id === demoId) || DEMO_DATASETS[0];
    const demoRows = demo.generateData();
    const cols = Object.keys(demoRows[0]);
    const dTypes = inferTypes(cols, demoRows);
    const typed = castRows(demoRows, dTypes);

    setRawRows(typed);
    setCleanRows(typed);
    setDetectedTypes(dTypes);
    setTransformations([]);

    const prof = profileDataset(cols, typed, dTypes);
    setColumns(prof);

    const qual = evaluateDataQuality(prof, typed);
    setQualityReport(qual);

    const model = buildDataModel('FactSales', prof, typed);
    setDataModel(model);

    const anal = computeAnalytics(prof, typed, 'FactSales');
    setAnalytics(anal);
    setCustomVisuals(anal.visuals);

    const dax = generateDAXMeasures('FactSales', prof, model.tables);
    setDaxMeasures(dax);

    registerTablesInSQL([
      { name: 'FactSales', rows: typed },
      ...model.tables.filter(t => t.name !== 'FactSales').map(t => ({ name: t.name, rows: t.data }))
    ]);

    setProject({
      id: `demo-${demo.id}`,
      name: demo.name,
      companyName: 'Acme Enterprise Global',
      department: 'Retail Performance',
      author: 'AI BI Specialist',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false,
      version: 'v1.0.0',
      dataQualityScore: qual.overallScore,
      rowCount: typed.length,
      columnCount: cols.length,
      sourceFileName: demo.fileName
    });

    logAction('DEMO_LOADED', `Loaded demo dataset "${demo.name}" with ${typed.length} rows.`);
  }

  async function ingestFile(file: File) {
    setIsProcessing(true);
    setError(null);
    setPipelineStep('Ingesting & parsing raw bytes...');

    try {
      const parsed = await parseFile(file);
      setPipelineStep('Profiling column data types & distribution...');
      const prof = profileDataset(parsed.columns, parsed.rows, parsed.detectedTypes);

      setPipelineStep('Auditing data quality & completeness...');
      const qual = evaluateDataQuality(prof, parsed.rows);

      setPipelineStep('Constructing relational Star Schema data model...');
      const model = buildDataModel(parsed.tableName, prof, parsed.rows);

      setPipelineStep('Computing statistical KPIs, trends & anomaly vectors...');
      const anal = computeAnalytics(prof, parsed.rows, parsed.tableName);

      setPipelineStep('Synthesizing enterprise DAX & SQL schema bindings...');
      const dax = generateDAXMeasures(parsed.tableName, prof, model.tables);

      registerTablesInSQL([
        { name: parsed.tableName, rows: parsed.rows },
        ...model.tables.filter(t => t.name !== parsed.tableName).map(t => ({ name: t.name, rows: t.data }))
      ]);

      setRawRows(parsed.rows);
      setCleanRows(parsed.rows);
      setColumns(prof);
      setDetectedTypes(parsed.detectedTypes);
      setQualityReport(qual);
      setDataModel(model);
      setAnalytics(anal);
      setCustomVisuals(anal.visuals);
      setDaxMeasures(dax);
      setTransformations([]);

      setProject({
        id: `proj-${Date.now()}`,
        name: parsed.tableName.replace(/_/g, ' '),
        companyName: brand.companyName,
        department: brand.department,
        author: brand.author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: false, // REAL USER DATA (RULE 1, 9, 10)
        version: 'v1.0.0',
        dataQualityScore: qual.overallScore,
        rowCount: parsed.rows.length,
        columnCount: parsed.columns.length,
        sourceFileName: parsed.fileName
      });

      logAction('FILE_UPLOADED', `Uploaded user dataset: ${parsed.fileName} (${parsed.rows.length} rows, ${parsed.columns.length} columns).`);

      setPipelineStep('Analysis pipeline ready!');
      setCurrentTab('executive_dashboard');
    } catch (err: any) {
      console.error('Ingestion error:', err);
      setError(err?.message || 'Failed to ingest and analyze file.');
    } finally {
      setIsProcessing(false);
    }
  }

  function runAnalysisPipeline() {
    setIsProcessing(true);
    setPipelineStep('Re-analyzing active dataset state...');
    try {
      const tableName = dataModel.tables[0]?.name || 'FactTable';
      const prof = profileDataset(columns.map(c => c.name), cleanRows, detectedTypes);
      const qual = evaluateDataQuality(prof, cleanRows);
      const model = buildDataModel(tableName, prof, cleanRows);
      const anal = computeAnalytics(prof, cleanRows, tableName);
      const dax = generateDAXMeasures(tableName, prof, model.tables);

      setColumns(prof);
      setQualityReport(qual);
      setDataModel(model);
      setAnalytics(anal);
      setDaxMeasures(dax);

      registerTablesInSQL([
        { name: tableName, rows: cleanRows },
        ...model.tables.filter(t => t.name !== tableName).map(t => ({ name: t.name, rows: t.data }))
      ]);

      logAction('PIPELINE_RUN', 'Full analysis pipeline executed.');
      setCurrentTab('executive_dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete analysis pipeline.');
    } finally {
      setIsProcessing(false);
    }
  }

  function addTransformation(stepData: Omit<TransformationStep, 'id' | 'timestamp'>) {
    const newStep: TransformationStep = {
      ...stepData,
      id: `step-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString()
    };
    const updatedSteps = [...transformations, newStep];
    const newCleanRows = applyTransformation(cleanRows, newStep);

    setTransformations(updatedSteps);
    setCleanRows(newCleanRows);

    // Refresh profiling and quality on new clean rows
    const cols = Object.keys(newCleanRows[0] || {});
    const prof = profileDataset(cols, newCleanRows, detectedTypes);
    setColumns(prof);
    setQualityReport(evaluateDataQuality(prof, newCleanRows));

    // Register updated SQL table
    const tableName = dataModel.tables[0]?.name || 'FactTable';
    registerTablesInSQL([{ name: tableName, rows: newCleanRows }]);

    logAction('TRANSFORMATION_APPLIED', `${newStep.action}: ${newStep.description}`);
  }

  function undoTransformation() {
    if (transformations.length === 0) return;
    const remaining = transformations.slice(0, -1);
    const restored = replayTransformations(rawRows, remaining);

    setTransformations(remaining);
    setCleanRows(restored);

    const cols = Object.keys(restored[0] || {});
    const prof = profileDataset(cols, restored, detectedTypes);
    setColumns(prof);
    setQualityReport(evaluateDataQuality(prof, restored));

    const tableName = dataModel.tables[0]?.name || 'FactTable';
    registerTablesInSQL([{ name: tableName, rows: restored }]);

    logAction('TRANSFORMATION_UNDO', 'Reverted last transformation step.');
  }

  function resetToRaw() {
    setCleanRows(rawRows);
    setTransformations([]);
    const cols = Object.keys(rawRows[0] || {});
    const prof = profileDataset(cols, rawRows, detectedTypes);
    setColumns(prof);
    setQualityReport(evaluateDataQuality(prof, rawRows));
    const tableName = dataModel.tables[0]?.name || 'FactTable';
    registerTablesInSQL([{ name: tableName, rows: rawRows }]);
    logAction('TRANSFORMATION_RESET', 'Reset all transformations back to raw original data.');
  }

  function addCustomVisual(visual: VisualConfig) {
    setCustomVisuals(prev => [...prev, visual]);
  }

  function removeCustomVisual(id: string) {
    setCustomVisuals(prev => prev.filter(v => v.id !== id));
  }

  function updateProjectMetadata(updates: Partial<ProjectMetadata>) {
    setProject(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  }

  function ingestDatasetFromRows(
    sourceName: string, 
    rows: Record<string, any>[], 
    metadata?: { connectionType?: string; serverHost?: string; database?: string; queryExecuted?: string }
  ) {
    if (!rows || rows.length === 0) return;
    setIsProcessing(true);
    setPipelineStep(`Ingesting ${rows.length} records from ${sourceName}...`);

    try {
      const cols = Object.keys(rows[0] || {});
      const dTypes = inferTypes(cols, rows);
      const typed = castRows(rows, dTypes);

      const cleanTableName = sourceName.replace(/[^a-zA-Z0-9_]/g, '_') || 'FactLiveStream';
      const prof = profileDataset(cols, typed, dTypes);
      const qual = evaluateDataQuality(prof, typed);
      const model = buildDataModel(cleanTableName, prof, typed);
      const anal = computeAnalytics(prof, typed, cleanTableName);
      const dax = generateDAXMeasures(cleanTableName, prof, model.tables);

      registerTablesInSQL([
        { name: cleanTableName, rows: typed },
        ...model.tables.filter(t => t.name !== cleanTableName).map(t => ({ name: t.name, rows: t.data }))
      ]);

      setRawRows(typed);
      setCleanRows(typed);
      setColumns(prof);
      setDetectedTypes(dTypes);
      setQualityReport(qual);
      setDataModel(model);
      setAnalytics(anal);
      setCustomVisuals(anal.visuals);
      setDaxMeasures(dax);
      setTransformations([]);

      setProject({
        id: `live-${Date.now()}`,
        name: metadata?.database ? `${metadata.database} / ${sourceName}` : sourceName,
        companyName: brand.companyName,
        department: brand.department,
        author: brand.author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: false,
        version: 'v1.0.0',
        dataQualityScore: qual.overallScore,
        rowCount: typed.length,
        columnCount: cols.length,
        sourceFileName: `${sourceName} [${metadata?.connectionType?.toUpperCase() || 'LIVE'}]`
      });

      logAction('LIVE_DATA_INGESTED', `Connected & ingested ${typed.length} records from ${metadata?.serverHost || 'live server'} (${sourceName}).`);
    } catch (err: any) {
      console.error('Error ingesting dataset rows:', err);
      setError(err?.message || 'Failed to ingest dataset rows.');
    } finally {
      setIsProcessing(false);
    }
  }

  function applyCleanedRows(newRows: Record<string, any>[], sourceLabel: 'SQL' | 'PYTHON' | 'MANUAL', details?: string) {
    if (!newRows || newRows.length === 0) return;
    setIsProcessing(true);
    setPipelineStep(`Applying cleaned dataset from ${sourceLabel}...`);

    try {
      const cols = Object.keys(newRows[0] || {});
      const dTypes = inferTypes(cols, newRows);
      const typed = castRows(newRows, dTypes);

      const tableName = dataModel.tables[0]?.name || 'FactTable';
      const prof = profileDataset(cols, typed, dTypes);
      const qual = evaluateDataQuality(prof, typed);
      const model = buildDataModel(tableName, prof, typed);
      const anal = computeAnalytics(prof, typed, tableName);
      const dax = generateDAXMeasures(tableName, prof, model.tables);

      setCleanRows(typed);
      setColumns(prof);
      setDetectedTypes(dTypes);
      setQualityReport(qual);
      setDataModel(model);
      setAnalytics(anal);
      setCustomVisuals(anal.visuals);
      setDaxMeasures(dax);

      registerTablesInSQL([
        { name: tableName, rows: typed },
        ...model.tables.filter(t => t.name !== tableName).map(t => ({ name: t.name, rows: t.data }))
      ]);

      const newStep: TransformationStep = {
        id: `clean-${Date.now()}`,
        action: 'auto_clean_all',
        description: `[${sourceLabel}] ${details || `Cleaned dataset produced ${typed.length} validated rows across ${cols.length} fields.`}`,
        parameters: { source: sourceLabel, rowCount: typed.length },
        timestamp: new Date().toLocaleTimeString()
      };
      setTransformations(prev => [...prev, newStep]);

      setProject(prev => ({
        ...prev,
        rowCount: typed.length,
        columnCount: cols.length,
        dataQualityScore: qual.overallScore,
        updatedAt: new Date().toISOString()
      }));

      logAction('CLEANED_DATA_APPLIED', `Applied ${typed.length} cleaned rows via ${sourceLabel}.`);
    } catch (err: any) {
      console.error('Error applying cleaned rows:', err);
      setError(err?.message || 'Failed to apply cleaned dataset.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function syncLiveStream() {
    if (!liveConnection.host && !liveConnection.serverType) return;
    setLiveConnection(prev => ({ ...prev, isSyncing: true }));

    try {
      const res = await fetch('/api/live-data/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverType: liveConnection.serverType,
          host: liveConnection.host,
          port: liveConnection.port,
          database: liveConnection.database,
          tableName: liveConnection.tableName,
          query: liveConnection.queryExecuted,
          limit: 120
        })
      });

      if (!res.ok) throw new Error(`Live sync failed with status ${res.status}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.rows) && data.rows.length > 0) {
        const cols = Object.keys(data.rows[0] || {});
        const dTypes = inferTypes(cols, data.rows);
        const typed = castRows(data.rows, dTypes);

        const tableName = dataModel.tables[0]?.name || data.tableName || 'FactLiveStream';
        const prof = profileDataset(cols, typed, dTypes);
        const qual = evaluateDataQuality(prof, typed);
        const anal = computeAnalytics(prof, typed, tableName);

        setRawRows(typed);
        setCleanRows(typed);
        setColumns(prof);
        setQualityReport(qual);
        setAnalytics(anal);

        registerTablesInSQL([{ name: tableName, rows: typed }]);

        setLiveConnection(prev => ({
          ...prev,
          lastSynced: new Date().toLocaleTimeString(),
          fetchCount: prev.fetchCount + 1,
          isSyncing: false
        }));

        setProject(prev => ({
          ...prev,
          rowCount: typed.length,
          updatedAt: new Date().toISOString()
        }));

        logAction('LIVE_SYNC', `Synced ${typed.length} live records from ${liveConnection.serverType} (${liveConnection.tableName}).`);
      } else {
        setLiveConnection(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (err: any) {
      console.error('Live sync error:', err);
      setLiveConnection(prev => ({ ...prev, isSyncing: false }));
    }
  }

  // Drill-Through State
  const [drillThrough, setDrillThrough] = useState<DrillThroughState>({
    isOpen: false,
    title: '',
    subtitle: '',
    breadcrumbs: [],
    activeBreadcrumbIndex: 0
  });

  const primaryMetricCol = React.useMemo(() => {
    return columns.find(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'))?.name || 'Revenue';
  }, [columns]);

  function computeSliceMetrics(rowsSlice: Record<string, any>[], metricCol: string) {
    if (rowsSlice.length === 0) {
      return { name: metricCol, sum: 0, avg: 0, min: 0, max: 0 };
    }
    const vals = rowsSlice.map(r => Number(r[metricCol])).filter(v => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) {
      return { name: metricCol, sum: 0, avg: 0, min: 0, max: 0 };
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return {
      name: metricCol,
      sum: Math.round(sum * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100
    };
  }

  function openDrillThrough(params: {
    title: string;
    subtitle?: string;
    kpi?: KPI;
    filterColumn?: string;
    filterValue?: any;
    sourceContext?: DrillThroughState['sourceContext'];
  }) {
    const rootCrumb: DrillThroughBreadcrumb = {
      id: 'crumb-root-0',
      depth: 0,
      label: 'All Dataset Records',
      subLabel: `${cleanRows.length.toLocaleString()} audited records`,
      rowCount: cleanRows.length,
      metricSummary: computeSliceMetrics(cleanRows, primaryMetricCol)
    };

    let secondCrumb: DrillThroughBreadcrumb | null = null;

    if (params.kpi) {
      secondCrumb = {
        id: `crumb-kpi-${params.kpi.id}`,
        depth: 1,
        label: `KPI: ${params.kpi.name}`,
        subLabel: `${params.kpi.formattedValue} (${params.kpi.status})`,
        kpiId: params.kpi.id,
        kpiName: params.kpi.name,
        rowCount: cleanRows.length,
        metricSummary: computeSliceMetrics(cleanRows, primaryMetricCol)
      };
    } else if (params.filterColumn && params.filterValue !== undefined) {
      const sliceRows = cleanRows.filter(r => String(r[params.filterColumn!]) === String(params.filterValue));
      secondCrumb = {
        id: `crumb-slice-1`,
        depth: 1,
        label: `${params.filterColumn}: "${params.filterValue}"`,
        subLabel: `${sliceRows.length.toLocaleString()} records (${Math.round((sliceRows.length / (cleanRows.length || 1)) * 100)}% of total)`,
        filterColumn: params.filterColumn,
        filterValue: params.filterValue,
        rowCount: sliceRows.length,
        metricSummary: computeSliceMetrics(sliceRows, primaryMetricCol)
      };
    }

    const breadcrumbs = secondCrumb ? [rootCrumb, secondCrumb] : [rootCrumb];

    setDrillThrough({
      isOpen: true,
      title: params.title,
      subtitle: params.subtitle || (params.kpi ? params.kpi.definition : undefined),
      kpi: params.kpi,
      breadcrumbs,
      activeBreadcrumbIndex: breadcrumbs.length - 1,
      sourceContext: params.sourceContext || (params.kpi ? 'kpi_card' : params.filterColumn ? 'chart_bar' : 'general')
    });

    logAction('DRILL_THROUGH_OPEN', `Opened drill-through for "${params.title}"`);
  }

  function drillDeeper(step: {
    label: string;
    filterColumn: string;
    filterValue: any;
    subLabel?: string;
  }) {
    setDrillThrough(prev => {
      const activeTrail = prev.breadcrumbs.slice(0, prev.activeBreadcrumbIndex + 1);

      // Compute filtered rows matching whole path including the new step
      let currentRows = cleanRows;
      for (const crumb of activeTrail) {
        if (crumb.filterColumn && crumb.filterValue !== undefined) {
          currentRows = currentRows.filter(r => String(r[crumb.filterColumn!]) === String(crumb.filterValue));
        }
      }
      const nextRows = currentRows.filter(r => String(r[step.filterColumn]) === String(step.filterValue));
      const newDepth = activeTrail.length;

      const newCrumb: DrillThroughBreadcrumb = {
        id: `crumb-slice-${newDepth}-${Date.now()}`,
        depth: newDepth,
        label: step.label,
        subLabel: step.subLabel || `${nextRows.length.toLocaleString()} records`,
        filterColumn: step.filterColumn,
        filterValue: step.filterValue,
        rowCount: nextRows.length,
        metricSummary: computeSliceMetrics(nextRows, primaryMetricCol)
      };

      const updatedBreadcrumbs = [...activeTrail, newCrumb];

      return {
        ...prev,
        breadcrumbs: updatedBreadcrumbs,
        activeBreadcrumbIndex: updatedBreadcrumbs.length - 1
      };
    });
  }

  function navigateBreadcrumb(index: number) {
    setDrillThrough(prev => {
      if (index < 0 || index >= prev.breadcrumbs.length) return prev;
      return {
        ...prev,
        activeBreadcrumbIndex: index
      };
    });
  }

  function closeDrillThrough() {
    setDrillThrough(prev => ({ ...prev, isOpen: false }));
  }

  function applyDrillThroughFilter() {
    const activeCrumb = drillThrough.breadcrumbs[drillThrough.activeBreadcrumbIndex];
    if (activeCrumb && activeCrumb.filterColumn && activeCrumb.filterValue !== undefined) {
      setFilters(prev => ({
        ...prev,
        selectedDimension: activeCrumb.filterColumn!,
        selectedDimensionValue: String(activeCrumb.filterValue)
      }));
    }
    setDrillThrough(prev => ({ ...prev, isOpen: false }));
    logAction('DRILL_THROUGH_APPLY_FILTER', `Applied drill-through slice as global dashboard filter`);
  }

  // Filtered rows for global cross filtering (RULE 43, 44)
  const filteredRows = React.useMemo(() => {
    let result = cleanRows;
    const dateCol = columns.find(c => c.dataType === 'date')?.name;

    if (dateCol && (filters.dateRange.start || filters.dateRange.end)) {
      result = result.filter(r => {
        const d = String(r[dateCol]);
        if (filters.dateRange.start && d < filters.dateRange.start) return false;
        if (filters.dateRange.end && d > filters.dateRange.end) return false;
        return true;
      });
    }

    if (filters.selectedDimension && filters.selectedDimensionValue) {
      result = result.filter(r => String(r[filters.selectedDimension!]) === String(filters.selectedDimensionValue));
    }

    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(r => 
        Object.values(r).some(v => String(v).toLowerCase().includes(q))
      );
    }

    return result;
  }, [cleanRows, columns, filters]);

  return (
    <PlatformContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        isSidebarOpen,
        setIsSidebarOpen,
        isPresentationMode,
        setIsPresentationMode,
        themeMode,
        setThemeMode,
        toggleThemeMode,
        project,
        brand,
        setBrand,
        updateProjectMetadata,
        rawRows,
        cleanRows,
        columns,
        detectedTypes,
        qualityReport,
        transformations,
        dataModel,
        analytics,
        daxMeasures,
        filters,
        setFilters,
        filteredRows,
        isProcessing,
        pipelineStep,
        error,
        liveConnection,
        setLiveConnection,
        syncLiveStream,
        ingestDatasetFromRows,
        applyCleanedRows,
        ingestFile,
        loadDemoDataset,
        runAnalysisPipeline,
        addTransformation,
        undoTransformation,
        resetToRaw,
        customVisuals,
        setCustomVisuals,
        addCustomVisual,
        removeCustomVisual,
        auditLogs,
        drillThrough,
        openDrillThrough,
        drillDeeper,
        navigateBreadcrumb,
        closeDrillThrough,
        applyDrillThroughFilter
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
