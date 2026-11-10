import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  BarChart3, 
  LayoutDashboard, 
  Database, 
  Network, 
  FileSpreadsheet, 
  TrendingUp, 
  LineChart, 
  GitMerge, 
  ShieldCheck,
  Search,
  ArrowRight,
  Zap
} from 'lucide-react';
import { usePlatform, TaskMode } from '../../store/usePlatformStore';

interface TaskPreset {
  id: TaskMode;
  userPrompt: string;
  modeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  destinationTab: string;
  description: string;
  badge: string;
}

export const TASK_PRESETS: TaskPreset[] = [
  {
    id: 'excel_assignment',
    userPrompt: 'Read this PDF and complete the Excel assignment',
    modeLabel: 'Excel Assignment Automation Mode',
    icon: FileSpreadsheet,
    destinationTab: 'excel_automation',
    description: 'Auto-completes assignment rules with XLOOKUP, nested IF, dynamic arrays, cell references ($M$2), and downloadable .xlsx.',
    badge: 'Section 5'
  },
  {
    id: 'excel_cleaning',
    userPrompt: 'Clean this Excel file',
    modeLabel: 'Excel Data Cleaning Mode',
    icon: Wand2,
    destinationTab: 'cleaning',
    description: 'Deduplicates records, fills missing nulls, trims spaces, and standardizes date/phone/email formats.',
    badge: 'ETL'
  },
  {
    id: 'data_analysis',
    userPrompt: 'Analyze this dataset',
    modeLabel: 'Exploratory Data Analysis (EDA) Mode',
    icon: BarChart3,
    destinationTab: 'analysis',
    description: 'Statistical distributions, correlation matrices, outlier flags, and variance analysis.',
    badge: 'EDA'
  },
  {
    id: 'powerbi_dev',
    userPrompt: 'Create a Power BI dashboard',
    modeLabel: 'BI Development Mode',
    icon: LayoutDashboard,
    destinationTab: 'dashboard_builder',
    description: 'Custom visuals, Power BI native PBIP developer packages, slicers, and interactive cards.',
    badge: 'Power BI'
  },
  {
    id: 'sql_engineering',
    userPrompt: 'Write an SQL query',
    modeLabel: 'SQL Engineering Mode',
    icon: Database,
    destinationTab: 'sql_lab',
    description: 'In-browser SQL sandbox with CTEs, window functions, and multi-dialect DDL queries.',
    badge: 'SQL'
  },
  {
    id: 'etl_pipeline',
    userPrompt: 'Build an ETL pipeline',
    modeLabel: 'Data Engineering Mode',
    icon: Network,
    destinationTab: 'data_engineering',
    description: '10-stage lineage DAG, dbt assertions, Airflow Python DAGs, and latency telemetry.',
    badge: 'DAG'
  },
  {
    id: 'business_trends',
    userPrompt: 'Find business trends',
    modeLabel: 'Business Analytics & Trends Mode',
    icon: TrendingUp,
    destinationTab: 'executive_dashboard',
    description: 'Holt linear trend telemetry, category share breakouts, and executive directives.',
    badge: 'Trends'
  },
  {
    id: 'predictive',
    userPrompt: 'Predict future sales',
    modeLabel: 'Predictive Analytics Mode',
    icon: LineChart,
    destinationTab: 'analysis',
    description: 'Bivariate linear regressions, R² goodness-of-fit, and scenario sensitivity tests.',
    badge: 'ML'
  },
  {
    id: 'data_integration',
    userPrompt: 'Merge these files',
    modeLabel: 'Data Integration & Schema Mode',
    icon: GitMerge,
    destinationTab: 'modeling',
    description: 'Star and Snowflake schema relationships, 1:N cardinality, and composite joins.',
    badge: 'Kimball'
  },
  {
    id: 'data_quality',
    userPrompt: 'Validate this dataset',
    modeLabel: 'Data Quality & Hygiene Mode',
    icon: ShieldCheck,
    destinationTab: 'quality',
    description: '4D hygiene scoring on Completeness, Uniqueness, Validity, and Consistency.',
    badge: 'Governance'
  }
];

export const TaskModeSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { activeTaskMode, setTaskMode, themeMode } = usePlatform();
  const isLight = themeMode === 'light';
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPresets = TASK_PRESETS.filter(p => 
    p.userPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.modeLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectMode = (preset: TaskPreset) => {
    setTaskMode(preset.id);
  };

  return (
    <div className={`p-5 rounded-3xl transition-all ${className} ${
      isLight ? 'glass-panel shadow-sm' : 'glass-panel shadow-xl'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>AUTOMATIC TASK DETECTION &amp; PROFESSIONAL MODES (SECTION 11)</span>
          </div>
          <h3 className={`font-heading text-lg font-bold uppercase tracking-tight ${isLight ? 'text-primary' : 'text-primary'}`}>
            Select Working Mode or State Your Task
          </h3>
          <p className="text-xs text-secondary">
            Tell the AI agent what you need to do or select any professional mode below. The platform immediately configures the optimal workspace and workflow.
          </p>
        </div>

        {/* Quick Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-secondary" />
          <input
            type="text"
            placeholder="Type your task (e.g. 'Clean Excel', 'SQL')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {filteredPresets.map(preset => {
          const Icon = preset.icon;
          const isActive = activeTaskMode === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectMode(preset)}
              className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group ${
                isActive 
                  ? 'glass-btn-primary shadow-xs' 
                  : isLight
                    ? 'bg-white border-slate-200 hover:border-cyan-400 shadow-2xs'
                    : 'glass-card border-white/10 hover:border-cyan-400/40 text-secondary'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-1.5 rounded-xl ${
                    isActive ? 'bg-white/20 text-primary' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                    isActive ? 'bg-white/20 text-primary' : 'bg-white/10 text-cyan-300'
                  }`}>
                    {preset.badge}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-cyan-400 mb-0.5 font-bold">
                  "{preset.userPrompt}"
                </div>

                <h4 className={`font-bold text-xs leading-snug mb-1 ${isActive ? 'text-primary' : isLight ? 'text-primary' : 'text-primary'}`}>
                  {preset.modeLabel}
                </h4>

                <p className={`text-[10px] leading-relaxed line-clamp-2 ${isActive ? 'text-primary' : 'text-secondary'}`}>
                  {preset.description}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-inherit flex items-center justify-between text-[10px] font-semibold">
                <span className={isActive ? 'text-primary' : 'text-cyan-400'}>
                  {isActive ? 'Active Mode' : 'Activate Mode'}
                </span>
                <ArrowRight className={`w-3 h-3 group-hover:translate-x-0.5 transition-transform ${isActive ? 'text-primary' : 'text-cyan-400'}`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
