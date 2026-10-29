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
  DrillThroughState,
  Relationship
} from '../types';
import { inferTypes, castRows, parseFile } from '../engine/dataParser';
import { profileDataset } from '../engine/dataProfiler';
import { evaluateDataQuality } from '../engine/dataQuality';
import { applyTransformation, replayTransformations } from '../engine/transformationEngine';
import { buildDataModel } from '../engine/dataModeler';
import { computeAnalytics, AnalyticsSummary, calculateKpiFromParameters, CustomKpiParams } from '../engine/analyticsEngine';
import { generateDAXMeasures } from '../engine/daxEngine';
import { registerTablesInSQL } from '../engine/sqlEngine';
import { DEMO_DATASETS, DemoDatasetInfo } from '../data/demoDatasets';
import { toast } from './useToast';
import { safeMin, safeMax } from '../utils/mathUtils';

export type NavigationTab = 
  | 'landing'
  | 'executive_dashboard'
  | 'how_to_use'
  | 'upload'
  | 'live_connector'
  | 'preview'
  | 'quality'
  | 'cleaning'
  | 'modeling'
  | 'data_engineering'
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
  slicers?: Record<string, string[]>;
  metricRange?: { column: string; min: number; max: number };
  datePreset?: 'all' | '30d' | '90d' | 'ytd' | 'custom';
}

export interface ReportHeadings {
  mainTitle: string;
  subtitle?: string;
  section1: string;
  section2: string;
  section3: string;
  section4: string;
  section5: string;
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

  // Project & Brand state
  project: ProjectMetadata;
  brand: BrandConfig;
  setBrand: (b: BrandConfig) => void;
  uploadCompanyLogo: (logoDataUrl: string) => void;
  removeCompanyLogo: () => void;
  updateProjectMetadata: (updates: Partial<ProjectMetadata>) => void;

  // Editable Report Headings
  reportHeadings: ReportHeadings;
  updateReportHeading: (section: keyof ReportHeadings, newTitle: string) => void;

  // KPI Customization & Heading Management
  updateKpi: (kpiId: string, updates: Partial<KPI>) => void;
  recalculateKpiCard: (kpiId: string, params: CustomKpiParams) => void;
  resetKpisToDefault: () => void;

  // Slicers and interactive filters
  setSlicerValue: (column: string, values: string[]) => void;
  toggleSlicerItem: (column: string, value: string) => void;
  clearSlicer: (column: string) => void;
  clearAllSlicers: () => void;
  setMetricRangeFilter: (column: string, min: number, max: number) => void;
  clearMetricRangeFilter: () => void;
  setDatePresetFilter: (preset: 'all' | '30d' | '90d' | 'ytd' | 'custom') => void;

  // Data state
  rawRows: Record<string, any>[];
  cleanRows: Record<string, any>[];
  columns: ColumnProfile[];
  detectedTypes: Record<string, DataType>;
  qualityReport: DataQualityReport;
  transformations: TransformationStep[];
  dataModel: DataModel;
  setDataModel: React.Dispatch<React.SetStateAction<DataModel>>;
  addRelationship: (rel: Omit<Relationship, 'id'>) => void;
  deleteRelationship: (id: string) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  resetRelationshipsToDefault: () => void;
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

const getInitialAuthor = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('acuitybi_analyst_name');
    if (saved && saved.trim()) return saved.trim();
  }
  return 'Lead BI Analyst';
};

const getInitialLogo = (): string | undefined => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('acuitybi_company_logo');
    if (saved && saved.trim()) return saved.trim();
  }
  return undefined;
};

const defaultBrand: BrandConfig = {
  companyName: 'Analytics Technologies',
  logoUrl: getInitialLogo(),
  tagline: 'Autonomous AI Data Intelligence & Performance Center',
  department: 'Strategic Analytics & BI',
  author: getInitialAuthor(),
  themeColor: '#21F1A8',
  backgroundColor: '#171717',
  accentColor: '#00D8F6'
};

