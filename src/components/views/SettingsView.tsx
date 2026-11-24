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
  LogIn,
  LogOut,
  Bell,
  Play,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { useToast } from '../../store/useToast';
import { ThemeStudioPanel } from '../common/ThemeStudioPanel';
import { 
  FEATURE_METADATA, 
  loadFeatureFlags, 
  saveFeatureFlags, 
  resetFeatureFlags, 
  FeatureFlags 
} from '../../config/features';
import {
  ThemePreference,
  getStoredThemePreference,
  applyDocumentTheme
} from '../../utils/theme';
import {
  loadLearningStore,
  deleteLearnedRule,
  resetAllLearning,
  setLearningEnabled,
  exportLearningJson,
  AdaptiveLearningStoreState,
} from '../../analytics/learning/adaptiveLearningEngine';
import { PageHeader } from '../common/PageHeader';
import { APP_VERSION_LABEL, toDatasetIdentifier } from '../../config/appVersion';

export const SettingsView: React.FC = () => {
  const { 
    brand, 
    setBrand, 
    project, 
    updateProjectMetadata, 
    auditLogs, 
    setCurrentTab,
    themeMode,
    setThemeMode,
    uiMode,
    setUiMode
  } = usePlatform();
  const { currentUser, setIsAuthModalOpen, logout } = useFirebaseAuth();
  const { success, warning, error, progress, complete, clearAll } = useToast();

  const isLight = themeMode === 'light';
  const [themePref, setThemePref] = useState<ThemePreference>(() => getStoredThemePreference());
  const [companyName, setCompanyName] = useState(brand.companyName);
  const [department, setDepartment] = useState(brand.department);
  const [author, setAuthor] = useState(brand.author);
  const [themeColor, setThemeColor] = useState(brand.themeColor);
  const [savedNotice, setSavedNotice] = useState(false);
  const [features, setFeatures] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [learningState, setLearningState] = useState<AdaptiveLearningStoreState>(() => loadLearningStore());

  const refreshLearningState = () => {
    setLearningState(loadLearningStore());
  };

  const handleSelectThemePreference = (pref: ThemePreference) => {
    setThemePref(pref);
    const resolved = applyDocumentTheme(pref, features);
    setThemeMode(resolved);
  };

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

  const activeDatasetId = toDatasetIdentifier(project.name, project.sourceFileName);

  return (
    <div className="space-y-8 pb-16 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      {features.designSystemV3 ? (
        <PageHeader
          pageId="settings"
          badge={
            savedNotice ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-accent-soft text-accent border border-subtle text-xs font-mono">
                <Check className="w-3.5 h-3.5" /> Configuration Saved
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-elevated border border-subtle text-xs font-mono text-secondary">
                {APP_VERSION_LABEL}
              </span>
            )
          }
          primaryAction={{
            label: 'Switch to Classic',
            onClick: () => {
              const reset = resetFeatureFlags();
              setFeatures(reset);
              setUiMode('classic');
              success('Switched to Classic', 'All feature flags and appearance settings restored to Classic mode.');
            },
            icon: RotateCcw,
          }}
        />
      ) : (
        <div className="bg-card border border-subtle rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent font-mono">
              <Settings className="w-4 h-4" /> Central Governance &amp; Identity
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary tracking-wide uppercase">
              SETTINGS &amp; BRANDING
            </h1>
            <p className="text-xs text-secondary">
              Define corporate branding parameters. Applied universally across dashboards, executive PDF reports, and Power BI themes.
            </p>
          </div>

          {savedNotice && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-soft text-accent border border-subtle text-xs font-mono">
              <Check className="w-4 h-4" /> Configuration Saved
            </span>
          )}
        </div>
      )}

      {/* Theme Studio (Section 1.1: One source of truth for all colours) */}
      {features.unifiedTheme && <ThemeStudioPanel />}

      {/* Appearance & Interface Mode Card */}
      <div className="rounded-2xl p-6 space-y-4 border bg-card border-subtle text-primary">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-subtle">
          <h3 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-primary">
            <Palette className="w-4 h-4 text-accent" />
            APPEARANCE &amp; INTERFACE DESIGN
          </h3>
          <button
            type="button"
            onClick={() => {
              const reset = resetFeatureFlags();
              setFeatures(reset);
              setUiMode('classic');
              success('Switched to Classic', 'All feature flags and appearance settings restored to Classic mode.');
            }}
            className="px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer bg-input hover:bg-card-hover text-secondary border-subtle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Switch to Classic
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Classic Interface Option */}
          <div
            onClick={() => setUiMode('classic')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              uiMode === 'classic'
                ? 'border-accent bg-accent-soft shadow-md ring-1 ring-teal-500/40'
                : 'border-subtle bg-input hover:border-strong'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-primary">Classic Layout</span>
              {uiMode === 'classic' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-accent-soft text-accent">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed mb-3 text-secondary">
              Standard proven layout with dark/light themes, flat sidebar navigation, and historical telemetry styling.
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setUiMode('classic'); }}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                uiMode === 'classic' ? 'bg-accent text-on-accent font-bold' : 'bg-elevated text-secondary hover:text-primary'
              }`}
            >
              {uiMode === 'classic' ? 'Selected' : 'Use Classic'}
            </button>
          </div>

          {/* Modern Interface Option */}
          <div
            onClick={() => setUiMode('modern')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              uiMode === 'modern'
                ? 'border-accent bg-accent-soft shadow-md ring-1 ring-teal-500/40'
                : 'border-subtle bg-input hover:border-strong'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span className="font-bold text-sm text-primary">Modern Enterprise</span>
              </div>
              {uiMode === 'modern' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-accent-soft text-accent">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed mb-3 text-secondary">
              WCAG AA deep slate palette, 5-stage collapsible workflow rail, Ctrl+K command palette, and tabular metrics.
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setUiMode('modern'); }}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                uiMode === 'modern' ? 'bg-accent text-on-accent font-bold' : 'bg-elevated text-secondary hover:text-primary'
              }`}
            >
              {uiMode === 'modern' ? 'Selected' : 'Use Modern'}
            </button>
          </div>
        </div>

        {/* Theme Mode Toggle (Dark vs Light vs System) */}
        <div className="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 bg-input border-subtle">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-primary">Color Theme</span>
            <p className="text-[11px] text-secondary">Works in both Classic and Modern modes (Dark, Light, or System preference).</p>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border border-subtle" role="group" aria-label="Color Theme Preference">
            <button
              type="button"
              onClick={() => handleSelectThemePreference('dark')}
              aria-pressed={themePref === 'dark'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                themePref === 'dark' ? 'bg-accent text-on-accent font-bold shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectThemePreference('light')}
              aria-pressed={themePref === 'light'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                themePref === 'light' ? 'bg-accent text-on-accent font-bold shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectThemePreference('system')}
              aria-pressed={themePref === 'system'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                themePref === 'system' ? 'bg-accent text-on-accent font-bold shadow-xs' : 'text-secondary hover:text-primary'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>System</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branding Configuration Form */}
        <div className="bg-card border border-subtle rounded-2xl p-6 space-y-4">
          <h3 className="font-heading text-xl font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            ORGANIZATION & REPORTING BRAND
          </h3>

          <form onSubmit={handleSaveBranding} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-secondary font-medium">Enterprise Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-input text-primary p-2.5 rounded-xl border border-subtle focus:border-strong focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-secondary font-medium">Department / Division</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-input text-primary p-2.5 rounded-xl border border-subtle focus:border-strong focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-secondary font-medium">Prepared By (Lead Analyst)</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-input text-primary p-2.5 rounded-xl border border-subtle focus:border-strong focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-secondary font-medium">Primary Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-subtle"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-32 bg-input text-primary p-2 rounded-lg border border-subtle font-mono"
                />
                <button
                  type="button"
                  onClick={() => setThemeColor('var(--chart-1)')}
                  className="text-[11px] text-secondary hover:text-accent underline"
                >
                  Reset Teal Accent
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-accent text-on-accent font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save Brand Settings
            </button>
          </form>
        </div>

        {/* Project Version & Governance */}
        <div className="bg-card border border-subtle rounded-2xl p-6 space-y-4">
          <h3 className="font-heading text-xl font-bold text-primary uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            PROJECT VERSION &amp; RUNTIME
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-input border border-subtle flex justify-between gap-2">
              <span className="text-muted shrink-0">Project Identifier:</span>
              <span
                data-testid="settings-project-identifier"
                title={`${project.name} (${activeDatasetId})`}
                className="text-primary font-semibold truncate text-right"
              >
                {activeDatasetId} ({project.name})
              </span>
            </div>
            <div className="p-3 rounded-xl bg-input border border-subtle flex justify-between gap-2">
              <span className="text-muted shrink-0">Active Version:</span>
              <span data-testid="settings-active-version" className="text-accent font-bold">
                {project.version || APP_VERSION_LABEL}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-input border border-subtle flex justify-between">
              <span className="text-muted">Dataset Scope:</span>
              <span className="text-primary">{project.rowCount.toLocaleString()} rows</span>
            </div>
            <div className="p-3 rounded-xl bg-input border border-subtle flex justify-between">
              <span className="text-muted">Data Source:</span>
              <span className="text-secondary truncate max-w-[180px]">{project.sourceFileName}</span>
            </div>
            <div className="p-3 rounded-xl bg-input border border-subtle flex justify-between">
              <span className="text-muted">Data Integrity Mode:</span>
              <span className="text-accent font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                ENTERPRISE PRODUCTION MODEL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Firebase Cloud Sync & Authentication Section */}
      <div className="bg-card border border-subtle rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center border border-subtle">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-primary uppercase tracking-wide flex items-center gap-2">
                FIREBASE CLOUD INTEGRATION & AUTHENTICATION
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent-soft text-accent border border-subtle">
                  LIVE & ONLINE
                </span>
              </h3>
              <p className="text-xs text-secondary">
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
                  className="px-3 py-2 rounded-xl bg-input hover:bg-card-hover text-primary text-xs font-semibold transition-all border border-subtle"
                >
                  Manage Profile
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-danger text-xs font-semibold transition-all border border-rose-500/30 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-accent hover:opacity-90 text-on-accent text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In / Create Account
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono pt-2">
          <div className="p-3 rounded-xl bg-input border border-subtle space-y-1">
            <span className="text-muted block text-[10px] uppercase">Auth Status:</span>
            <span className="text-primary font-semibold flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-accent' : 'bg-amber-400'}`} />
              {currentUser ? (currentUser.displayName || currentUser.email) : 'Guest (Click to Sign In)'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-input border border-subtle space-y-1">
            <span className="text-muted block text-[10px] uppercase">Firebase Project ID:</span>
            <span className="text-accent font-bold truncate block">
              mercurial-amphora-3lxdt
            </span>
          </div>

          <div className="p-3 rounded-xl bg-input border border-subtle space-y-1">
            <span className="text-muted block text-[10px] uppercase">Firestore Database:</span>
            <span className="text-secondary truncate block text-[11px]" title="ai-studio-nexusbiautonomou-0dbe5717-991a-4e5d-8933-62ef87e791ba">
              ai-studio-nexus...0dbe
            </span>
          </div>

          <div className="p-3 rounded-xl bg-input border border-subtle space-y-1">
            <span className="text-muted block text-[10px] uppercase">Security Rules:</span>
            <span className="text-success font-semibold flex items-center gap-1">
              ✓ Deployed & Enforced
            </span>
          </div>
        </div>
      </div>

      {/* Global Notification & Toast Alert Controller */}
      <div className="bg-card border border-subtle rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-bold text-primary uppercase tracking-wide flex items-center gap-2">
              <Bell className="w-5 h-5 text-accent" />
              GLOBAL NOTIFICATION SYSTEM & TOAST CONTROLLER
            </h3>
            <p className="text-xs text-secondary mt-1">
              Test and monitor system alerts, live data ingestion progress bars, and completion states across the application.
            </p>
          </div>

          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 rounded-xl border border-subtle bg-input hover:bg-card-hover text-secondary text-xs font-mono font-medium transition-colors cursor-pointer shrink-0"
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
            className="p-3.5 rounded-xl bg-input border border-subtle hover:border-strong text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2 text-info font-bold text-xs mb-1">
              <Play className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Simulate Ingestion Progress</span>
            </div>
            <p className="text-[11px] text-secondary">
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
            className="p-3.5 rounded-xl bg-input border border-subtle hover:border-strong text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2 text-success font-bold text-xs mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Completion State (Success)</span>
            </div>
            <p className="text-[11px] text-secondary">
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
            className="p-3.5 rounded-xl bg-input border border-subtle hover:border-strong text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2 text-warning font-bold text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>System Warning Alert</span>
            </div>
            <p className="text-[11px] text-secondary">
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
            className="p-3.5 rounded-xl bg-input border border-subtle hover:border-strong text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2 text-danger font-bold text-xs mb-1">
              <AlertCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Critical Error Alert</span>
            </div>
            <p className="text-[11px] text-secondary">
              Renders error card with high-priority styling and contextual fix action.
            </p>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-card border border-subtle rounded-2xl p-6 space-y-4">
        <h3 className="font-heading text-xl font-bold text-primary uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          GOVERNED AUDIT TRAIL ({auditLogs.length} EVENTS)
        </h3>

        <div className="overflow-x-auto rounded-xl border border-subtle max-h-64">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-input text-secondary border-b border-subtle">
              <tr>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Action Event</th>
                <th className="p-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {auditLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-card-hover text-secondary">
                  <td className="p-2.5 text-muted">{log.timestamp}</td>
                  <td className="p-2.5 text-accent font-bold">{log.action}</td>
                  <td className="p-2.5 text-primary">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Experiments & Alternatives (Feature Flags) Switch Rows */}
      <div className="depth-card rounded-[20px] p-6 space-y-5 border bg-card border-subtle shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-subtle">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent font-mono">
              <Sparkles className="w-4 h-4" /> Additive Feature Flags
            </div>
            <h3 className="font-heading text-xl font-bold uppercase tracking-tight mt-1 text-primary">
              EXPERIMENTS &amp; ALTERNATIVES
            </h3>
            <p className="text-xs mt-1 text-secondary">
              Toggle additive features next to Classic behavior. New visitors default to Unified Theme, Depth UI, 3D Hero Scene, and 8-Chart Guide enabled; use &ldquo;Switch to Classic&rdquo; to turn all flags off.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allOn = Object.keys(features).reduce((acc, k) => {
                  acc[k as keyof FeatureFlags] = true;
                  return acc;
                }, {} as FeatureFlags);
                saveFeatureFlags(allOn);
                setFeatures(allOn);
                success('All Experiments Enabled', 'Activated Modern, Depth UI, 3D Hero Scene, Unified Theme, and Self-Hosted Fonts.');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-accent-soft hover:opacity-90 text-accent border border-subtle text-xs font-semibold transition-colors cursor-pointer"
            >
              Enable All
            </button>
            <button
              type="button"
              data-testid="settings-switch-to-classic"
              onClick={() => {
                const reset = resetFeatureFlags();
                setFeatures(reset);
                setUiMode('classic');
                success('Switched to Classic', 'All feature flags have been turned off and saved to Classic mode.');
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer bg-input hover:bg-card-hover text-secondary border-subtle"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Switch to Classic
            </button>
          </div>
        </div>

        {/* One-line banner showing which flags are ON for this session */}
        <div
          data-testid="session-flags-banner"
          className="px-3.5 py-2 rounded-xl bg-input border border-subtle text-xs font-mono text-secondary flex items-center justify-between gap-3"
        >
          <span className="truncate">
            <strong className="text-primary">Active flags in this session:</strong>{' '}
            {FEATURE_METADATA.filter(m => features[m.key]).map(m => m.key).join(', ') || 'None (Classic Default)'}
          </span>
          <span className="text-accent font-bold shrink-0">
            {FEATURE_METADATA.filter(m => features[m.key]).length}/{FEATURE_METADATA.length} ON
          </span>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {FEATURE_METADATA.map((meta) => {
            const isEnabled = features[meta.key];
            const envName = `VITE_FEATURE_${meta.key.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/_U_I$/, '_UI').replace(/_A_I$/, '_AI').replace(/_3_D$/, '_3D')}`;

            return (
              <div
                key={meta.key}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-primary">
                      {meta.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                        isEnabled
                          ? 'bg-accent-soft text-accent border-subtle'
                          : 'bg-input text-secondary border-subtle'
                      }`}
                    >
                      {isEnabled ? 'New' : 'Classic'}
                    </span>
                    <span className="text-[10px] font-mono text-muted uppercase">
                      [{meta.category}]
                    </span>
                    <code className="text-[10px] font-mono px-1.5 py-0.5 rounded hidden sm:inline bg-input text-muted">
                      {envName}
                    </code>
                  </div>
                  <p className="text-xs leading-relaxed text-secondary">
                    {meta.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`Toggle ${meta.label}`}
                    onClick={() => {
                      const updated: FeatureFlags = {
                        ...features,
                        [meta.key]: !isEnabled
                      };
                      saveFeatureFlags(updated);
                      setFeatures(updated);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-accent' : isLight ? 'bg-input' : 'bg-input'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PART B2 & B6: LEARNED PREFERENCES & ADAPTIVE RULES (PRIVACY-FIRST LOCAL LEARNING) */}
      <div
        data-testid="settings-learned-preferences"
        className="depth-card rounded-[20px] p-6 space-y-5 border bg-card border-subtle shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-subtle">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent font-mono">
              <Sparkles className="w-4 h-4" /> Self-Training Schema &amp; Pack Memory
            </div>
            <h3 className="font-heading text-xl font-bold uppercase tracking-tight mt-1 text-primary">
              LEARNED PREFERENCES &amp; ADAPTIVE RULES
            </h3>
            <p className="text-xs mt-1 text-secondary">
              Privacy-first local learning: stores only column names, role mappings, and pack preferences in your browser (never row values).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="toggle-learning-enabled-btn"
              onClick={() => {
                const next = !learningState.learningEnabled;
                setLearningEnabled(next);
                refreshLearningState();
                success(
                  next ? 'Adaptive Learning Enabled' : 'Adaptive Learning Paused',
                  next
                    ? 'Column mappings and pack choices will be remembered locally.'
                    : 'Paused recording new schema learning rules.'
                );
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                learningState.learningEnabled
                  ? 'bg-accent-soft text-accent border-subtle'
                  : 'bg-input text-secondary border-subtle'
              }`}
            >
              {learningState.learningEnabled ? 'Learning: Active' : 'Learning: Paused'}
            </button>

            <button
              type="button"
              data-testid="export-learning-json-btn"
              onClick={() => {
                const json = exportLearningJson();
                const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'data-analytix-learned-rules.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                success('Exported Learned Rules', 'Downloaded privacy-safe learned rules JSON.');
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer bg-input hover:bg-card-hover text-primary border-subtle"
            >
              Export JSON
            </button>

            <button
              type="button"
              data-testid="reset-learning-btn"
              onClick={() => {
                resetAllLearning();
                refreshLearningState();
                success('Learning Reset', 'Cleared all learned column aliases, pack choices, and feedback.');
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer bg-input hover:bg-card-hover text-danger border-subtle"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset learning
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-input border border-subtle flex items-center justify-between">
            <span className="text-secondary">Learned Column Rules:</span>
            <span data-testid="learned-column-rules-count" className="text-primary font-bold">
              {learningState.aliasRules.length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-input border border-subtle flex items-center justify-between">
            <span className="text-secondary">Learned Pack Signatures:</span>
            <span data-testid="learned-pack-rules-count" className="text-primary font-bold">
              {learningState.packPreferences.length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-input border border-subtle flex items-center justify-between">
            <span className="text-secondary">Recorded Feedback Signals:</span>
            <span data-testid="learned-feedback-count" className="text-primary font-bold">
              {learningState.feedbackEntries.length}
            </span>
          </div>
        </div>

        {/* Rules List */}
        {learningState.aliasRules.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-subtle">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-input text-secondary border-b border-subtle">
                <tr>
                  <th className="p-2.5">Raw Column Header</th>
                  <th className="p-2.5">Mapped Role</th>
                  <th className="p-2.5">Pack Scope</th>
                  <th className="p-2.5">Uses</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {learningState.aliasRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-card-hover">
                    <td className="p-2.5 text-primary font-bold">{rule.rawColumnName}</td>
                    <td className="p-2.5 text-accent">{rule.role}</td>
                    <td className="p-2.5 text-secondary">{rule.packId || 'global'}</td>
                    <td className="p-2.5 text-secondary">{rule.count}x</td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        data-testid={`delete-learned-rule-${rule.id}`}
                        onClick={() => {
                          deleteLearnedRule(rule.id);
                          refreshLearningState();
                        }}
                        className="px-2 py-1 rounded bg-elevated hover:bg-card text-danger border border-subtle text-[10px] font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-input border border-subtle text-xs text-secondary font-sans">
            No custom column or pack corrections recorded yet. Whenever you map a column, change a semantic role in &ldquo;How I understood your data&rdquo;, or pick a domain pack, your correction will appear here.
          </div>
        )}
      </div>
    </div>
  );
};

