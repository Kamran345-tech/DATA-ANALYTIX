import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
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
  FolderDown, 
  Wrench, 
  Settings, 
  Sun, 
  Moon, 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  Play, 
  Compass, 
  Layers, 
  Zap, 
  FileCheck,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';

interface ModuleGuide {
  id: NavigationTab;
  category: 'core' | 'ingestion' | 'analytics' | 'labs' | 'decision' | 'export';
  categoryLabel: string;
  title: string;
  urduTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  badge?: string;
  summary: string;
  urduSummary: string;
  whatYouCanDo: string[];
  urduWhatYouCanDo: string[];
  stepsToUse: string[];
  proTip: string;
}

const MODULES: ModuleGuide[] = [
  {
    id: 'executive_dashboard',
    category: 'core',
    categoryLabel: 'Core Platform',
    title: 'Executive Dashboard & KPI Center',
    urduTitle: 'ایگزیکٹو ڈیش بورڈ اور کے پی آئی سینٹر (Main Business Overview)',
    icon: LayoutDashboard,
    tag: 'Monitoring & KPIs',
    badge: 'Auto-Generated',
    summary: 'High-level executive control center presenting company-wide revenue, profit margins, orders, AOV, YoY growth, and interactive multidimensional charts.',
    urduSummary: 'Yeh main dashboard hai jahan business k saray key metrics (Revenue, Profit, Growth) aik jagah live visual charts k sath nazar atay han.',
    whatYouCanDo: [
      'Monitor top business metrics (Total Revenue, Gross Profit, Profit Margin, Volume, Average Order Value).',
      'Filter interactively by Date Range, Region, Customer Segment, or Product Category.',
      'Click on any KPI card or chart bar to trigger Granular Drill-Through inspection into raw rows.',
      'Enter full-screen Presentation Mode for C-suite meetings and client presentations.',
      'Rename dashboard title and customize executive notes in real time.'
    ],
    urduWhatYouCanDo: [
      'Company ka kul munafa, sales, aur order volume foran check karein.',
      'Tareekh (Date), Region, ya Category k hisab se data filter karein.',
      'Kisi b metric pe click kr k andar tak transactions detail (Drill-through) dekh skty han.',
      'Presentation mode on kr k poori screen pe clean view chala skty han.'
    ],
    stepsToUse: [
      'Open Executive Dashboard from the top navbar or sidebar.',
      'Use the top Global Search bar or filter dropdowns to narrow down specific timeframes or segments.',
      'Hover over charts to inspect exact amounts; click any element to open granular row records.',
      'Click the Maximize icon in the top header to enter distraction-free Presentation Mode.'
    ],
    proTip: 'Every chart responds automatically to data cleaned in the Cleaning Lab and modeled in Star Schema.'
  },
  {
    id: 'upload',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Upload Data & File Ingestion',
    urduTitle: 'ڈیٹا اپ لوڈ اور فائل انٹیک (CSV, Excel, JSON)',
    icon: UploadCloud,
    tag: 'Data Intake',
    badge: 'Drag & Drop',
    summary: 'Intake engine that accepts raw CSV, Excel (XLSX), or JSON files with automated type detection, schema profiling, and pre-loaded enterprise demo datasets.',
    urduSummary: 'Yahan ap apni company ki Excel ya CSV file upload kr skty han, ya pre-loaded demo business data foran load kr skty han.',
    whatYouCanDo: [
      'Drag and drop any business CSV or XLSX dataset directly from your computer.',
      'Instant automated detection of row counts, column counts, delimiters, and file sizes.',
      'Load one of 4 rich enterprise demo datasets (Retail Omnichannel, SaaS Subscriptions, Healthcare Logistics, Financial Ops).',
      'Raw data immutability: original file remains archived in 01_Original_Data/ without risk of data loss.'
    ],
    urduWhatYouCanDo: [
      'Apni CSV ya Excel sheet drag & drop karein ya demo dataset choose karein.',
      'Data ki rows, columns, aur total size foran profile ho jati hai.',
      'Asli raw data hamesha mehfooz rehta hai aur kabhi overwrite nhi hota.'
    ],
    stepsToUse: [
      'Go to "Upload Data" from the top navigation or sidebar.',
      'Drop your file in the upload zone OR click one of the 4 demo cards below.',
      'Wait 1-2 seconds as the deterministic parser detects dates, numbers, text, and keys.',
      'NexusBI will automatically route you to Data Preview and refresh all analytics.'
    ],
    proTip: 'Ensure Row 1 contains clear column headers (e.g. OrderDate, CustomerID, Revenue) for best automated modeling.'
  },
  {
    id: 'live_connector',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Live Server & Database Connector',
    urduTitle: 'لائیو ڈیٹا بیس کنیکٹر (PostgreSQL, MySQL, SQL Server, API)',
    icon: Database,
    tag: 'Real-Time Sync',
    badge: 'Live Stream',
    summary: 'Direct streaming connection to production databases (PostgreSQL, MySQL, Microsoft SQL Server, Snowflake, or REST API endpoints) with scheduled auto-refresh.',
    urduSummary: 'Agar apka data live database (PostgreSQL, MySQL ya REST API) me hai to yahan se direct connect kr k real-time sync chala skty han.',
    whatYouCanDo: [
      'Connect to PostgreSQL, MySQL, SQL Server, or REST API endpoints.',
      'Execute live extraction queries with custom WHERE clauses and limits.',
      'Set automated streaming polling intervals (every 10s, 30s, 60s, or manual heartbeat).',
      'Monitor live latency, heartbeat pulse, fetch counts, and real-time rows delta.'
    ],
    urduWhatYouCanDo: [
      'Direct server IP, Database name, aur Table daal kr data khainchein.',
      'Auto-refresh timer set karein ta k naya data khud ba khud sync ho jaye.',
      'Real-time status aur last synced timestamp live monitor karein.'
    ],
    stepsToUse: [
      'Navigate to "Live Server & DB" tab.',
      'Select your database engine (PostgreSQL, MySQL, SQL Server, REST API).',
      'Enter host/port credentials or use the pre-configured Sandbox Demo DB.',
      'Click "Test & Connect Stream" then "Sync Live Stream Now".'
    ],
    proTip: 'Use WHERE clauses in the SQL query box to filter only active fiscal year transactions for maximum performance.'
  },
  {
    id: 'preview',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Data Preview & Profiling',
    urduTitle: 'ڈیٹا پری ویو اور کالم پروفائلنگ (Inspect Columns & Cardinality)',
    icon: Table2,
    tag: 'Exploration',
    summary: 'Deep tabular inspector displaying column types, cardinalities, null ratios, unique value distributions, and primary key candidates.',
    urduSummary: 'Yahan ap dataset ka poora table dekh skty han, hr column ki type (Date, Number, Text) aur unique values check kr skty han.',
    whatYouCanDo: [
      'Inspect clean rows with dynamic search, multi-column sorting, and pagination.',
      'View individual column profiles: distinct count, null count, null percentage, and detected data types.',
      'Identify Primary Key (PK) candidates (columns with 100% uniqueness).',
      'Detect categorical dimension candidates vs continuous numerical measures.'
    ],
    urduWhatYouCanDo: [
      'Table me kisi b row ya value ko search aur sort karein.',
      'Check karein k kis column me null ya khali values han.',
      'Dekhein kon sa column primary key ban skta hai.'
    ],
    stepsToUse: [
      'Go to "Data Preview & Profile".',
      'Use the search box to find specific values or customer records.',
      'Click on any column header to toggle ascending/descending order.',
      'Review the summary cards at top for total rows, total columns, and storage memory footprint.'
    ],
    proTip: 'Look at the "Distinct Count" ratio: high cardinality indicates IDs/names, while low cardinality indicates dimensions (Region, Segment).'
  },
  {
    id: 'quality',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Data Quality Auditor',
    urduTitle: 'ڈیٹا کوالٹی آڈیٹر (Completeness, Uniqueness, Validity Scoring)',
    icon: ShieldAlert,
    tag: 'Governance',
    badge: 'Score 0-100%',
    summary: 'Automated 4-pillar data quality audit engine measuring Completeness, Uniqueness, Validity, and Consistency, with exportable Audit Certificate.',
    urduSummary: 'Yeh module data k nuqs (errors, duplicates, missing values, outliers) nikaalta hai aur 100 me se overall Quality Score deta hai.',
    whatYouCanDo: [
      'Instant 0-100% Quality Score across Completeness, Uniqueness, Validity, and Consistency.',
      'Automatic detection of missing values, duplicate rows, whitespace pollution, and statistical outliers (IQR / Z-score).',
      'Prioritized issue list with severity levels (Critical, Warning, Informational).',
      'One-click "Fix in Cleaning Lab" button that pre-configures remedial transformation rules.',
      'Download formal Data Quality Audit Certificate for enterprise governance and compliance.'
    ],
    urduWhatYouCanDo: [
      'Apny data ka overall Health Score dekh skty han.',
      'Duplicate rows aur missing entries foran pakri jati han.',
      'Direct "Fix in Cleaning Lab" click kr k masla hal kr skty han.',
      'Official Data Quality Certificate download kr skty han.'
    ],
    stepsToUse: [
      'Open "Data Quality Auditor".',
      'Review the circular health gauge and four sub-scores.',
      'Read through the flagged issues table to see exact problematic row counts.',
      'Click "Remediate in Cleaning Lab" to automatically fix highlighted anomalies.'
    ],
    proTip: 'A quality score above 90% is recommended before deploying models to Power BI Desktop production.'
  },
  {
    id: 'cleaning',
    category: 'ingestion',
    categoryLabel: 'Data Ingestion',
    title: 'Data Cleaning Lab',
    urduTitle: 'ڈیٹا کلیننگ لیب (Visual ETL, Impute, Deduplicate, Transform)',
    icon: Wand2,
    tag: 'Data Prep',
    badge: 'Reversible ETL',
    summary: 'Visual, zero-code ETL pipeline to clean, impute, deduplicate, standardize, and transform messy datasets with full step-by-step undo and replay.',
    urduSummary: 'Yahan ap data ko saaf krty han: khali jaghein bharna (imputation), duplicate khatam krna, text theek krna, sab baghair coding k.',
    whatYouCanDo: [
      'Impute missing values using Mean, Median, Mode, Custom Fallback, or Forward-fill.',
      'Deduplicate records based on composite keys or complete row matching.',
      'Text standardization: Trim whitespace, UPPERCASE, lowercase, Title Case, regex cleanup.',
      'Type casting: Convert text dates to ISO format, strings to numbers, numbers to text.',
      'Filter and remove invalid negative prices or outlier test transactions.',
      'Full recipe audit log: Inspect every transformation step with instant Undo and Reset.'
    ],
    urduWhatYouCanDo: [
      'Missing values ko average ya median se fill karein.',
      'Duplicate rows ko aik click me delete karein.',
      'Spelling aur text cases (Capital/Small) theek karein.',
      'Koi ghalat step ho jaye to "Undo" kr k wapis purani halat me le ayen.'
    ],
    stepsToUse: [
      'Go to "Data Cleaning Lab".',
      'Select the target column and choose a transformation recipe from the dropdown.',
      'Configure parameters (e.g., replacement text or numeric strategy) and click "Apply Transformation".',
      'Review the live Before/After preview table; use "Undo Step" if needed.'
    ],
    proTip: 'NexusBI records every transformation into PowerQuery_Transformations.m so Power BI Desktop replicates your exact cleaning steps.'
  },
  {
    id: 'modeling',
    category: 'analytics',
    categoryLabel: 'Analytics & Modeling',
    title: 'Data Modeling & ERD Diagram',
    urduTitle: 'ڈیٹا ماڈلنگ اور ای آر ڈی ڈایاگرام (Star & Snowflake Schema)',
    icon: Network,
    tag: 'Architecture',
    badge: 'Star Schema',
    summary: 'Automated Dimensional Modeling engine that splits flat datasets into normalized Fact and Dimension tables connected by validated 1-to-Many relationships.',
    urduSummary: 'Yeh module flat table ko Power BI k best practice "Star Schema" me divide krta hai (Fact Table aur Dimension Tables banata hai).',
    whatYouCanDo: [
      'Automatic decomposition into Fact_Transactions and Dimension tables (Dim_Date, Dim_Customer, Dim_Product, Dim_Region).',
      'Visual interactive ERD (Entity Relationship Diagram) showing primary-to-foreign key links ($1 \\to *$).',
      'Referential integrity checking to ensure no orphaned foreign keys exist.',
      'Auto-generation of Dim_Date with Year, Quarter, Month, Week, DayOfWeek, and Fiscal calendars.',
      'Export schema definitions in Power Query M script and relational SQL DDL.'
    ],
    urduWhatYouCanDo: [
      'Poora Star Schema visually diagram me dekhein.',
      'Fact aur Dimension tables k darmiyan links (Relationships) check karein.',
      'Automated Date Dimension hasil karein jis se Time Intelligence DAX chalti hai.'
    ],
    stepsToUse: [
      'Navigate to "Data Modeling (ERD)".',
      'Explore the visual ERD canvas showing tables and connecting relationship lines.',
      'Click on any table card to inspect its fields, primary key, and row count.',
      'Review the validation panel at bottom to verify referential integrity.'
    ],
    proTip: 'Star Schema provides up to 10x faster query execution in Power BI VertiPaq engine compared to a single flat table.'
  },
  {
    id: 'analysis',
    category: 'analytics',
    categoryLabel: 'Analytics & Modeling',
    title: 'Statistical Analysis Engine',
    urduTitle: 'شماریاتی تجزیہ اور پیش گوئی (Descriptive Stats, Correlation & Forecasts)',
    icon: TrendingUp,
    tag: 'Advanced Math',
    summary: 'Rigorous mathematical engine computing descriptive statistics, Pearson correlation heatmaps, Holt-Winters exponential smoothing forecasts, and anomaly detection.',
    urduSummary: 'Yahan ap dataset ka scientific math analysis, correlation matrix, aur agly 6 maheenon ki predictive forecast dekh skty han.',
    whatYouCanDo: [
      'Compute descriptive stats: Mean, Median, Mode, Std Dev, Variance, Skewness, Kurtosis.',
      'Interactive Pearson Correlation Matrix ($r \\in [-1.0, 1.0]$) between all numerical metrics.',
      '3-Month and 6-Month Holt-Winters exponential smoothing forecasts with upper/lower confidence intervals.',
      'Automated anomaly detection identifying statistical spikes and sudden drop-offs.',
      'Actionable business opportunities generated from multi-variable regressions.'
    ],
    urduWhatYouCanDo: [
      'Her metric ki average, spread, aur variance check karein.',
      'Dekhein kon se do variables apas me jurey huay han (Correlation heatmap).',
      'Aany walay maheenon ki Sales forecast graph me dekhein.',
      'Data me achanak anay walay ajeeb jhatkay (Anomalies) pakrein.'
    ],
    stepsToUse: [
      'Open "Statistical Analysis".',
      'Switch between "Overview & Stats", "Correlation Heatmap", and "Predictive Forecasts" sub-tabs.',
      'Hover over cells in the correlation matrix to see exact Pearson $r$ coefficient and $p$-values.',
      'Examine the Forecast chart to see projected trajectory vs historical numbers.'
    ],
    proTip: 'Strong positive correlations ($r > 0.70$) between discounts and order volume reveal high price elasticity.'
  },
  {
    id: 'dax_lab',
    category: 'labs',
    categoryLabel: 'Code Labs & DAX',
    title: 'DAX Lab & Formula Studio',
    urduTitle: 'ڈیکس لیب اور فارمولا اسٹوڈیو (Power BI DAX Generator & Tester)',
    icon: Code2,
    tag: 'Power BI Code',
    badge: '20+ Measures',
    summary: 'Production Power BI DAX studio auto-generating base aggregations, profit margins, and Time Intelligence measures (YTD, QTD, YoY Growth) with instant evaluation.',
    urduSummary: 'Power BI k DAX formulas (SUM, TOTALYTD, SAMEPERIODLASTYEAR) banayein, test karein, aur aik click me copy kr k Power BI me paste karein.',
    whatYouCanDo: [
      'Auto-generates 20+ production-grade DAX measures tailored specifically to your dataset.',
      'Time Intelligence: TOTALYTD, TOTALQTD, SAMEPERIODLASTYEAR, MoM Growth %, YoY Delta.',
      'Ratio & Margin formulas: Gross Margin %, Profitability Index, Cumulative Running Totals.',
      'In-browser formula evaluator: test DAX calculations against active clean rows.',
      'One-click "Copy DAX" button formatted with proper capitalization and comments.'
    ],
    urduWhatYouCanDo: [
      'Tayyar DAX formulas hasil karein jin ko hath se likhne ki zaroorat nhi.',
      'Time Intelligence measures (YTD, YoY Growth) test karein.',
      'Copy button dabayein aur direct Power BI Desktop me paste karein.'
    ],
    stepsToUse: [
      'Go to "DAX Lab".',
      'Browse measures by category: Base Aggregations, Time Intelligence, Ratios, or Advanced.',
      'Click any measure to inspect its syntax, description, and dynamic preview result.',
      'Click "Copy DAX Code" to paste directly into Power BI Desktop "New Measure" box.'
    ],
    proTip: 'All generated measures use fully qualified references (`Table[Column]`) for strict Power BI best practice compliance.'
  },
  {
    id: 'sql_lab',
    category: 'labs',
    categoryLabel: 'Code Labs & DAX',
    title: 'SQL Lab (Deterministic Engine)',
    urduTitle: 'ایس کیو ایل لیب (Live SQL Sandbox & Analytical Queries)',
    icon: Database,
    tag: 'Query Sandbox',
    badge: 'In-Browser SQL',
    summary: 'In-browser relational SQL sandbox querying your clean dataset with pre-loaded analytical query templates, CTEs, window functions, and instant export.',
    urduSummary: 'Yahan ap SQL queries likh kr live data query kr skty han (SELECT, GROUP BY, Window Functions) aur results CSV me export kr skty han.',
    whatYouCanDo: [
      'Execute standard SQL (`SELECT`, `WHERE`, `JOIN`, `GROUP BY`, `HAVING`, `ORDER BY`).',
      'Run pre-loaded analytical query templates: Pareto 80/20 Analysis, Monthly Cohort Retention, Top 10 Contributors, Moving Averages.',
      'Export query results directly to CSV or JSON with one click.',
      '"Apply Result as Working Dataset" to push query output back into NexusBI as the main active data.',
      'Real-time execution latency benchmark in milliseconds.'
    ],
    urduWhatYouCanDo: [
      'Apni marzi ki SQL query likhein ya pre-built templates chalayein.',
      'Group by kr k category-wise totals ya top customers nikaalein.',
      'Result ko CSV me download karein ya naya working dataset bana dein.'
    ],
    stepsToUse: [
      'Open "SQL Lab".',
      'Select a query template from the top dropdown or type your own SQL in the editor.',
      'Click "Run Query" (or press Ctrl + Enter).',
      'Inspect the tabulated results below the editor.'
    ],
    proTip: 'The table name `clean_data` represents your current cleaned rows; individual dimension tables like `dim_customer` are also queryable.'
  },
  {
    id: 'python_lab',
    category: 'labs',
    categoryLabel: 'Code Labs & DAX',
    title: 'Python Lab & Notebook Studio',
    urduTitle: 'پائتھن لیب اور نوٹ بک اسٹوڈیو (Pandas, NumPy & Scikit-Learn)',
    icon: FileCode2,
    tag: 'Data Science',
    summary: 'Automated Python code generator providing complete, executable Pandas, NumPy, and Scikit-learn scripts for machine learning, clustering, and regressions.',
    urduSummary: 'Data Science k liye Pandas aur Scikit-Learn scripts: K-Means clustering, linear regression, aur visualization code jo Colab me chal sakay.',
    whatYouCanDo: [
      'Auto-generated Python scripts for Data Profiling, Outlier Removal, K-Means Clustering, and Regression.',
      'Simulate script execution in-browser to preview console outputs and statistical tables.',
      'Download ready-to-run `.py` script or Jupyter Notebook (`.ipynb`).',
      'One-click copy formatted code for Google Colab or VS Code.'
    ],
    urduWhatYouCanDo: [
      'Pandas ka complete data analysis code hasil karein.',
      'Machine Learning (Clustering, Regression) k scripts generate karein.',
      '.py file ya Jupyter Notebook download karein.'
    ],
    stepsToUse: [
      'Navigate to "Python Lab".',
      'Select an analytics script from the sidebar (e.g., "K-Means Customer Segmentation").',
      'Click "Execute Python Script" to see simulated output in the terminal console.',
      'Click "Download Notebook (.ipynb)" or "Copy Code".'
    ],
    proTip: 'All Python scripts include requirements comments (`pip install pandas numpy scikit-learn matplotlib seaborn`) for effortless setup.'
  },
  {
    id: 'dashboard_builder',
    category: 'core',
    categoryLabel: 'Core Platform',
    title: 'Custom Dashboard Builder',
    urduTitle: 'کسٹم ڈیش بورڈ بلڈر (Build Your Own Custom Visual Layout)',
    icon: SlidersHorizontal,
    tag: 'Drag & Drop Canvas',
    summary: 'Interactive visualization designer to create custom chart cards (Bar, Line, Area, Donut, Scatter, Funnel) aggregated by any dimension and metric.',
    urduSummary: 'Yahan ap apni marzi k custom charts bana skty han: chart type, dimension (X-axis) aur measure (Y-axis) select kr k dashboard sajayein.',
    whatYouCanDo: [
      'Create new custom visual cards: Bar Chart, Line Chart, Area Chart, Donut/Pie, Funnel, KPI Counter.',
      'Select X-Axis categorical dimension (e.g., Region, Category, Sales Rep).',
      'Select Y-Axis numerical metric with aggregation functions (SUM, AVG, COUNT, MIN, MAX).',
      'Reorder, edit, or delete visuals dynamically.',
      'Visuals immediately respond to global search queries and date filters.'
    ],
    urduWhatYouCanDo: [
      'Naye charts banayein aur unka design set karein.',
      'X-axis aur Y-axis pe apni marzi k columns select karein.',
      'Bar, Line, Pie ya Funnel chart choose kr k save karein.'
    ],
    stepsToUse: [
      'Open "Dashboard Builder".',
      'Click "+ Add New Visual".',
      'Choose visual type, title, dimension column, metric column, and aggregation (SUM/AVG).',
      'Click "Save Visual" to render it instantly on the interactive canvas.'
    ],
    proTip: 'Use Donut charts for categories with $\\le 5$ items, and Bar charts for high-cardinality dimensions like Product Subcategories.'
  },
  {
    id: 'ai_insights',
    category: 'decision',
    categoryLabel: 'Decision & AI',
    title: 'Ask Your Data AI (Grounded Insights)',
    urduTitle: 'ڈیٹا اے آئی سے سوال پوچھیں (Conversational AI Analyst)',
    icon: Sparkles,
    tag: 'Natural Language BI',
    badge: '100% Grounded',
    summary: 'Conversational business intelligence analyst providing grounded mathematical answers, root-cause analyses, and strategic recommendations without hallucinations.',
    urduSummary: 'Apny data se aam zuban (English ya Roman Urdu) me sawal poochein, AI mathematically verify kr k accurate jawab aur chart de ga.',
    whatYouCanDo: [
      'Ask questions in natural language: "Which region had highest profit?", "Top 3 performing products", "Identify loss-making items".',
      'Deterministic grounding: every answer provides the exact formula and row evidence (no guessing).',
      'One-click suggested executive prompt chips for fast exploratory queries.',
      'Generates direct action items and strategic next steps for executives.'
    ],
    urduWhatYouCanDo: [
      'Sawal poochein: "Sab se zyada sale kis region me hui?", "Nuksan kis product me hai?".',
      'AI apko exact number aur saboot k sath jawab dega.',
      'Ready-made suggested questions pe click kr k foran insight lein.'
    ],
    stepsToUse: [
      'Go to "Ask Your Data AI".',
      'Type your question in the chat input or click one of the suggested query chips.',
      'Press Enter to submit.',
      'Read the grounded mathematical breakdown and strategic business implications.'
    ],
    proTip: 'Try asking comparative questions like "Compare Profit Margin between North and West regions" for instant cross-tabulation.'
  },
  {
    id: 'reports',
    category: 'decision',
    categoryLabel: 'Decision & AI',
    title: 'Executive Reports & Briefings',
    urduTitle: 'ایگزیکٹو رپورٹس اور بورڈ بریفنگ (Board-Ready Print/PDF Reports)',
    icon: FileSpreadsheet,
    tag: 'Formal Reporting',
    badge: 'Print / PDF Ready',
    summary: 'Boardroom-ready executive briefing generator summarizing strategic health, KPI scorecards, risk registers, and operational action plans formatted for PDF printing.',
    urduSummary: 'Board meeting k liye mukammal formal report: Summary, KPIs, Risks, aur Recommendations, jo direct PDF me save ya print ho skti hai.',
    whatYouCanDo: [
      'Auto-generates C-Level executive narrative reports from live active metrics.',
      'Includes Executive Summary, Financial KPI Scorecard, Risk Register, and Strategic Growth Pillars.',
      'Print-ready styling: fully compatible with `window.print` for crisp PDF generation.',
      'Customizable report title, author, department, and company branding.'
    ],
    urduWhatYouCanDo: [
      'Management k liye formal briefing report hasil karein.',
      'Direct "Print / Save PDF" button se high quality PDF download karein.',
      'Company logo, author name, aur department add karein.'
    ],
    stepsToUse: [
      'Open "Executive Reports".',
      'Select a report template (C-Suite Briefing, Monthly Financial Review, Risk Audit).',
      'Review the rendered narrative and data tables.',
      'Click "Print / Save PDF" in the top right to download a formatted executive PDF.'
    ],
    proTip: 'In the browser print dialog, select "Save as PDF" and enable "Background Graphics" for optimal card styling.'
  },
  {
    id: 'data_dictionary',
    category: 'decision',
    categoryLabel: 'Decision & AI',
    title: 'Data Dictionary & Lineage DAG',
    urduTitle: 'ڈیٹا ڈکشنری اور لینیج میپ (Field Governance & Pipeline Tracing)',
    icon: BookOpen,
    tag: 'Governance',
    summary: 'Enterprise data catalog defining every column, business purpose, valid ranges, and an end-to-end lineage DAG tracing data from ingestion to dashboard visual.',
    urduSummary: 'Yahan apko hr column ki business definition milti hai aur data ka poora rasta (Raw file -> Cleaning -> Star Schema -> Dashboard) nazar ata hai.',
    whatYouCanDo: [
      'Browse complete field dictionary with column names, descriptions, data types, sample values, and nullability.',
      'Interactive visual Data Lineage DAG tracing fields through Ingestion $\\to$ Cleaning $\\to$ Star Schema $\\to$ DAX $\\to$ Charts.',
      'Identify upstream dependencies before renaming or altering any column.',
      'Export Data Dictionary to Markdown (`DATA_DICTIONARY.md`) for Git repositories.'
    ],
    urduWhatYouCanDo: [
      'Hr column ka matlab aur valid range check karein.',
      'Lineage map se dekhein k konsa column kis chart me use ho rha hai.',
      'Data Dictionary ko Markdown file me export karein.'
    ],
    stepsToUse: [
      'Navigate to "Data Dictionary & Lineage".',
      'Search any column in the dictionary table to inspect its business semantics.',
      'Switch to the "Lineage DAG" tab to visually trace data pipelines from source to visual.',
      'Click "Export Dictionary (.md)" to save the documentation.'
    ],
    proTip: 'Refer to this module whenever new team members join to quickly onboard them onto your data definitions.'
  },
  {
    id: 'export_center',
    category: 'export',
    categoryLabel: 'Packages & Export',
    title: 'Export Center (14-Folder ZIP & Power BI PBIP)',
    urduTitle: 'ایکسپورٹ سینٹر (Complete 14-Folder Production ZIP & PBIP)',
    icon: FolderDown,
    tag: 'Enterprise Delivery',
    badge: '14-Folder ZIP',
    summary: 'The ultimate handoff packaging engine that bundles the entire project into a 14-folder archive, native Microsoft Power BI PBIP files, Excel models, and documentation.',
    urduSummary: 'Apna poora project aik click me download karein! Is me 14 folders hotay han: Power BI files, Excel model, DAX files, SQL queries, aur reports.',
    whatYouCanDo: [
      'Download complete 14-folder `.zip` archive structured with enterprise naming standards.',
      'Includes native Microsoft Power BI Developer Project (`.pbip`, `.report`, `.dataset`).',
      'Includes master Excel model with clean data and pre-built pivot structure.',
      'Includes DAX files, SQL scripts, Python notebooks, Power Query M scripts, and themes.',
      'Includes `export_manifest.json` with SHA256 integrity verification hashes.'
    ],
    urduWhatYouCanDo: [
      'Poora project ZIP file me download karein.',
      'Power BI Desktop me direct open hone wali files hasil karein.',
      'Clean Excel sheet aur SQL/Python scripts offline save karein.'
    ],
    stepsToUse: [
      'Go to "Export Center" from the navbar button or sidebar.',
      'Review the manifest preview listing all 14 folders and included files.',
      'Click the primary button "DOWNLOAD COMPLETE 14-FOLDER PROJECT (.ZIP)".',
      'Extract the ZIP file on your computer and open the `.pbip` file in Power BI Desktop.'
    ],
    proTip: 'The exported archive is 100% self-contained and does not require active internet or proprietary cloud subscriptions.'
  },
  {
    id: 'how_to_modify',
    category: 'export',
    categoryLabel: 'Packages & Export',
    title: 'How to Modify Project Manual',
    urduTitle: 'پروجیکٹ موڈیفائی کرنے کا طریقہ (Ongoing Maintenance & Monthly Refreshes)',
    icon: Wrench,
    tag: 'Maintenance',
    summary: 'Standard operating manual for monthly data updates, adding new columns, refreshing Power Query connections, and handing off projects to client analysts.',
    urduSummary: 'Agly maheenay naya data kaisy dalna hai, nayi columns kaisy add krni han, aur Power BI me Refresh kaisy krna hai, uska asaan tareeqa.',
    whatYouCanDo: [
      'Step-by-step instructions for monthly transaction refreshes.',
      'Guidelines for adding new business dimensions without breaking existing DAX measures.',
      'How to configure the `pSourceFilePath` parameter in Power BI Desktop.',
      'How to customize themes and brand palettes in Power BI.'
    ],
    urduWhatYouCanDo: [
      'Agly maheenay ka naya data add krny ka tareeqa seekhein.',
      'Naye columns add krty waqt hone wali ghaltiyon se bachein.',
      'Power BI me One-Click Refresh chalane ka method.'
    ],
    stepsToUse: [
      'Open "How to Modify Project".',
      'Follow Steps 01 to 06 sequentially when updating data next month.',
      'Apply the recommended best practice highlighted in each step card.'
    ],
    proTip: 'Keep column names identical in Row 1 of your update spreadsheet to preserve all downstream DAX calculations.'
  },
  {
    id: 'settings',
    category: 'export',
    categoryLabel: 'Packages & Export',
    title: 'Settings, Themes & White-Label Branding',
    urduTitle: 'سیٹنگز، تھیمز اور برانڈنگ (Custom Colors, Company Name & Logo)',
    icon: Settings,
    tag: 'Customization',
    summary: 'White-label configuration center to customize company name, department, author, brand theme colors, and download custom Power BI Theme JSON files.',
    urduSummary: 'Yahan ap apni company ka naam, logo, aur brand colors set kr skty han, jo direct dashboards aur Power BI theme me apply ho jaty han.',
    whatYouCanDo: [
      'Update Company Name, Tagline, Department, and Lead Analyst Author.',
      'Customize Brand Primary Color, Accent Color, and Background Palette.',
      'Download customized Power BI `Theme.json` for corporate visual branding.',
      'Reset platform settings or restore default configurations.'
    ],
    urduWhatYouCanDo: [
      'Company ka naam aur branding change karein.',
      'Theme colors choose kr k custom Power BI Theme.json download karein.',
      'Dashboard ko apny corporate look me dhal lein.'
    ],
    stepsToUse: [
      'Navigate to "Settings & Branding".',
      'Edit company name and color pickers.',
      'Click "Save Branding Configurations".',
      'Download the generated `Theme.json` to apply inside Power BI Desktop.'
    ],
    proTip: 'Theme color changes immediately update all chart accents and export metadata.'
  }
];