const defaultProject: ProjectMetadata = {
  id: 'proj-001',
  name: 'Global Enterprise Technology Sales & Margin Telemetry',
  companyName: 'Analytics Technologies',
  department: 'Strategic Analytics & BI',
  author: getInitialAuthor(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDemo: false,
  version: 'v1.0.0',
  dataQualityScore: 96,
  rowCount: 120,
  columnCount: 12,
  sourceFileName: 'enterprise_sales_margin_telemetry.csv'
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
      const saved = localStorage.getItem('acuitybi_theme') || localStorage.getItem('nexusbi_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const setThemeMode = (mode: 'dark' | 'light') => {
    setThemeModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('acuitybi_theme', mode);
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

  const defaultReportHeadings: ReportHeadings = {
    mainTitle: 'EXECUTIVE INTELLIGENCE BRIEF',
    section1: '1. EXECUTIVE SUMMARY & BUSINESS HEALTH',
    section2: '2. KEY PERFORMANCE INDICATORS',
    section3: '3. AI INSIGHTS & MANAGEMENT DIRECTIVES',
    section4: '4. ATTACHED DASHBOARDS & SEGMENT BREAKDOWNS',
    section5: '5. DATA QUALITY AUDIT & GOVERNANCE'
  };

  const [reportHeadings, setReportHeadings] = useState<ReportHeadings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acuitybi_report_headings');
      if (saved) {
        try {
          return { ...defaultReportHeadings, ...JSON.parse(saved) };
        } catch {}
      }
    }
    return defaultReportHeadings;
  });

  const updateReportHeading = (section: keyof ReportHeadings, newTitle: string) => {
    setReportHeadings(prev => {
      const updated = { ...prev, [section]: newTitle };
      if (typeof window !== 'undefined') {
        localStorage.setItem('acuitybi_report_headings', JSON.stringify(updated));
      }
      return updated;
    });
    logAction('HEADING_UPDATED', `Updated report heading [${section}] to "${newTitle}".`);
  };

  const updateKpi = (kpiId: string, updates: Partial<KPI>) => {
    setAnalytics(prev => ({
      ...prev,
      kpis: prev.kpis.map(k => k.id === kpiId ? { ...k, ...updates } : k)
    }));
    logAction('KPI_UPDATED', `Updated KPI card "${updates.name || kpiId}".`);
  };

  const recalculateKpiCard = (kpiId: string, params: CustomKpiParams) => {
    const tableName = dataModel.tables[0]?.name || 'FactTable';
    const dateCol = columns.find(c => c.dataType === 'date')?.name;
    const newKpi = calculateKpiFromParameters(
      { ...params, id: kpiId },
      cleanRows,
      dateCol,
      tableName
    );
    setAnalytics(prev => ({
      ...prev,
      kpis: prev.kpis.map(k => k.id === kpiId ? newKpi : k)
    }));
    logAction('KPI_RECALCULATED', `Recalculated KPI "${params.name}" (${params.aggregation.toUpperCase()} on ${params.sourceColumn}).`);
  };

  const resetKpisToDefault = () => {
    const tableName = dataModel.tables[0]?.name || 'FactTable';
    const anal = computeAnalytics(columns, cleanRows, tableName);
    setAnalytics(prev => ({
      ...prev,
      kpis: anal.kpis
    }));
    logAction('KPI_RESET', 'Reset KPI cards to automated engine defaults.');
  };

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
    searchQuery: '',
    slicers: {},
    datePreset: 'all'
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
      companyName: 'Badar Analytics Technologies',
      department: 'Enterprise Intelligence',
      author: brand.author || 'Lead BI Analyst',
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
    toast.success(
      `Dataset Loaded: ${demo.name}`,
      `Successfully loaded ${typed.length.toLocaleString()} rows with verified Star Schema & DAX measures.`,
      {
        stage: 'Live Telemetry Active',
        action: {
          label: 'View Dashboard',
          onClick: () => setCurrentTab('executive_dashboard')
        }
      }
    );
  }

  function uploadCompanyLogo(logoDataUrl: string) {
    setBrand(prev => ({ ...prev, logoUrl: logoDataUrl }));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('acuitybi_company_logo', logoDataUrl);
      } catch (e) {
        console.warn('Could not persist logo to localStorage:', e);
      }
    }
    toast.success('Company Logo Uploaded', 'Your organization branding is now active across the Executive Dashboard, Navigation Bar, and Export Reports.');
  }

  function removeCompanyLogo() {
    setBrand(prev => {
      const copy = { ...prev };
      delete copy.logoUrl;
      return copy;
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('acuitybi_company_logo');
    }
    toast.info('Logo Removed', 'Reverted to default brand typography.');
  }

  async function ingestFile(file: File) {
    setIsProcessing(true);
    setError(null);
    setPipelineStep('Ingesting & parsing raw bytes...');
    const toastId = 'ingestion_' + Date.now();
    toast.progress(toastId, 15, 'Stage 1/6: Ingesting', `Parsing raw bytes for "${file.name}"...`);

    try {
      const parsed = await parseFile(file);

      // 1. Autonomous Auto-Cleaning Pipeline on Ingest (Trims whitespace, cleans currency/dirty numbers, removes duplicates)
      setPipelineStep('Auto-cleaning & normalizing ingested data...');
      toast.progress(toastId, 30, 'Stage 2/6: Auto-Cleaning', `Sanitizing records, normalizing currencies/formats, and trimming whitespace...`);
      
      const autoCleanStep: TransformationStep = {
        id: `auto-clean-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'auto_clean_all',
        parameters: {},
        description: 'Autonomous Ingestion Clean: Deduplicated records, trimmed whitespace, and normalized dirty numbers/currencies.'
      };
      const cleanedRows = applyTransformation(parsed.rows, autoCleanStep);

      setPipelineStep('Profiling column data types & distribution...');
      toast.progress(toastId, 45, 'Stage 3/6: Profiling', `Evaluating distributions across ${parsed.columns.length} columns...`);
      const prof = profileDataset(parsed.columns, cleanedRows, parsed.detectedTypes);

      setPipelineStep('Auditing data quality & completeness...');
      toast.progress(toastId, 60, 'Stage 4/6: Quality Audit', `Auditing anomalies across ${cleanedRows.length.toLocaleString()} clean rows...`);
      const qual = evaluateDataQuality(prof, cleanedRows);

      setPipelineStep('Constructing relational Star Schema data model...');
      toast.progress(toastId, 75, 'Stage 5/6: Star Schema Modeling', 'Partitioning facts and dimensions with connected 1:N relationships...');
      const model = buildDataModel(parsed.tableName, prof, cleanedRows);

      setPipelineStep('Computing statistical KPIs, trends & anomaly vectors...');
      toast.progress(toastId, 90, 'Stage 6/6: Telemetry Synthesis', 'Synthesizing data-aware KPIs, top performers, and DAX measures...');
      const anal = computeAnalytics(prof, cleanedRows, parsed.tableName);
      const dax = generateDAXMeasures(parsed.tableName, prof, model.tables);

      registerTablesInSQL([
        { name: parsed.tableName, rows: cleanedRows },
        ...model.tables.filter(t => t.name !== parsed.tableName).map(t => ({ name: t.name, rows: t.data }))
      ]);

      setRawRows(parsed.rows);
      setCleanRows(cleanedRows);
      setColumns(prof);
      setDetectedTypes(parsed.detectedTypes);
      setQualityReport(qual);
      setDataModel(model);
      setAnalytics(anal);
      setCustomVisuals(anal.visuals);
      setDaxMeasures(dax);
      setTransformations([autoCleanStep]);

      setProject({
        id: `proj-${Date.now()}`,
        name: parsed.tableName.replace(/_/g, ' '),
        companyName: brand.companyName,
        department: brand.department,
        author: brand.author,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: false, // REAL USER DATA
        version: 'v1.0.0',
        dataQualityScore: qual.overallScore,
        rowCount: cleanedRows.length,
        columnCount: parsed.columns.length,
        sourceFileName: parsed.fileName
      });

      logAction('FILE_UPLOADED', `Uploaded & auto-cleaned dataset: ${parsed.fileName} (${cleanedRows.length} rows, ${parsed.columns.length} columns, ${model.relationships.length} active relationships).`);

      setPipelineStep('Analysis pipeline ready!');
      toast.complete(
        toastId, 
        'Data Ingestion Complete', 
        `Successfully ingested and auto-cleaned "${parsed.fileName}" (${cleanedRows.length.toLocaleString()} rows, ${parsed.columns.length} columns) with ${model.relationships.length} Star Schema relationships connected.`,
        {
          label: 'Open Dashboard',
          onClick: () => setCurrentTab('executive_dashboard')
        }
      );
      setCurrentTab('executive_dashboard');
    } catch (err: any) {
      console.error('Ingestion error:', err);
      const errMsg = err?.message || 'Failed to ingest and analyze file.';
      setError(errMsg);
      toast.error('Data Ingestion Failed', errMsg, { id: toastId });
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
    const min = safeMin(vals, 0);
    const max = safeMax(vals, 0);
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

  // --- Data Model & Relationship Actions ---
  const addRelationship = (newRel: Omit<Relationship, 'id'>) => {
    const id = `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const relationship: Relationship = {
      ...newRel,
      id,
      isActive: newRel.isActive ?? true
    };
    setDataModel(prev => ({
      ...prev,
      relationships: [...prev.relationships, relationship]
    }));
    logAction('ADD_RELATIONSHIP', `Linked ${relationship.sourceTable}[${relationship.sourceColumn}] to ${relationship.targetTable}[${relationship.targetColumn}]`);
    toast.success('Relationship Connected', `Created ${relationship.cardinality} link between ${relationship.sourceTable} and ${relationship.targetTable}.`);
  };

  const deleteRelationship = (id: string) => {
    const target = dataModel.relationships.find(r => r.id === id);
    setDataModel(prev => ({
      ...prev,
      relationships: prev.relationships.filter(r => r.id !== id)
    }));
    if (target) {
      logAction('DELETE_RELATIONSHIP', `Removed link between ${target.sourceTable} and ${target.targetTable}`);
    }
    toast.info('Relationship Removed', 'The foreign key constraint has been unlinked.');
  };

  const updateRelationship = (id: string, updates: Partial<Relationship>) => {
    setDataModel(prev => ({
      ...prev,
      relationships: prev.relationships.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    logAction('UPDATE_RELATIONSHIP', `Updated relationship ${id} attributes`);
    toast.success('Relationship Updated', 'Cardinality and cross-filtering rules have been updated.');
  };

  const resetRelationshipsToDefault = () => {
    const mainName = dataModel.tables[0]?.name || 'FactTable';
    const fresh = buildDataModel(mainName, columns, cleanRows);
    setDataModel(fresh);
    logAction('RESET_RELATIONSHIPS', 'Reset Star Schema relationships to auto-detected structure');
    toast.info('Model Restored', 'Auto-detected star schema entities and foreign key mappings restored.');
  };

  const setSlicerValue = (column: string, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      slicers: {
        ...(prev.slicers || {}),
        [column]: values
      }
    }));
  };

  const toggleSlicerItem = (column: string, value: string) => {
    setFilters(prev => {
      const current = prev.slicers?.[column] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return {
        ...prev,
        slicers: {
          ...(prev.slicers || {}),
          [column]: updated
        }
      };
    });
  };

  const clearSlicer = (column: string) => {
    setFilters(prev => {
      const nextSlicers = { ...(prev.slicers || {}) };
      delete nextSlicers[column];
      return {
        ...prev,
        slicers: nextSlicers
      };
    });
  };

  const clearAllSlicers = () => {
    setFilters({
      dateRange: {},
      selectedDimension: null,
      selectedDimensionValue: null,
      searchQuery: '',
      slicers: {},
      metricRange: undefined,
      datePreset: 'all'
    });
    toast.info('Slicers Reset', 'All dimension slicers and range filters have been reset.');
  };

  const setMetricRangeFilter = (column: string, min: number, max: number) => {
    setFilters(prev => ({
      ...prev,
      metricRange: { column, min, max }
    }));
  };

  const clearMetricRangeFilter = () => {
    setFilters(prev => ({
      ...prev,
      metricRange: undefined
    }));
  };

  const setDatePresetFilter = (preset: 'all' | '30d' | '90d' | 'ytd' | 'custom') => {
    const dateCol = columns.find(c => c.dataType === 'date')?.name;
    if (!dateCol || preset === 'all') {
      setFilters(prev => ({
        ...prev,
        datePreset: preset,
        dateRange: {}
      }));
      return;
    }

    const dates = cleanRows.map(r => String(r[dateCol] || '')).filter(Boolean).sort();
    if (dates.length === 0) return;
    const latestDate = new Date(dates[dates.length - 1]);
    if (isNaN(latestDate.getTime())) return;

    let startDate: Date;
    if (preset === '30d') {
      startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() - 30);
    } else if (preset === '90d') {
      startDate = new Date(latestDate);
      startDate.setDate(startDate.getDate() - 90);
    } else if (preset === 'ytd') {
      startDate = new Date(latestDate.getFullYear(), 0, 1);
    } else {
      return;
    }

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setFilters(prev => ({
      ...prev,
      datePreset: preset,
      dateRange: {
        start: fmt(startDate),
        end: fmt(latestDate)
      }
    }));
  };

  // Filtered rows for global cross filtering (RULE 43, 44) & Multi-Slicers
  const filteredRows = React.useMemo(() => {
    let result = cleanRows;
    const dateCol = columns.find(c => c.dataType === 'date')?.name;

    // 1. Date filter
    if (dateCol && (filters.dateRange?.start || filters.dateRange?.end)) {
      result = result.filter(r => {
        const d = String(r[dateCol] || '');
        if (filters.dateRange.start && d < filters.dateRange.start) return false;
        if (filters.dateRange.end && d > filters.dateRange.end) return false;
        return true;
      });
    }

    // 2. Legacy selectedDimension & selectedDimensionValue
    if (filters.selectedDimension && filters.selectedDimensionValue) {
      result = result.filter(r => String(r[filters.selectedDimension!]) === String(filters.selectedDimensionValue));
    }

    // 3. Multi-attribute interactive Slicers
    if (filters.slicers) {
      for (const [col, selectedVals] of Object.entries(filters.slicers)) {
        if (Array.isArray(selectedVals) && selectedVals.length > 0) {
          result = result.filter(r => {
            const val = String(r[col] ?? '');
            return selectedVals.includes(val);
          });
        }
      }
    }

    // 4. Metric Range
    if (filters.metricRange && filters.metricRange.column) {
      const { column, min, max } = filters.metricRange;
      result = result.filter(r => {
        const num = Number(r[column]);
        if (isNaN(num)) return true;
        return num >= min && num <= max;
      });
    }

    // 5. Global Search Query
    if (filters.searchQuery?.trim()) {
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
        uploadCompanyLogo,
        removeCompanyLogo,
        updateProjectMetadata,
        reportHeadings,
        updateReportHeading,
        updateKpi,
        recalculateKpiCard,
        resetKpisToDefault,
        setSlicerValue,
        toggleSlicerItem,
        clearSlicer,
        clearAllSlicers,
        setMetricRangeFilter,
        clearMetricRangeFilter,
        setDatePresetFilter,
        rawRows,
        cleanRows,
        columns,
        detectedTypes,
        qualityReport,
        transformations,
        dataModel,
        setDataModel,
        addRelationship,
        deleteRelationship,
        updateRelationship,
        resetRelationshipsToDefault,
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
