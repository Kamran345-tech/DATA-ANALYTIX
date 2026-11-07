import React, { Suspense, lazy, useEffect, useState } from 'react';
import { PlatformProvider, usePlatform } from './store/usePlatformStore';
import { AuthProvider, useFirebaseAuth } from './store/useFirebaseAuth';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { GroupedSidebar } from './components/layout/GroupedSidebar';
import { LoginPage } from './components/views/LoginPage';
import { PublicLandingView } from './components/views/PublicLandingView';
import { DrillThroughModal } from './components/common/DrillThroughModal';
import { AuthModal } from './components/common/AuthModal';
import { ToastContainer } from './components/common/ToastContainer';
import { ToastProvider } from './store/useToast';
import { ExecutivePresentationDeck } from './components/common/ExecutivePresentationDeck';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CookieBanner } from './components/common/CookieBanner';
import { loadFeatureFlags, FeatureFlags } from './config/features';
import { updateHashForTab, getTabFromCurrentHash } from './utils/routing';
import './styles/modern.css';
import { ModernNavbar } from './components/modern/ModernNavbar';
import { ModernSidebar } from './components/modern/ModernSidebar';
import { ModernCommandPalette } from './components/modern/ModernCommandPalette';
import { ModernWelcome } from './components/modern/ModernWelcome';
import { ModernOnboardingChecklist } from './components/modern/ModernOnboardingChecklist';
import { ModernMobileBottomNav } from './components/modern/ModernMobileBottomNav';