export const HowToUseView: React.FC = () => {
  const { setCurrentTab, themeMode, setThemeMode } = usePlatform();
  const isLight = themeMode === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUrdu, setShowUrdu] = useState<boolean>(true);
  const [activeTourIndex, setActiveTourIndex] = useState<number | null>(null);

  // Filter modules based on search and category
  const filteredModules = MODULES.filter(m => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch = 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.urduTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.whatYouCanDo.some(item => item.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'All Modules (تمام ماڈیولز)', count: MODULES.length },
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
      urdu: 'ڈیٹا اپ لوڈ کریں',
      desc: 'Upload CSV/Excel file or connect live PostgreSQL/MySQL database. Alternatively, click any demo dataset to start instantly.',
      targetTab: 'upload' as NavigationTab
    },
    {
      num: '02',
      title: 'Audit & Clean',
      urdu: 'کوالٹی آڈٹ اور صفائی',
      desc: 'Audit health score in Quality Auditor, then fix missing values and duplicates with zero-code visual recipes in Cleaning Lab.',
      targetTab: 'quality' as NavigationTab
    },
    {
      num: '03',
      title: 'Star Schema & DAX',
      urdu: 'اسٹار اسکیما اور فارمولے',
      desc: 'Decompose flat data into normalized Fact & Dimension tables with ERD diagram, and generate 20+ Time Intelligence DAX measures.',
      targetTab: 'modeling' as NavigationTab
    },
    {
      num: '04',
      title: 'Analyze & Visualize',
      urdu: 'ڈیش بورڈ اور چارٹس',
      desc: 'Explore the Executive Dashboard, build custom visual cards, inspect correlations, or ask questions in plain English to Ask Data AI.',
      targetTab: 'executive_dashboard' as NavigationTab
    },
    {
      num: '05',
      title: 'Export Production ZIP',
      urdu: 'پاور بی آئی زپ ڈاؤن لوڈ',
      desc: 'Download the comprehensive 14-folder enterprise archive including native Power BI PBIP files, Excel model, and PDF report.',
      targetTab: 'export_center' as NavigationTab
    }
  ];

  return (
    <div className="space-y-8 pb-20 animate-fadeIn max-w-6xl mx-auto">
      {/* ===================================================================== */}
      {/* HERO BANNER & SEARCH HEADER                                           */}
      {/* ===================================================================== */}
      <div className={`p-6 sm:p-8 rounded-2xl border transition-all shadow-sm ${
        isLight 
          ? 'bg-white border-slate-200 text-slate-900 shadow-slate-100' 
          : 'bg-[#1c1c1c] border-[#2d2d2d] text-white'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-bold font-mono uppercase tracking-wider rounded-lg flex items-center gap-1.5 ${
                isLight 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30'
              }`}>
                <Compass className="w-3.5 h-3.5" /> Complete Platform Guide
              </span>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                17 Specialized Modules
              </span>
            </div>

            <h1 className={`font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight uppercase ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              How to Use Nexus<span className={isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}>BI</span>
            </h1>

            <p className={`text-sm sm:text-base leading-relaxed ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
              Complete end-to-end user manual, module directory, and step-by-step workflow guide. Discover exactly how each module works, what you can achieve with it, and best practices.
            </p>

            {/* Urdu / Hindi Subtitle for instant clarity */}
            <div className={`p-3 rounded-xl border text-xs sm:text-sm leading-relaxed ${
              isLight 
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                : 'bg-[#182620] border-[#21F1A8]/30 text-[#8efad3]'
            }`}>
              <strong>آسان اردو گائیڈ (Quick Urdu Summary):</strong> پلیٹ فارم کو استعمال کرنے کا مکمل طریقہ کار نیچے ہر ماڈیول کے ساتھ تفصیل سے بیان کیا گیا ہے تاکہ آپ ڈیٹا اپ لوڈ کرنے سے لے کر پاور بی آئی (Power BI) ایکسپورٹ تک سب کچھ باآسانی سمجھ سکیں۔
            </div>
          </div>

          {/* Quick Controls: Urdu toggle & Theme indicator */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {/* Toggle Urdu Explanations */}
            <button
              onClick={() => setShowUrdu(!showUrdu)}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                showUrdu
                  ? isLight ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-[#21F1A8] text-black border-[#21F1A8] font-bold'
                  : isLight ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : 'bg-[#222] text-gray-300 border-[#333] hover:bg-[#282828]'
              }`}
            >
              <span>{showUrdu ? '✓ Urdu / Hindi Hints Active' : '+ Show Urdu Hints'}</span>
              <span className="text-[10px] opacity-80 uppercase tracking-wider font-mono">اردو گائیڈ</span>
            </button>

            {/* Theme switcher shortcut */}
            <div className={`flex items-center justify-between p-1.5 rounded-xl border text-xs ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#141414] border-[#2e2e2e]'
            }`}>
              <span className={`px-2 text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                Active Theme:
              </span>
              <button
                onClick={() => setThemeMode(isLight ? 'dark' : 'light')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isLight 
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-xs' 
                    : 'bg-[#262626] text-[#21F1A8] border border-[#21F1A8]/40'
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
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
              isLight ? 'text-slate-400' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="Search guide by module, keyword (e.g. upload, DAX, SQL, cleaning, Power BI, ERD)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
      {/* 5-STEP LIFECYCLE WORKFLOW (HOW NEXUSBI WORKS END-TO-END)              */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              ⚡ 5-Step Rapid Lifecycle (کیسے شروع کریں؟)
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              The standard production flow from raw messy files to board-ready executive intelligence and Power BI PBIP exports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {quickWorkflowSteps.map((step, idx) => (
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
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    isLight 
                      ? 'bg-slate-100 text-slate-800 border border-slate-200' 
                      : 'bg-[#262626] text-[#21F1A8] border border-[#333]'
                  }`}>
                    STEP {step.num}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-1 ${
                    isLight ? 'text-emerald-700' : 'text-[#21F1A8]'
                  }`} />
                </div>

                <h3 className={`font-heading text-base font-bold uppercase tracking-wide group-hover:underline ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {step.title}
                </h3>

                {showUrdu && (
                  <p className={`text-[11px] font-semibold ${isLight ? 'text-emerald-800' : 'text-[#8efad3]'}`}>
                    {step.urdu}
                  </p>
                )}

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
              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isActive 
                  ? isLight ? 'bg-emerald-800 text-white' : 'bg-black/30 text-black' 
                  : isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#262626] text-gray-400'
              }`}>
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
        {filteredModules.map((mod, index) => {
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
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    isLight 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs' 
                      : 'bg-[#21F1A8]/10 text-[#21F1A8] border-[#21F1A8]/30'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded ${
                        isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-[#262626] text-gray-300'
                      }`}>
                        {mod.categoryLabel}
                      </span>
                      <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        • {mod.tag}
                      </span>
                      {mod.badge && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                          isLight 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30'
                        }`}>
                          {mod.badge}
                        </span>
                      )}
                    </div>

                    <h2 className={`font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {mod.title}
                    </h2>

                    {showUrdu && (
                      <p className={`text-xs sm:text-sm font-semibold ${
                        isLight ? 'text-emerald-800' : 'text-[#8efad3]'
                      }`}>
                        {mod.urduTitle}
                      </p>
                    )}
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
                  <span>Open {mod.title.split(' ')[0]}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Summary Paragraph */}
              <div className="mt-4 space-y-2">
                <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                  {mod.summary}
                </p>

                {showUrdu && (
                  <p className={`text-xs sm:text-sm leading-relaxed p-2.5 rounded-lg border ${
                    isLight ? 'bg-slate-50 text-slate-800 border-slate-200' : 'bg-[#151515] text-gray-300 border-[#262626]'
                  }`}>
                    <strong className={isLight ? 'text-emerald-800' : 'text-[#21F1A8]'}>اردو خلاصہ: </strong>
                    {mod.urduSummary}
                  </p>
                )}
              </div>

              {/* Grid: What You Can Do vs How to Use */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Column 1: What You Can Do (Kya kya kr skty han) */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#161616] border-[#262626]'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
                    <h3 className={`font-heading text-sm font-bold uppercase tracking-wider ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      What You Can Do (کیا کیا کر سکتے ہیں)
                    </h3>
                  </div>

                  <ul className="space-y-1.5 text-xs">
                    {mod.whatYouCanDo.map((item, i) => (
                      <li key={i} className={`flex items-start gap-2 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          isLight ? 'bg-emerald-600' : 'bg-[#21F1A8]'
                        }`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {showUrdu && (
                    <div className="pt-2 border-t border-slate-200 dark:border-[#222]">
                      <span className={`text-[11px] font-bold block mb-1 ${isLight ? 'text-emerald-900' : 'text-[#8efad3]'}`}>
                        اردو فیچرز:
                      </span>
                      <ul className="space-y-1 text-[11px]">
                        {mod.urduWhatYouCanDo.map((item, i) => (
                          <li key={i} className={`flex items-start gap-1.5 ${isLight ? 'text-slate-700' : 'text-gray-400'}`}>
                            <span className="text-emerald-600">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Column 2: Step-by-Step Instructions (Kaise use krna hai) */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#161616] border-[#262626]'
                }`}>
                  <div className="flex items-center gap-2">
                    <Play className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-[#21F1A8]'}`} />
                    <h3 className={`font-heading text-sm font-bold uppercase tracking-wider ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      Step-by-Step Instructions (استعمال کا طریقہ)
                    </h3>
                  </div>

                  <ol className="space-y-2 text-xs">
                    {mod.stepsToUse.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                          isLight 
                            ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs' 
                            : 'bg-[#222] text-[#21F1A8] border border-[#333]'
                        }`}>
                          {i + 1}
                        </span>
                        <span className={`leading-relaxed ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>

                  {/* Pro Tip Box */}
                  <div className={`mt-3 p-2.5 rounded-lg border flex items-start gap-2 text-xs font-mono ${
                    isLight 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                      : 'bg-[#14221b] border-[#21F1A8]/30 text-[#8efad3]'
                  }`}>
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span><strong>Pro Tip:</strong> {mod.proTip}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredModules.length === 0 && (
          <div className={`p-12 text-center rounded-2xl border ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#1c1c1c] border-[#2d2d2d]'
          }`}>
            <p className={`text-base font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
              No modules found matching "{searchQuery}".
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
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
      <div className={`p-6 sm:p-8 rounded-2xl border ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#1c1c1c] border-[#2d2d2d]'
      }`}>
        <h2 className={`font-heading text-2xl font-bold uppercase tracking-wide mb-6 ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}>
          ❓ Frequently Asked Questions (عام سوالات اور جوابات)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#171717] border-[#282828]'}`}>
            <h4 className={`font-heading text-sm font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Can I upload my own company Excel or CSV file?
            </h4>
            <p className={`mt-2 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
              Yes! Click "Upload Data" and drag & drop any `.csv` or `.xlsx` file. NexusBI automatically profiles all columns and computes custom KPIs and Star Schemas for your dataset.
            </p>
            <p className={`mt-1 text-[11px] font-semibold ${isLight ? 'text-emerald-800' : 'text-[#8efad3]'}`}>
              جی ہاں! آپ اپنی کوئی بھی ایکسل یا سی ایس وی فائل بلا جھجھک اپ لوڈ کر سکتے ہیں۔
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#171717] border-[#282828]'}`}>
            <h4 className={`font-heading text-sm font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
              How does the Dark and Light mode toggle work?
            </h4>
            <p className={`mt-2 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
              Look at the very top of the screen in the header navbar. There is a prominent segmented switch for "Light" and "Dark". Click either button anytime. All cards, charts, and text colors will instantly adapt for optimal visibility.
            </p>
            <p className={`mt-1 text-[11px] font-semibold ${isLight ? 'text-emerald-800' : 'text-[#8efad3]'}`}>
              اوپر ہیڈر میں لائٹ اور ڈارک کا بٹن موجود ہے۔ جب لائٹ موڈ پر کلک کریں گے تو تمام فونٹس گہرے اور بالکل واضح نظر آئیں گے۔
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#171717] border-[#282828]'}`}>
            <h4 className={`font-heading text-sm font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
              How do I open the exported files in Power BI Desktop?
            </h4>
            <p className={`mt-2 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
              Navigate to "Export Center" and click "Download Complete 14-Folder Project". Unzip the file on your Windows computer and double-click the `.pbip` file in `07_PowerBI_PBIP_Project/`. It opens directly in Microsoft Power BI Desktop!
            </p>
            <p className={`mt-1 text-[11px] font-semibold ${isLight ? 'text-emerald-800' : 'text-[#8efad3]'}`}>
              ایکسپورٹ سینٹر سے زپ فائل ڈاؤن لوڈ کر کے ان زپ کریں اور پاور بی آئی میں ڈائریکٹ اوپن کر لیں۔
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#171717] border-[#282828]'}`}>
            <h4 className={`font-heading text-sm font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Are my calculations and DAX formulas deterministic?
            </h4>
            <p className={`mt-2 text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
              Yes, 100%! All mathematical calculations, quality auditing algorithms, Pearson correlation matrices, and DAX measures use deterministic statistical mathematics without random hallucinations.
            </p>
            <p className={`mt-1 text-[11px] font-semibold ${isLight ? 'text-emerald-800' : 'text-[#8efad3]'}`}>
              تمام فارمولے اور حساب کتاب 100 فیصد مستند ریاضیاتی فارمولوں پر مبنی ہیں۔
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
