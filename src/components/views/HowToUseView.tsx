import React, { useState } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Database,
  Table2,
  ShieldAlert,
  Wand2,
  Network,
  TrendingUp,
  Code2,
  FileCode2,
  SlidersHorizontal,
  Sparkles,
  FileSpreadsheet,
  BookOpen,
  FolderDown,
  Wrench,
  Settings,
  Search,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Info,
  HelpCircle,
  Play,
  Sun,
  Moon,
  Compass,
  FileText,
  Layers,
  ChevronRight,
  Check
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';

interface ModuleGuide {
  id: NavigationTab;
  category: 'core' | 'ingestion' | 'analytics' | 'labs' | 'decision' | 'export';
  categoryLabel: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  badge?: string;
  summary: string;
  whatYouCanDo: string[];
  stepsToUse: string[];
  proTip: string;
  outputArtifact: string;
}

const MODULES: ModuleGuide[] = [
  {
    id: 'executive_dashboard',
    category: 'core',
    categoryLabel: 'Core Platform',
    title: 'Executive Dashboard & KPI Center',
    icon: LayoutDashboard,
    tag: 'Executive Telemetry',
    badge: 'Real-Time Insights',
    summary: 'High-level executive control center presenting company-wide revenue, profit margins, orders, AOV, YoY growth, and interactive multidimensional telemetry charts.',
    whatYouCanDo: [
      'Monitor top business metrics (Total Revenue, Gross Profit, Profit Margin, Volume, Average Order Value).',
      'Filter interactively by Date Range, Region, Customer Segment, or Product Category.',
      'Click on any KPI card or chart bar to trigger Granular Drill-Through inspection into raw rows.',
      'Enter full-screen Presentation Mode for C-suite meetings and client presentations.',
      'Rename dashboard title and customize executive notes in real time.'
    ],
    stepsToUse: [
      'Open Executive Dashboard from the top navbar or sidebar.',
      'Use the top Global Search bar or filter dropdowns to narrow down specific timeframes or segments.',
      'Hover over charts to inspect exact amounts; click any element to open granular row records.',
      'Click the Maximize icon in the top header to enter distraction-free Presentation Mode.'
    ],
    proTip: 'Every chart responds automatically to data cleaned in the Cleaning Lab and modeled in Star Schema.',
    outputArtifact: 'Executive Telemetry, Dynamic Visual Cards, Granular Drill-Through Tables'
  },
  {
    id: 'upload',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Upload Data & File Ingestion',
    icon: UploadCloud,
    tag: 'Data Intake',
    badge: 'Drag & Drop',
    summary: 'Intake engine that accepts raw CSV, Excel (XLSX), or JSON files with automated type detection, schema profiling, and pre-loaded enterprise demo datasets.',
    whatYouCanDo: [
      'Drag and drop any business CSV or XLSX dataset directly from your computer.',
      'Instant automated detection of row counts, column counts, delimiters, and file sizes.',
      'Load one of 4 rich enterprise demo datasets (Retail Omnichannel, SaaS Subscriptions, Healthcare Logistics, Financial Ops).',
      'Raw data immutability: original file remains archived in 01_Original_Data/ without risk of data loss.'
    ],
    stepsToUse: [
      'Go to "Upload Data" from the top navigation or sidebar.',
      'Drop your file in the upload zone OR click one of the 4 demo cards below.',
      'Wait 1-2 seconds as the deterministic parser detects dates, numbers, text, and keys.',
      'AcuityBI will automatically route you to Data Preview and refresh all analytics.'
    ],
    proTip: 'Ensure Row 1 contains clear column headers (e.g. OrderDate, CustomerID, Revenue) for best automated modeling.',
    outputArtifact: 'Archived Raw Source Files, Schema Profile Metadata, Ingestion Manifest'
  },
  {
    id: 'live_connector',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Live Server & Database Connector',
    icon: Database,
    tag: 'Real-Time Sync',
    badge: 'Live Stream',
    summary: 'Direct streaming connection to production databases (PostgreSQL, MySQL, Microsoft SQL Server, Snowflake, or REST API endpoints) with scheduled auto-refresh.',
    whatYouCanDo: [
      'Connect to PostgreSQL, MySQL, SQL Server, or REST API endpoints.',
      'Execute live extraction queries with custom WHERE clauses and limits.',
      'Set automated streaming polling intervals (every 10s, 30s, 60s, or manual heartbeat).',
      'Monitor live latency, heartbeat pulse, fetch counts, and real-time rows delta.'
    ],
    stepsToUse: [
      'Navigate to "Live Server & DB" tab.',
      'Select your database engine (PostgreSQL, MySQL, SQL Server, REST API).',
      'Enter host/port credentials or use the pre-configured Sandbox Demo DB.',
      'Click "Test & Connect Stream" then "Sync Live Stream Now".'
    ],
    proTip: 'Use WHERE clauses in the SQL query box to filter only active fiscal year transactions for maximum performance.',
    outputArtifact: 'Live DB Stream Ingestion, Delta Sync Logs, Replicated Fact Data'
  },
  {
    id: 'preview',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Data Preview & Profiling',
    icon: Table2,
    tag: 'Exploration',
    badge: 'Tabular Inspector',
    summary: 'Deep tabular inspector displaying column types, cardinalities, null ratios, unique value distributions, and primary key candidates.',
    whatYouCanDo: [
      'Inspect clean rows with dynamic search, multi-column sorting, and pagination.',
      'View individual column profiles: distinct count, null count, null percentage, and detected data types.',
      'Identify Primary Key (PK) candidates (columns with 100% uniqueness).',
      'Detect categorical dimension candidates vs continuous numerical measures.'
    ],
    stepsToUse: [
      'Go to "Data Preview & Profile".',
      'Use the search box to find specific values or customer records.',
      'Click on any column header to toggle ascending/descending order.',
      'Review the summary cards at top for total rows, total columns, and storage memory footprint.'
    ],
    proTip: 'Look at the "Distinct Count" ratio: high cardinality indicates IDs/names, while low cardinality indicates dimensions (Region, Segment).',
    outputArtifact: 'Column Cardinality Profile, Memory Footprint, Key Candidate Matrix'
  },
  {
    id: 'quality',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Data Quality Auditor',
    icon: ShieldAlert,
    tag: 'Governance',
    badge: 'Score 0-100%',
    summary: 'Automated 4-pillar data quality audit engine measuring Completeness, Uniqueness, Validity, and Consistency, with exportable Audit Certificate.',
    whatYouCanDo: [
      'Instant 0-100% Quality Score across Completeness, Uniqueness, Validity, and Consistency.',
      'Automatic detection of missing values, duplicate rows, whitespace pollution, and statistical outliers (IQR / Z-score).',
      'Prioritized issue list with severity levels (Critical, Warning, Informational).',
      'One-click "Fix in Cleaning Lab" button that pre-configures remedial transformation rules.',
      'Download formal Data Quality Audit Certificate for enterprise governance and compliance.'
    ],
    stepsToUse: [
      'Open "Data Quality Auditor".',
      'Review the circular health gauge and four sub-scores.',
      'Read through the flagged issues table to see exact problematic row counts.',
      'Click "Remediate in Cleaning Lab" to automatically fix highlighted anomalies.'
    ],
    proTip: 'A quality score above 90% is recommended before deploying models to Power BI Desktop production.',
    outputArtifact: 'Formal Audit Certificate, Issue Anomaly Log, Compliance Verification'
  },
  {
    id: 'cleaning',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Data Cleaning Lab',
    icon: Wand2,
    tag: 'Data Prep',
    badge: 'Reversible ETL',
    summary: 'Visual, zero-code ETL pipeline to clean, impute, deduplicate, standardize, and transform messy datasets with full step-by-step undo and replay.',
    whatYouCanDo: [
      'Impute missing values using Mean, Median, Mode, Custom Fallback, or Forward-fill.',
      'Deduplicate records based on composite keys or complete row matching.',
      'Text standardization: Trim whitespace, UPPERCASE, lowercase, Title Case, regex cleanup.',
      'Type casting: Convert text dates to ISO format, strings to numbers, numbers to text.',
      'Filter and remove invalid negative prices or outlier test transactions.',
      'Full recipe audit log: Inspect every transformation step with instant Undo and Reset.'
    ],
    stepsToUse: [
      'Go to "Data Cleaning Lab".',
      'Select the target column and choose a transformation recipe from the dropdown.',
      'Configure parameters (e.g., replacement text or numeric strategy) and click "Apply Transformation".',
      'Review the live Before/After preview table; use "Undo Step" if needed.'
    ],
    proTip: 'AcuityBI records every transformation into PowerQuery_Transformations.m so Power BI Desktop replicates your exact cleaning steps.',
    outputArtifact: 'Power Query M Script (PowerQuery_Transformations.m), Cleaned Datasets'
  },
  {
    id: 'modeling',
    category: 'analytics',
    categoryLabel: 'Analytics & Modeling',
    title: 'Data Modeling & ERD Diagram',
    icon: Network,
    tag: 'Architecture',
    badge: 'Star Schema',
    summary: 'Automated Dimensional Modeling engine that splits flat datasets into normalized Fact and Dimension tables connected by validated 1-to-Many relationships.',
    whatYouCanDo: [
      'Automatic decomposition into Fact_Transactions and Dimension tables (Dim_Date, Dim_Customer, Dim_Product, Dim_Region).',
      'Visual interactive ERD (Entity Relationship Diagram) showing primary-to-foreign key links ($1 \\to *$).',
      'Referential integrity checking to ensure no orphaned foreign keys exist.',
      'Auto-generation of Dim_Date with Year, Quarter, Month, Week, DayOfWeek, and Fiscal calendars.',
      'Export schema definitions in Power Query M script and relational SQL DDL.'
    ],
    stepsToUse: [
      'Navigate to "Data Modeling (ERD)".',
      'Explore the visual ERD canvas showing tables and connecting relationship lines.',
      'Click on any table card to inspect its fields, primary key, and row count.',
      'Review the validation panel at bottom to verify referential integrity.'
    ],
    proTip: 'Star Schema provides up to 10x faster query execution in Power BI VertiPaq engine compared to a single flat table.',
    outputArtifact: 'Normalized Star Schema Tables, Dim_Date Calendar, Visual ERD Layout'
  },
  {
    id: 'analysis',
    category: 'analytics',
    categoryLabel: 'Analytics & Modeling',
    title: 'Statistical Analysis Engine',
    icon: TrendingUp,
    tag: 'Advanced Math',
    badge: 'Predictive Models',
    summary: 'Rigorous mathematical engine computing descriptive statistics, Pearson correlation heatmaps, Holt-Winters exponential smoothing forecasts, and anomaly detection.',
    whatYouCanDo: [
      'Compute descriptive stats: Mean, Median, Mode, Std Dev, Variance, Skewness, Kurtosis.',
      'Interactive Pearson Correlation Matrix ($r \\in [-1.0, 1.0]$) between all numerical metrics.',
      '3-Month and 6-Month Holt-Winters exponential smoothing forecasts with upper/lower confidence intervals.',
      'Automated anomaly detection identifying statistical spikes and sudden drop-offs.',
      'Actionable business opportunities generated from multi-variable regressions.'
    ],
    stepsToUse: [
      'Open "Statistical Analysis".',
      'Switch between "Overview & Stats", "Correlation Heatmap", and "Predictive Forecasts" sub-tabs.',
      'Hover over cells in the correlation matrix to see exact Pearson $r$ coefficient and $p$-values.',
      'Examine the Forecast chart to see projected trajectory vs historical numbers.'
    ],
    proTip: 'Strong positive correlations ($r > 0.70$) between discounts and order volume reveal high price elasticity.',
    outputArtifact: 'Correlation Heatmap, 6-Month Holt-Winters Forecast, Descriptive Stats Table'
  },
  {
    id: 'dax_lab',
    category: 'labs',
    categoryLabel: 'Code Labs & DAX',
    title: 'DAX Lab & Formula Studio',
    icon: Code2,
    tag: 'Power BI Code',
    badge: '20+ Measures',
    summary: 'Production Power BI DAX studio auto-generating base aggregations, profit margins, and Time Intelligence measures (YTD, QTD, YoY Growth) with instant evaluation.',
    whatYouCanDo: [
      'Auto-generates 20+ production-grade DAX measures tailored specifically to your dataset.',
      'Time Intelligence: TOTALYTD, TOTALQTD, SAMEPERIODLASTYEAR, MoM Growth %, YoY Delta.',
      'Ratio & Margin formulas: Gross Margin %, Profitability Index, Cumulative Running Totals.',
      'In-browser formula evaluator: test DAX calculations against active clean rows.',
      'One-click "Copy DAX" button formatted with proper capitalization and comments.'
    ],
    stepsToUse: [
      'Go to "DAX Lab".',
      'Browse measures by category: Base Aggregations, Time Intelligence, Ratios, or Advanced.',
      'Click any measure to inspect its syntax, description, and dynamic preview result.',
      'Click "Copy DAX Code" to paste directly into Power BI Desktop "New Measure" box.'
    ],
    proTip: 'All generated measures use fully qualified references (`Table[Column]`) for strict Power BI best practice compliance.',
    outputArtifact: 'Ready-to-Paste DAX Measures, Time Intelligence Formulas, DAX Library (.dax)'
  },
  {
    id: 'sql_lab',
    category: 'labs',
    categoryLabel: 'Code Labs & DAX',
    title: 'SQL Lab (Deterministic Engine)',
    icon: Database,
    tag: 'Query Sandbox',
    badge: 'In-Browser SQL',
    summary: 'In-browser relational SQL sandbox querying your clean dataset with pre-loaded analytical query templates, CTEs, window functions, and instant export.',
    whatYouCanDo: [
      'Execute standard SQL (`SELECT`, `WHERE`, `JOIN`, `GROUP BY`, `HAVING`, `ORDER BY`).',
      'Run pre-loaded analytical query templates: Pareto 80/20 Analysis, Monthly Cohort Retention, Top 10 Contributors, Moving Averages.',
      'Export query results directly to CSV or JSON with one click.',
      '"Apply Result as Working Dataset" to push query output back into AcuityBI as the main active data.',
      'Real-time execution latency benchmark in milliseconds.'
    ],
    stepsToUse: [
      'Open "SQL Lab".',
      'Select a query template from the top dropdown or type your own SQL in the editor.',
      'Click "Run Query" (or press Ctrl + Enter).',
      'Inspect the tabulated results below the editor.'
    ],
    proTip: 'The table name `clean_data` represents your current cleaned rows; individual dimension tables like `dim_customer` are also queryable.',
    outputArtifact: 'Query Output CSV, Analytical SQL Scripts, Aggregation Tables'
  },
  {
    id: 'python_lab',
    category: 'labs',
    categoryLabel: 'Code Labs & DAX',
    title: 'Python Lab & Notebook Studio',
    icon: FileCode2,
    tag: 'Data Science',
    badge: 'Pandas & ML',
    summary: 'Automated Python code generator providing complete, executable Pandas, NumPy, and Scikit-learn scripts for machine learning, clustering, and regressions.',
    whatYouCanDo: [
      'Auto-generated Python scripts for Data Profiling, Outlier Removal, K-Means Clustering, and Regression.',
      'Simulate script execution in-browser to preview console outputs and statistical tables.',
      'Download ready-to-run `.py` script or Jupyter Notebook (`.ipynb`).',
      'One-click copy formatted code for Google Colab or VS Code.'
    ],
    stepsToUse: [
      'Navigate to "Python Lab".',
      'Select an analytics script from the sidebar (e.g., "K-Means Customer Segmentation").',
      'Click "Execute Python Script" to see simulated output in the terminal console.',
      'Click "Download Notebook (.ipynb)" or "Copy Code".'
    ],
    proTip: 'All Python scripts include requirements comments (`pip install pandas numpy scikit-learn matplotlib seaborn`) for effortless setup.',
    outputArtifact: 'Jupyter Notebooks (.ipynb), Standalone Python Scripts (.py)'
  },
  {
    id: 'dashboard_builder',
    category: 'core',
    categoryLabel: 'Core Platform',
    title: 'Custom Dashboard Builder',
    icon: SlidersHorizontal,
    tag: 'Drag & Drop Canvas',
    badge: 'Custom Visuals',
    summary: 'Interactive visualization designer to create custom chart cards (Bar, Line, Area, Donut, Scatter, Funnel) aggregated by any dimension and metric.',
    whatYouCanDo: [
      'Create new custom visual cards: Bar Chart, Line Chart, Area Chart, Donut/Pie, Funnel, KPI Counter.',
      'Select X-Axis categorical dimension (e.g., Region, Category, Sales Rep).',
      'Select Y-Axis numerical metric with aggregation functions (SUM, AVG, COUNT, MIN, MAX).',
      'Reorder, edit, or delete visuals dynamically.',
      'Visuals immediately respond to global search queries and date filters.'
    ],
    stepsToUse: [
      'Open "Dashboard Builder".',
      'Click "+ Add New Visual".',
      'Choose visual type, title, dimension column, metric column, and aggregation (SUM/AVG).',
      'Click "Save Visual" to render it instantly on the interactive canvas.'
    ],
    proTip: 'Use Donut charts for categories with ≤ 5 items, and Bar charts for high-cardinality dimensions like Product Subcategories.',
    outputArtifact: 'Custom Interactive Canvas, Configured Visualization Layouts'
  },
  {
    id: 'ai_insights',
    category: 'decision',
    categoryLabel: 'Decision & AI',
    title: 'Ask Your Data AI (Grounded Insights)',
    icon: Sparkles,
    tag: 'Natural Language BI',
    badge: '100% Grounded',
    summary: 'Conversational business intelligence analyst providing grounded mathematical answers, root-cause analyses, and strategic recommendations without hallucinations.',
    whatYouCanDo: [
      'Ask questions in natural language: "Which region had highest profit?", "Top 3 performing products", "Identify loss-making items".',
      'Deterministic grounding: every answer provides the exact formula and row evidence (no guessing).',
      'One-click suggested executive prompt chips for fast exploratory queries.',
      'Generates direct action items and strategic next steps for executives.'
    ],
    stepsToUse: [
      'Go to "Ask Your Data AI".',
      'Type your question in the chat input or click one of the suggested query chips.',
      'Press Enter to submit.',
      'Read the grounded mathematical breakdown and strategic business implications.'
    ],
    proTip: 'Try asking comparative questions like "Compare Profit Margin between North and West regions" for instant cross-tabulation.',
    outputArtifact: 'Conversational Data Findings, Grounded Calculations, Action Plans'
  },
  {
    id: 'reports',
    category: 'decision',
    categoryLabel: 'Decision & AI',
    title: 'Executive Reports & Briefings',
    icon: FileSpreadsheet,
    tag: 'Formal Reporting',
    badge: 'Print / PDF Ready',
    summary: 'Boardroom-ready executive briefing generator summarizing strategic health, KPI scorecards, risk registers, and operational action plans formatted for PDF printing.',
    whatYouCanDo: [
      'Auto-generates C-Level executive narrative reports from live active metrics.',
      'Includes Executive Summary, Financial KPI Scorecard, Risk Register, and Strategic Growth Pillars.',
      'Print-ready styling: fully compatible with browser print and PDF generation.',
      'Customizable report title, author, department, and company branding.'
    ],
    stepsToUse: [
      'Open "Executive Reports".',
      'Select a report template (C-Suite Briefing, Monthly Financial Review, Risk Audit).',
      'Review the rendered narrative and data tables.',
      'Click "Print / Save PDF" in the top right to download a formatted executive PDF.'
    ],
    proTip: 'In the browser print dialog, select "Save as PDF" and enable "Background Graphics" for optimal card styling.',
    outputArtifact: 'Board-Ready Executive PDF Reports, Formatted Financial Briefings'
  },
  {
    id: 'data_dictionary',
    category: 'decision',
    categoryLabel: 'Decision & AI',
    title: 'Data Dictionary & Lineage DAG',
    icon: BookOpen,
    tag: 'Governance',
    badge: 'Pipeline Tracing',
    summary: 'Enterprise data catalog defining every column, business purpose, valid ranges, and an end-to-end lineage DAG tracing data from ingestion to dashboard visual.',
    whatYouCanDo: [
      'Browse complete field dictionary with column names, descriptions, data types, sample values, and nullability.',
      'Interactive visual Data Lineage DAG tracing fields through Ingestion → Cleaning → Star Schema → DAX → Charts.',
      'Identify upstream dependencies before renaming or altering any column.',
      'Export Data Dictionary to Markdown (DATA_DICTIONARY.md) for Git repositories.'
    ],
    stepsToUse: [
      'Navigate to "Data Dictionary & Lineage".',
      'Search any column in the dictionary table to inspect its business semantics.',
      'Switch to the "Lineage DAG" tab to visually trace data pipelines from source to visual.',
      'Click "Export Dictionary (.md)" to save the documentation.'
    ],
    proTip: 'Refer to this module whenever new team members join to quickly onboard them onto your data definitions.',
    outputArtifact: 'DATA_DICTIONARY.md, Interactive Lineage DAG, Metadata Catalog'
  },
  {
    id: 'export_center',
    category: 'export',
    categoryLabel: 'Packages & Export',
    title: 'Export Center (14-Folder ZIP & Power BI PBIP)',
    icon: FolderDown,
    tag: 'Enterprise Delivery',
    badge: '14-Folder Production ZIP',
    summary: 'The ultimate handoff packaging engine that bundles the entire project into a 14-folder archive, native Microsoft Power BI PBIP files, Excel models, and documentation.',
    whatYouCanDo: [
      'Download complete 14-folder .zip archive structured with enterprise naming standards.',
      'Includes native Microsoft Power BI Developer Project (.pbip, .report, .dataset).',
      'Includes master Excel model with clean data and pre-built pivot structure.',
      'Includes DAX files, SQL scripts, Python notebooks, Power Query M scripts, and themes.',
      'Includes export_manifest.json with SHA256 integrity verification hashes.'
    ],
    stepsToUse: [
      'Go to "Export Center" from the navbar button or sidebar.',
      'Review the manifest preview listing all 14 folders and included files.',
      'Click the primary button "DOWNLOAD COMPLETE 14-FOLDER PROJECT (.ZIP)".',
      'Extract the ZIP file on your computer and open the .pbip file in Power BI Desktop.'
    ],
    proTip: 'The exported archive is 100% self-contained and does not require active internet or proprietary cloud subscriptions.',
    outputArtifact: 'Complete 14-Folder ZIP Package, Native .pbip Power BI Project, Master Excel Model'
  },
  {
    id: 'how_to_modify',
    category: 'export',
    categoryLabel: 'Packages & Export',
    title: 'How to Modify Project Manual',
    icon: Wrench,
    tag: 'Maintenance',
    badge: 'SOP Documentation',
    summary: 'Standard operating manual for monthly data updates, adding new columns, refreshing Power Query connections, and handing off projects to client analysts.',
    whatYouCanDo: [
      'Step-by-step instructions for monthly transaction refreshes.',
      'Guidelines for adding new business dimensions without breaking existing DAX measures.',
      'How to configure the pSourceFilePath parameter in Power BI Desktop.',
      'How to customize themes and brand palettes in Power BI.'
    ],
    stepsToUse: [
      'Open "How to Modify Project".',
      'Follow Steps 01 to 06 sequentially when updating data next month.',
      'Apply the recommended best practice highlighted in each step card.'
    ],
    proTip: 'Keep column names identical in Row 1 of your update spreadsheet to preserve all downstream DAX calculations.',
    outputArtifact: 'Standard Operating Procedures (SOP), Refresh Instructions, Maintenance Guide'
  },
  {
    id: 'settings',
    category: 'export',
    categoryLabel: 'Packages & Export',
    title: 'Settings, Themes & White-Label Branding',
    icon: Settings,
    tag: 'Customization',
    badge: 'Branding Engine',
    summary: 'White-label configuration center to customize company name, department, author, brand theme colors, and download custom Power BI Theme JSON files.',
    whatYouCanDo: [
      'Update Company Name, Tagline, Department, and Lead Analyst Author.',
      'Customize Brand Primary Color, Accent Color, and Background Palette.',
      'Download customized Power BI Theme.json for corporate visual branding.',
      'Reset platform settings or restore default configurations.'
    ],
    stepsToUse: [
      'Navigate to "Settings & Branding".',
      'Edit company name and color pickers.',
      'Click "Save Branding Configurations".',
      'Download the generated Theme.json to apply inside Power BI Desktop.'
    ],
    proTip: 'Theme color changes immediately update all chart accents and export metadata.',
    outputArtifact: 'Corporate Theme.json for Power BI, White-Label Project Metadata'
  }
];