// Code-split views using React.lazy for high performance
const LandingPage = lazy(() => import('./components/views/LandingPage').then(m => ({ default: m.LandingPage })));
const ExecutiveDashboard = lazy(() => import('./components/views/ExecutiveDashboard').then(m => ({ default: m.ExecutiveDashboard })));
const UploadIngestionView = lazy(() => import('./components/views/UploadIngestionView').then(m => ({ default: m.UploadIngestionView })));
const LiveServerConnectorView = lazy(() => import('./components/views/LiveServerConnectorView').then(m => ({ default: m.LiveServerConnectorView })));
const DataPreviewView = lazy(() => import('./components/views/DataPreviewView').then(m => ({ default: m.DataPreviewView })));
const DataQualityView = lazy(() => import('./components/views/DataQualityView').then(m => ({ default: m.DataQualityView })));
const DataCleaningLabView = lazy(() => import('./components/views/DataCleaningLabView').then(m => ({ default: m.DataCleaningLabView })));
const DataModelingView = lazy(() => import('./components/views/DataModelingView').then(m => ({ default: m.DataModelingView })));
const DataEngineeringSuite = lazy(() => import('./components/views/DataEngineeringSuite').then(m => ({ default: m.DataEngineeringSuite })));
const ExcelAutomationView = lazy(() => import('./components/views/ExcelAutomationView').then(m => ({ default: m.ExcelAutomationView })));
const AnalysisView = lazy(() => import('./components/views/AnalysisView').then(m => ({ default: m.AnalysisView })));
const DAXLabView = lazy(() => import('./components/views/DAXLabView').then(m => ({ default: m.DAXLabView })));
const SQLLabView = lazy(() => import('./components/views/SQLLabView').then(m => ({ default: m.SQLLabView })));
const PythonLabView = lazy(() => import('./components/views/PythonLabView').then(m => ({ default: m.PythonLabView })));
const DashboardBuilderView = lazy(() => import('./components/views/DashboardBuilderView').then(m => ({ default: m.DashboardBuilderView })));
const AskDataAIView = lazy(() => import('./components/views/AskDataAIView').then(m => ({ default: m.AskDataAIView })));
const ReportsView = lazy(() => import('./components/views/ReportsView').then(m => ({ default: m.ReportsView })));
const DataDictionaryLineageView = lazy(() => import('./components/views/DataDictionaryLineageView').then(m => ({ default: m.DataDictionaryLineageView })));
const ExportCenterView = lazy(() => import('./components/views/ExportCenterView').then(m => ({ default: m.ExportCenterView })));
const HowToModifyView = lazy(() => import('./components/views/HowToModifyView').then(m => ({ default: m.HowToModifyView })));
const HowToUseView = lazy(() => import('./components/views/HowToUseView').then(m => ({ default: m.HowToUseView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then(m => ({ default: m.SettingsView })));
const BlogView = lazy(() => import('./components/views/BlogView').then(m => ({ default: m.BlogView })));
const PricingView = lazy(() => import('./components/views/PricingView').then(m => ({ default: m.PricingView })));
const WorkspacesView = lazy(() => import('./components/views/WorkspacesView').then(m => ({ default: m.WorkspacesView })));
const NotFoundView = lazy(() => import('./components/views/NotFoundView').then(m => ({ default: m.NotFoundView })));

const SuspenseLoader: React.FC = () => (
  <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
    <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
    <span className="text-xs font-mono">Loading analytical module...</span>
  </div>
);

const MainContent: React.FC = () => {
  const { currentTab, setCurrentTab, isPresentationMode, themeMode, loadDemoDataset, uiMode } = usePlatform();
  const { currentUser, isGuestMode, enterAsGuest, loading, isAuthModalOpen, setIsAuthModalOpen } = useFirebaseAuth();

  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

  // Global Ctrl+K / Cmd+K keyboard shortcut for Command Palette in Modern UI
  useEffect(() => {
    if (uiMode !== 'modern') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiMode]);

  useEffect(() => {
    const handleFlagsUpdate = (e: any) => {
      setFlags(e.detail || loadFeatureFlags());
    };
    window.addEventListener('dataanalytix:features-updated', handleFlagsUpdate);
    return () => window.removeEventListener('dataanalytix:features-updated', handleFlagsUpdate);
  }, []);

  // Hash routing synchronization when enabled
  useEffect(() => {
    if (flags.hashRouting) {
      updateHashForTab(currentTab);

      const handleHashChange = () => {
        const targetTab = getTabFromCurrentHash(currentTab);
        if (targetTab !== currentTab) {
          setCurrentTab(targetTab);
        }
      };

      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, [currentTab, flags.hashRouting, setCurrentTab]);

  // Apply theme attributes to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isLgt = themeMode === 'light';
      if (isLgt) {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('dark', 'theme-dark');
        document.body.classList.add('theme-light');
        document.body.classList.remove('dark', 'theme-dark');
      } else {
        document.documentElement.classList.add('dark', 'theme-dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.add('dark', 'theme-dark');
        document.body.classList.remove('theme-light');
      }

      if (flags.modernTheme && !isLgt) {
        document.documentElement.setAttribute('data-theme', 'modern');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      if (flags.selfHostedFonts) {
        document.documentElement.setAttribute('data-font-fallback', 'system');
      } else {
        document.documentElement.removeAttribute('data-font-fallback');
      }
    }
  }, [flags.modernTheme, flags.selfHostedFonts, themeMode]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0B1120] flex flex-col items-center justify-center gap-4 text-white font-sans">
        <div className="w-12 h-12 rounded-2xl bg-[#22D3EE]/10 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE]">
          <span className="w-6 h-6 border-2 border-[#22D3EE] border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <div className="font-heading font-bold text-base tracking-wider uppercase text-white">
            DATA<span className="text-[#22D3EE]"> ANALYTIX</span>
          </div>
          <p className="text-xs text-gray-400 font-mono">Initializing Governed Workspace & Security Engine...</p>
        </div>
      </div>
    );
  }

  // Auth Gate: Require login or guest demo mode
  if (!currentUser && !isGuestMode) {
    if (flags.publicLanding) {
      return (
        <PublicLandingView
          onExploreSample={() => {
            enterAsGuest();
            loadDemoDataset('global_tech_sales');
            setCurrentTab('executive_dashboard');
          }}
          onOpenLogin={() => setIsAuthModalOpen(true)}
        />
      );
    }
    return <LoginPage />;
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'landing':
        return <LandingPage />;
      case 'executive_dashboard':
        return <ExecutiveDashboard />;
      case 'how_to_use':
        return <HowToUseView />;
      case 'upload':
        return <UploadIngestionView />;
      case 'live_connector':
        return <LiveServerConnectorView />;
      case 'preview':
        return <DataPreviewView />;
      case 'quality':
        return <DataQualityView />;
      case 'cleaning':
        return <DataCleaningLabView />;
      case 'modeling':
        return <DataModelingView />;
      case 'data_engineering':
        return <DataEngineeringSuite />;
      case 'excel_automation':
        return <ExcelAutomationView />;
      case 'analysis':
        return <AnalysisView />;
      case 'dax_lab':
        return <DAXLabView />;
      case 'sql_lab':
        return <SQLLabView />;
      case 'python_lab':
        return <PythonLabView />;
      case 'dashboard_builder':
        return <DashboardBuilderView />;
      case 'ai_insights':
        return <AskDataAIView />;
      case 'reports':
        return <ReportsView />;
      case 'data_dictionary':
        return <DataDictionaryLineageView />;
      case 'export_center':
        return <ExportCenterView />;
      case 'how_to_modify':
        return <HowToModifyView />;
      case 'settings':
        return <SettingsView />;
      case 'blog':
        return <BlogView />;
      case 'pricing':
        return <PricingView />;
      case 'workspaces':
        return <WorkspacesView />;
      default:
        return <NotFoundView onGoHome={() => setCurrentTab('executive_dashboard')} />;
    }
  };

  const isModern = uiMode === 'modern';
  const isLight = themeMode === 'light';

  const themeClasses = isModern
    ? `ui-modern ${isLight ? 'theme-light' : 'theme-dark dark'}`
    : flags.modernTheme
    ? (isLight ? 'theme-modern bg-[#f8fafc] text-slate-900 theme-light' : 'theme-modern bg-[#0B1120] text-slate-100 theme-dark dark')
    : isLight
    ? 'bg-[#f8fafc] text-slate-900 theme-light'
    : 'bg-surface-base text-on-surface theme-dark dark';

  return (
    <div className={`h-screen max-h-screen overflow-hidden ${themeClasses} flex flex-col font-sans transition-colors duration-200`}>
      {!isPresentationMode && (
        isModern ? (
          <ModernNavbar 
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenWelcome={() => setIsWelcomeModalOpen(true)}
          />
        ) : (
          <Navbar />
        )
      )}

      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        {isModern ? (
          <ModernSidebar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
        ) : flags.groupedSidebar ? (
          <GroupedSidebar />
        ) : (
          <Sidebar />
        )}
        <main
          role="main"
          id="main-content"
          className={`flex-1 overflow-y-auto min-h-0 w-full min-w-0 ${
            isLight ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#070D1B] text-slate-100'
          } ${
            isModern ? 'pb-16 md:pb-5 p-3 sm:p-5 lg:p-7' : isPresentationMode ? 'p-3 sm:p-6' : 'p-3 sm:p-5 lg:p-7'
          }`}
        >
          <ErrorBoundary>
            <Suspense fallback={<SuspenseLoader />}>
              {renderActiveView()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Drill-Through Modal with Breadcrumb Depth Tracking */}
      <DrillThroughModal />

      {/* Global Cloud Authentication & Account Modal (Single Authoritative Instance) */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* Global Toast Notification System */}
      <ToastContainer />

      {/* Cookie & Telemetry Privacy Notice */}
      <CookieBanner />

      {/* Fullscreen Boardroom Presentation Deck */}
      {isPresentationMode && <ExecutivePresentationDeck />}

      {/* Modern UI Auxiliary Features */}
      {isModern && !isPresentationMode && (
        <>
          <ModernMobileBottomNav />
          <ModernOnboardingChecklist />
          <ModernCommandPalette 
            isOpen={isCommandPaletteOpen} 
            onClose={() => setIsCommandPaletteOpen(false)} 
          />
          {isWelcomeModalOpen && (
            <div 
              role="dialog"
              aria-modal="true"
              aria-label="Welcome Overview"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
              onClick={() => setIsWelcomeModalOpen(false)}
            >
              <div 
                className="relative max-w-5xl w-full bg-[var(--modern-bg-surface)] border border-[var(--modern-border)] rounded-2xl shadow-2xl p-4 sm:p-6 my-8 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsWelcomeModalOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-lg text-[var(--modern-text-muted)] hover:text-[var(--modern-text)] hover:bg-[var(--modern-bg-surface-2)] transition-colors"
                  aria-label="Close welcome modal"
                >
                  ✕
                </button>
                <ModernWelcome onClose={() => setIsWelcomeModalOpen(false)} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <PlatformProvider>
            <MainContent />
          </PlatformProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
