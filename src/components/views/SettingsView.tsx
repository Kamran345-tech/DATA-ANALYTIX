import React, { useState } from 'react';
import { 
  Settings, 
  Building2, 
  Palette, 
  Clock, 
  Check, 
  ShieldCheck, 
  RotateCcw,
  Sparkles,
  Cloud,
  Database,
  LogIn,
  LogOut,
  ExternalLink,
  Bell,
  Play,
  AlertTriangle,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { useToast } from '../../store/useToast';

export const SettingsView: React.FC = () => {
  const { brand, setBrand, project, updateProjectMetadata, auditLogs, setCurrentTab } = usePlatform();
  const { currentUser, setIsAuthModalOpen, logout } = useFirebaseAuth();
  const { success, warning, error, info, progress, complete, clearAll } = useToast();

  const [companyName, setCompanyName] = useState(brand.companyName);
  const [department, setDepartment] = useState(brand.department);
  const [author, setAuthor] = useState(brand.author);
  const [themeColor, setThemeColor] = useState(brand.themeColor);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    setBrand({
      ...brand,
      companyName,
      department,
      author,
      themeColor
    });
    updateProjectMetadata({ companyName, department, author });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-8 pb-16 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Settings className="w-4 h-4" /> Central Governance & Identity
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            SETTINGS & BRANDING
          </h1>
          <p className="text-xs text-gray-400">
            Define corporate branding parameters. Applied universally across dashboards, executive PDF reports, and Power BI themes.
          </p>
        </div>

        {savedNotice && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30 text-xs font-mono">
            <Check className="w-4 h-4" /> Configuration Saved
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branding Configuration Form */}
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
          <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#21F1A8]" />
            ORGANIZATION & REPORTING BRAND
          </h3>

          <form onSubmit={handleSaveBranding} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-gray-400 font-medium">Enterprise Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-medium">Department / Division</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-medium">Prepared By (Lead Analyst)</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-medium">Primary Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[#333]"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-32 bg-[#141414] text-white p-2 rounded-lg border border-[#333] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setThemeColor('#21F1A8')}
                  className="text-[11px] text-gray-400 hover:text-[#21F1A8] underline"
                >
                  Reset Tiffany Green
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Brand Settings
            </button>
          </form>
        </div>

        {/* Project Version & Governance */}
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
          <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#21F1A8]" />
            PROJECT VERSION & RUNTIME
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Project Identifier:</span>
              <span className="text-white">{project.id}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Active Version:</span>
              <span className="text-[#21F1A8] font-bold">{project.version}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Dataset Scope:</span>
              <span className="text-white">{project.rowCount.toLocaleString()} rows</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Data Source:</span>
              <span className="text-gray-300 truncate max-w-[180px]">{project.sourceFileName}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Data Integrity Mode:</span>
              <span className="text-[#21F1A8] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#21F1A8]" />
                ENTERPRISE PRODUCTION MODEL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Firebase Cloud Sync & Authentication Section */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#21F1A8]/10 text-[#21F1A8] flex items-center justify-center border border-[#21F1A8]/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
                FIREBASE CLOUD INTEGRATION & AUTHENTICATION
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30">
                  LIVE & ONLINE
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Managed Firebase Auth & Firestore database for dashboard persistence and analyst identity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-[#262626] hover:bg-[#333] text-white text-xs font-semibold transition-all border border-[#3d3d3d]"
                >
                  Manage Profile
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold transition-all border border-red-500/30 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#21F1A8] hover:bg-[#1cdb97] text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In / Create Account
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono pt-2">
          <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] space-y-1">
            <span className="text-gray-500 block text-[10px] uppercase">Auth Status:</span>
            <span className="text-white font-semibold flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-[#21F1A8]' : 'bg-amber-400'}`} />
              {currentUser ? (currentUser.displayName || currentUser.email) : 'Guest (Click to Sign In)'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] space-y-1">
            <span className="text-gray-500 block text-[10px] uppercase">Firebase Project ID:</span>
            <span className="text-[#21F1A8] font-bold truncate block">
              mercurial-amphora-3lxdt
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] space-y-1">
            <span className="text-gray-500 block text-[10px] uppercase">Firestore Database:</span>
            <span className="text-gray-200 truncate block text-[11px]" title="ai-studio-nexusbiautonomou-0dbe5717-991a-4e5d-8933-62ef87e791ba">
              ai-studio-nexus...0dbe
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] space-y-1">
            <span className="text-gray-500 block text-[10px] uppercase">Security Rules:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              ✓ Deployed & Enforced
            </span>
          </div>
        </div>
      </div>

      {/* Global Notification & Toast Alert Controller */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#21F1A8]" />
              GLOBAL NOTIFICATION SYSTEM & TOAST CONTROLLER
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Test and monitor system alerts, live data ingestion progress bars, and completion states across the application.
            </p>
          </div>

          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono font-medium transition-colors cursor-pointer shrink-0"
          >
            Clear Active Toasts
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* 1. Progress State Simulation */}
          <button
            type="button"
            onClick={() => {
              const testId = 'sim_' + Date.now();
              progress(testId, 15, 'Stage 1/4: Ingestion', 'Reading parquet byte stream from source...');
              setTimeout(() => {
                progress(testId, 45, 'Stage 2/4: Profiling', 'Evaluating column histograms & null ratios...');
              }, 1200);
              setTimeout(() => {
                progress(testId, 75, 'Stage 3/4: Star Schema', 'Partitioning Fact & Dimension tables...');
              }, 2400);
              setTimeout(() => {
                complete(testId, 'Ingestion Pipeline Complete', '4,850 records verified with 100% schema integrity.', {
                  label: 'View Dashboard',
                  onClick: () => setCurrentTab('executive_dashboard')
                });
              }, 3800);
            }}
            className="p-3.5 rounded-xl bg-[#141414] border border-[#00D2FF]/30 hover:border-[#00D2FF] text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2 text-[#00D2FF] font-bold text-xs mb-1">
              <Play className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Simulate Ingestion Progress</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Triggers real-time 0% to 100% multi-stage progress meter with auto-completion.
            </p>
          </button>

          {/* 2. Completion State (Success) */}
          <button
            type="button"
            onClick={() => {
              success('Data Pipeline Ready', 'Calculated 14 statistical KPIs & synthesized DAX measures.', {
                stage: 'Synthesis Complete',
                action: {
                  label: 'Open Dashboard',
                  onClick: () => setCurrentTab('executive_dashboard')
                }
              });
            }}
            className="p-3.5 rounded-xl bg-[#141414] border border-[#21F1A8]/30 hover:border-[#21F1A8] text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2 text-[#21F1A8] font-bold text-xs mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Completion State (Success)</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Renders success card with action button to navigate directly to executive view.
            </p>
          </button>

          {/* 3. System Alert (Warning) */}
          <button
            type="button"
            onClick={() => {
              warning('Memory Buffer Threshold', 'Telemetry engine cache reached 82%. Automated memory compaction scheduled in 15s.', {
                stage: 'Resource Alert'
              });
            }}
            className="p-3.5 rounded-xl bg-[#141414] border border-amber-500/30 hover:border-amber-500 text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>System Warning Alert</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Displays non-blocking system health notification with countdown dismissal.
            </p>
          </button>

          {/* 4. Critical Error Alert */}
          <button
            type="button"
            onClick={() => {
              error('SQL Engine Syntax Warning', 'Failed to parse unescaped identifier in subquery at column 42.', {
                stage: 'Parser Exception',
                action: {
                  label: 'Open SQL Lab',
                  onClick: () => setCurrentTab('sql_lab'),
                  variant: 'secondary'
                }
              });
            }}
            className="p-3.5 rounded-xl bg-[#141414] border border-rose-500/30 hover:border-rose-500 text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
              <AlertCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Critical Error Alert</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Renders error card with high-priority styling and contextual fix action.
            </p>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
        <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#21F1A8]" />
          GOVERNED AUDIT TRAIL ({auditLogs.length} EVENTS)
        </h3>

        <div className="overflow-x-auto rounded-xl border border-[#2a2a2a] max-h-64">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#141414] text-gray-400 border-b border-[#2a2a2a]">
              <tr>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Action Event</th>
                <th className="p-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {auditLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-[#202020] text-gray-300">
                  <td className="p-2.5 text-gray-500">{log.timestamp}</td>
                  <td className="p-2.5 text-[#21F1A8] font-bold">{log.action}</td>
                  <td className="p-2.5 text-gray-300">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
