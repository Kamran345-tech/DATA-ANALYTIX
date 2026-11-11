import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { PlatformProvider, usePlatform } from './store/usePlatformStore';
import { AuthProvider, useFirebaseAuth } from './store/useFirebaseAuth';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { GroupedSidebar } from './components/layout/GroupedSidebar';
import { ToastContainer } from './components/common/ToastContainer';
import { ToastProvider } from './store/useToast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CookieBanner } from './components/common/CookieBanner';
import { loadFeatureFlags, FeatureFlags } from './config/features';
import { updateHashForTab, getTabFromCurrentHash } from './utils/routing';
import { applyDocumentTheme } from './utils/theme';
import { useThemeTransition } from './hooks/useThemeTransition';
import './styles/modern.css';
import { ModernNavbar } from './components/modern/ModernNavbar';
import { ModernSidebar } from './components/modern/ModernSidebar';
import { ModernOnboardingChecklist } from './components/modern/ModernOnboardingChecklist';
import { ModernMobileBottomNav } from './components/modern/ModernMobileBottomNav';

// Code-split views and heavy overlays using React.lazy for fast initial load
const LoginPage = lazy(() => import('./components/views/LoginPage').then(m => ({ default: m.LoginPage })));
const PublicLandingView = lazy(() => import('./components/views/PublicLandingView').then(m => ({ default: m.PublicLandingView })));
const DrillThroughModal = lazy(() => import('./components/common/DrillThroughModal').then(m => ({ default: m.DrillThroughModal })));
const AuthModal = lazy(() => import('./components/common/AuthModal').then(m => ({ default: m.AuthModal })));
const ExecutivePresentationDeck = lazy(() => import('./components/common/ExecutivePresentationDeck').then(m => ({ default: m.ExecutivePresentationDeck })));
const ModernCommandPalette = lazy(() => import('./components/modern/ModernCommandPalette').then(m => ({ default: m.ModernCommandPalette })));
const ModernWelcome = lazy(() => import('./components/modern/ModernWelcome').then(m => ({ default: m.ModernWelcome })));
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
  <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted">
    <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    <span className="text-xs font-mono">Loading analytical module...</span>
  </div>
);

const MainContent: React.FC = () => {
  const { currentTab, setCurrentTab, isPresentationMode, themeMode, loadDemoDataset, uiMode } = usePlatform();
  const { currentUser, isGuestMode, enterAsGuest, loading, isAuthModalOpen, setIsAuthModalOpen } = useFirebaseAuth();

  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const isThemeTransitioning = useThemeTransition(themeMode, 280);

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

  // Apply theme & feature attributes via single source of truth helper
  useEffect(() => {
    applyDocumentTheme(themeMode, flags);
  }, [flags, themeMode]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-app flex flex-col items-center justify-center gap-4 text-primary font-sans">
        <div className="w-12 h-12 rounded-2xl bg-card border border-subtle flex items-center justify-center text-primary">
          <span className="w-6 h-6 border-2 border-subtle border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <div className="font-heading font-bold text-base tracking-wider uppercase text-primary">
            DATA<span className="text-primary"> ANALYTIX</span>
          </div>
          <p className="text-xs text-secondary font-mono">Initializing Governed Workspace & Security Engine...</p>
        </div>
      </div>
    );
  }

  // Auth Gate: Require login or guest demo mode
  if (!currentUser && !isGuestMode) {
    if (flags.publicLanding) {
      return (
        <Suspense fallback={<SuspenseLoader />}>
          <PublicLandingView
            onExploreSample={() => {
              enterAsGuest();
              loadDemoDataset('global_tech_sales');
              setCurrentTab('executive_dashboard');
            }}
            onOpenLogin={() => setIsAuthModalOpen(true)}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<SuspenseLoader />}>
        <LoginPage />
      </Suspense>
    );
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
    ? (isLight ? 'theme-modern bg-card text-primary theme-light' : 'theme-modern bg-app text-primary theme-dark dark')
    : isLight
    ? 'bg-card text-primary theme-light'
    : 'bg-surface-base text-on-surface theme-dark dark';

  return (
    <div
      className={`h-screen max-h-screen overflow-hidden ${themeClasses} ${
        isThemeTransitioning ? 'theme-crossfade-active' : ''
      } flex flex-col font-sans transition-[background-color,color,border-color,opacity] duration-300 ease-out`}
    >
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
          className={`flex-1 overflow-y-auto min-h-0 w-full min-w-0 transition-[background-color,color,border-color,opacity] duration-300 ease-out ${
            isThemeTransitioning ? 'theme-crossfade-active' : ''
          } ${
            flags.unifiedTheme ? 'bg-app text-primary' : isLight ? 'bg-card text-primary' : 'bg-app text-primary'
          } ${
            isModern ? 'pb-24 md:pb-16 p-3 sm:p-5 lg:p-7' : isPresentationMode ? 'p-3 sm:p-6' : 'pb-20 p-3 sm:p-5 lg:p-7'
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
      <Suspense fallback={null}>
        <DrillThroughModal />
      </Suspense>

      {/* Global Cloud Authentication & Account Modal (Single Authoritative Instance) */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)} 
          />
        </Suspense>
      )}

      {/* Global Toast Notification System */}
      <ToastContainer />

      {/* Cookie & Telemetry Privacy Notice */}
      <CookieBanner />

      {/* Fullscreen Boardroom Presentation Deck */}
      {isPresentationMode && (
        <Suspense fallback={<SuspenseLoader />}>
          <ExecutivePresentationDeck />
        </Suspense>
      )}

      {/* Modern UI Auxiliary Features */}
      {isModern && !isPresentationMode && (
        <>
          <ModernMobileBottomNav />
          <ModernOnboardingChecklist />
          {isCommandPaletteOpen && (
            <Suspense fallback={null}>
              <ModernCommandPalette 
                isOpen={isCommandPaletteOpen} 
                onClose={() => setIsCommandPaletteOpen(false)} 
              />
            </Suspense>
          )}
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
                <Suspense fallback={<SuspenseLoader />}>
                  <ModernWelcome onClose={() => setIsWelcomeModalOpen(false)} />
                </Suspense>
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