export const HowToUseView: React.FC = () => {
  const { setCurrentTab, themeMode, setThemeMode } = usePlatform();
  const isLight = themeMode === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter modules based on search and category
  const filteredModules = MODULES.filter(m => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.whatYouCanDo.some(item => item.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'All Modules', count: MODULES.length },
    { id: 'core', label: 'Core & Dashboards', count: MODULES.filter(m => m.category === 'core').length },
    { id: 'ingestion', label: 'Ingestion & Quality', count: MODULES.filter(m => m.category === 'ingestion').length },
    { id: 'analytics', label: 'Modeling & Analytics', count: MODULES.filter(m => m.category === 'analytics').length },
    { id: 'labs', label: 'Code Labs & DAX', count: MODULES.filter(m => m.category === 'labs').length },
    { id: 'decision', label: 'AI & Governance', count: MODULES.filter(m => m.category === 'decision').length },
    { id: 'export', label: 'Export & Delivery', count: MODULES.filter(m => m.category === 'export').length }
  ];

  const quickWorkflowSteps = [
    {
      num: '01',
      title: 'Ingest Raw Data',
      desc: 'Upload CSV/Excel file or connect live PostgreSQL/MySQL database. Alternatively, click any demo dataset to start instantly.',
      targetTab: 'upload' as NavigationTab
    },
    {
      num: '02',
      title: 'Audit & Clean',
      desc: 'Audit health score in Quality Auditor, then fix missing values and duplicates with zero-code visual recipes in Cleaning Lab.',
      targetTab: 'quality' as NavigationTab
    },
    {
      num: '03',
      title: 'Star Schema & DAX',
      desc: 'Decompose flat data into normalized Fact & Dimension tables with ERD diagram, and generate 20+ Time Intelligence DAX measures.',
      targetTab: 'modeling' as NavigationTab
    },
    {
      num: '04',
      title: 'Analyze & Visualize',
      desc: 'Explore the Executive Dashboard, build custom visual cards, inspect correlations, or ask questions in plain English to Ask Data AI.',
      targetTab: 'executive_dashboard' as NavigationTab
    },
    {
      num: '05',
      title: 'Export Production ZIP',
      desc: 'Download the comprehensive 14-folder enterprise archive including native Power BI PBIP files, Excel model, and PDF report.',
      targetTab: 'export_center' as NavigationTab
    }
  ];

  const faqs = [
    {
      q: 'Can I upload custom enterprise Excel or CSV datasets?',
      a: 'Yes, absolutely. Navigate to "Upload Data" and drag & drop any .csv, .xlsx, or .json file. AcuityBI automatically profiles all columns, checks data health, computes statistical distributions, and generates customized Star Schemas for your dataset.'
    },
    {
      q: 'How does the theme switcher operate across all modules?',
      a: 'The segmented Light / Dark control in the top navigation bar synchronizes all application surfaces, cards, charts, and tooltips in real time. In Light Mode, all surfaces adapt with crisp, high-contrast dark text and clean elevation shadows; in Dark Mode, deep obsidian surfaces and neon green accents provide maximum visual telemetry comfort.'
    },
    {
      q: 'How do I open and run the exported project in Power BI Desktop?',
      a: 'Go to "Export Center" and click "Download Complete 14-Folder Project (.ZIP)". Once downloaded, extract the archive on your workstation. Open the "07_PowerBI_PBIP_Project/" folder and double-click the .pbip file. It opens directly inside Microsoft Power BI Desktop with data models, relationships, and DAX measures ready to use.'
    },
    {
      q: 'Are DAX formulas and analytical computations deterministic?',
      a: '100% deterministic. All mathematical algorithms, Pearson correlation matrices, Holt-Winters exponential smoothing forecasts, and DAX measures follow exact statistical formulas and Power BI DAX standards without arbitrary approximations.'
    },
    {
      q: 'How does the automated Star Schema generation work?',
      a: 'The Data Modeling engine inspects column cardinalities and semantic types to automatically separate flat records into Fact_Transactions and Dimension tables (Dim_Date, Dim_Customer, Dim_Product, Dim_Region), creating validated 1-to-many relationships that optimize Power BI query performance.'
    },
    {
      q: 'Can I connect to live production databases like PostgreSQL or MySQL?',
      a: 'Yes. The "Live Server & DB" module supports live connection strings and REST endpoints with custom SQL extraction queries, configurable polling heartbeats, and real-time streaming deltas.'
    }
  ];

  return (
    <div className="space-y-8 pb-20 animate-fadeIn max-w-6xl mx-auto px-2 sm:px-4">
      {/* ===================================================================== */}
      {/* HERO BANNER & SEARCH HEADER                                           */}
      {/* ===================================================================== */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all shadow-sm ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-100'
            : 'bg-[#1c1c1c] border-[#2d2d2d] text-white'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 text-xs font-bold font-mono uppercase tracking-wider rounded-lg flex items-center gap-1.5 ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30'
                }`}
              >
                <Compass className="w-3.5 h-3.5" /> Complete Platform Documentation
              </span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                17 Enterprise Modules
              </span>
            </div>

            <h1
              className={`font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight uppercase ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              How to Use Acuity<span className={isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}>BI</span>
            </h1>

            <p className={`text-sm sm:text-base leading-relaxed ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
              End-to-end user manual, module playbook, and architectural workflow directory. Learn how each module functions, key analytics capabilities, step-by-step procedures, and production delivery artifacts.
            </p>
          </div>

          {/* Quick Theme Switcher Shortcut */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <div
              className={`flex items-center justify-between p-2 rounded-xl border text-xs gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141414] border-[#2e2e2e]'
              }`}
            >
              <span className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                Display Theme:
              </span>
              <button
                onClick={() => setThemeMode(isLight ? 'dark' : 'light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                  isLight
                    ? 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-100'
                    : 'bg-[#262626] text-[#21F1A8] border border-[#21F1A8]/40 hover:bg-[#303030]'
                }`}
              >
                {isLight ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#21F1A8] fill-[#21F1A8]" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Global Search inside How to Use */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-[#2a2a2a] flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search
              className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                isLight ? 'text-slate-400' : 'text-gray-400'
              }`}
            />
            <input
              type="text"
              placeholder="Search guide by module, capability, or keyword (e.g., DAX, SQL, cleaning, Power BI, ERD, forecast)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full text-xs sm:text-sm pl-10 pr-8 py-2.5 rounded-xl border transition-all focus:outline-none ${
                isLight
                  ? 'bg-slate-50 text-slate-900 border-slate-300 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                  : 'bg-[#151515] text-white border-[#333] placeholder:text-gray-500 focus:border-[#21F1A8]'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs p-1 rounded transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-gray-400 hover:text-white'
                }`}
              >
                ✕
              </button>
            )}
          </div>

          <div className={`text-xs font-mono shrink-0 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
            Showing {filteredModules.length} of {MODULES.length} modules
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5-STEP RAPID LIFECYCLE (HOW ACUITYBI WORKS END-TO-END)                 */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        <div>
          <h2
            className={`font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            ⚡ 5-Step Rapid Enterprise Lifecycle
          </h2>
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
            The standard production pipeline from raw telemetry ingestion to board-ready executive intelligence and Power BI PBIP bundles.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {quickWorkflowSteps.map((step) => (
            <div
              key={step.num}
              onClick={() => setCurrentTab(step.targetTab)}
              className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md'
                  : 'bg-[#1c1c1c] border-[#2d2d2d] hover:border-[#21F1A8]/60 hover:shadow-lg'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      isLight
                        ? 'bg-slate-100 text-slate-800 border border-slate-200'
                        : 'bg-[#262626] text-[#21F1A8] border border-[#333]'
                    }`}
                  >
                    STEP {step.num}
                  </span>
                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-1 ${
                      isLight ? 'text-emerald-700' : 'text-[#21F1A8]'
                    }`}
                  />
                </div>

                <h3
                  className={`font-heading text-sm font-bold uppercase tracking-wide group-hover:underline ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {step.title}
                </h3>

                <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  {step.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#262626] flex items-center justify-between text-[11px] font-semibold">
                <span className={isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}>
                  Open Module →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CATEGORY FILTER TABS                                                  */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? isLight
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold'
                    : 'bg-[#21F1A8] text-black border-[#21F1A8] font-bold'
                  : isLight
                    ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    : 'bg-[#191919] text-gray-400 border-[#2d2d2d] hover:text-white hover:bg-[#222]'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive
                    ? isLight
                      ? 'bg-emerald-800 text-white'
                      : 'bg-black/30 text-black'
                    : isLight
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-[#262626] text-gray-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* MODULE DIRECTORY CARDS (THE MAIN HOW TO USE LIST)                     */}
      {/* ===================================================================== */}
      <div className="space-y-6">
        {filteredModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              className={`p-6 sm:p-7 rounded-2xl border transition-all ${
                isLight
                  ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md'
                  : 'bg-[#1c1c1c] border-[#2d2d2d] hover:border-[#383838]'
              }`}
            >
              {/* Card Header: Icon, Category, Title, Badge, Open Button */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      isLight
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
                        : 'bg-[#21F1A8]/10 text-[#21F1A8] border-[#21F1A8]/30'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded ${
                          isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-[#262626] text-gray-300'
                        }`}
                      >
                        {mod.categoryLabel}
                      </span>
                      <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        • {mod.tag}
                      </span>
                      {mod.badge && (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                            isLight
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30'
                          }`}
                        >
                          {mod.badge}
                        </span>
                      )}
                    </div>

                    <h2
                      className={`font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {mod.title}
                    </h2>
                  </div>
                </div>

                {/* Direct Action Button */}
                <button
                  onClick={() => setCurrentTab(mod.id)}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all shrink-0 shadow-xs ${
                    isLight
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#21F1A8] hover:bg-[#1cdb97] text-black font-bold'
                  }`}
                >
                  <span>Launch Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Summary Paragraph */}
              <div className="mt-4">
                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                  {mod.summary}
                </p>
              </div>

              {/* Symmetrical Grid: Capabilities vs Workflow */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Column 1: Core Capabilities & Analytics */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#161616] border-[#262626]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
                    <h3
                      className={`font-heading text-sm font-bold uppercase tracking-wider ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      Core Capabilities & Features
                    </h3>
                  </div>

                  <ul className="space-y-2 text-xs">
                    {mod.whatYouCanDo.map((item, i) => (
                      <li key={i} className={`flex items-start gap-2 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            isLight ? 'bg-emerald-600' : 'bg-[#21F1A8]'
                          }`}
                        />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 2: Execution Workflow & Steps */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#161616] border-[#262626]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Play className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
                    <h3
                      className={`font-heading text-sm font-bold uppercase tracking-wider ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      Step-by-Step Procedure
                    </h3>
                  </div>

                  <ol className="space-y-2 text-xs">
                    {mod.stepsToUse.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                            isLight
                              ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs'
                              : 'bg-[#222] text-[#21F1A8] border border-[#333]'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className={`leading-relaxed ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>

                  {/* Pro Tip Box */}
                  <div
                    className={`mt-3 p-2.5 rounded-lg border flex items-start gap-2 text-xs ${
                      isLight
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-[#14221b] border-[#21F1A8]/30 text-[#8efad3]'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      <strong>Pro Tip:</strong> {mod.proTip}
                    </span>
                  </div>
                </div>
              </div>

              {/* Output Artifact Footer */}
              <div
                className={`mt-4 pt-3 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs ${
                  isLight ? 'border-slate-100 text-slate-600' : 'border-[#262626] text-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
                  <span className="font-semibold">Deliverable Artifact:</span>
                  <span className={isLight ? 'text-slate-800 font-mono text-[11px]' : 'text-gray-300 font-mono text-[11px]'}>
                    {mod.outputArtifact}
                  </span>
                </div>

                <button
                  onClick={() => setCurrentTab(mod.id)}
                  className={`text-xs font-semibold flex items-center gap-1 hover:underline ${
                    isLight ? 'text-emerald-700' : 'text-[#21F1A8]'
                  }`}
                >
                  <span>Open {mod.title}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredModules.length === 0 && (
          <div
            className={`p-12 text-center rounded-2xl border ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#1c1c1c] border-[#2d2d2d]'
            }`}
          >
            <p className={`text-base font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
              No modules found matching "{searchQuery}".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-3 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* FREQUENTLY ASKED QUESTIONS & TROUBLESHOOTING                          */}
      {/* ===================================================================== */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#1c1c1c] border-[#2d2d2d]'
        }`}
      >
        <div className="mb-6">
          <h2
            className={`font-heading text-2xl font-bold uppercase tracking-wide ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            ❓ Frequently Asked Questions
          </h2>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
            Common technical and operational questions regarding data workflows, export compatibility, and security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#171717] border-[#282828]'
              }`}
            >
              <div>
                <h4
                  className={`font-heading text-sm font-bold uppercase tracking-wide flex items-start gap-2 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  <span className={isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}>Q:</span>
                  <span>{faq.q}</span>
                </h4>
                <p className={`mt-2 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
                  {faq.a}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-[#222] flex items-center gap-1.5 text-[11px]">
                <Check className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-[#21F1A8]'}`} />
                <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                  Verified Enterprise Architecture
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
