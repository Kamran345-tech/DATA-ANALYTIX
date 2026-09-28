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
  DataType
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
        auditLogs
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
