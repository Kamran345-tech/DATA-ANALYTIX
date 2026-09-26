import React from 'react';
import { PlatformProvider, usePlatform } from './store/usePlatformStore';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './components/views/LandingPage';
import { ExecutiveDashboard } from './components/views/ExecutiveDashboard';
import { UploadIngestionView } from './components/views/UploadIngestionView';
import { DataPreviewView } from './components/views/DataPreviewView';
import { DataQualityView } from './components/views/DataQualityView';
import { DataCleaningLabView } from './components/views/DataCleaningLabView';
import { DataModelingView } from './components/views/DataModelingView';
import { AnalysisView } from './components/views/AnalysisView';
import { DAXLabView } from './components/views/DAXLabView';
import { SQLLabView } from './components/views/SQLLabView';
import { PythonLabView } from './components/views/PythonLabView';
import { DashboardBuilderView } from './components/views/DashboardBuilderView';
import { AskDataAIView } from './components/views/AskDataAIView';
import { ReportsView } from './components/views/ReportsView';
import { DataDictionaryLineageView } from './components/views/DataDictionaryLineageView';
import { ExportCenterView } from './components/views/ExportCenterView';
import { HowToModifyView } from './components/views/HowToModifyView';
import { SettingsView } from './components/views/SettingsView';
import { BlogView } from './components/views/BlogView';
import { AlertTriangle, X, UploadCloud } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentTab, setCurrentTab, project, isPresentationMode } = usePlatform();
  const [showDemoBanner, setShowDemoBanner] = React.useState(true);

  const renderActiveView = () => {
    switch (currentTab) {
      case 'landing':
        return <LandingPage />;
      case 'executive_dashboard':
        return <ExecutiveDashboard />;
      case 'upload':
        return <UploadIngestionView />;
      case 'preview':
        return <DataPreviewView />;
      case 'quality':
        return <DataQualityView />;
      case 'cleaning':
        return <DataCleaningLabView />;
      case 'modeling':
        return <DataModelingView />;
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
      default:
        return <ExecutiveDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#171717] text-gray-100 flex flex-col font-sans">
      {!isPresentationMode && <Navbar />}

      {/* Prominent Demo Data Banner (RULE 9 & 10) */}
      {project.isDemo && showDemoBanner && !isPresentationMode && (
        <div className="bg-amber-950/40 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-extrabold text-[10px] tracking-wider uppercase font-mono animate-pulse">
              DEMO DATA ACTIVE
            </span>
            <span>
              You are currently viewing a simulated benchmark dataset ({project.name}). Upload your real company spreadsheets to calculate proprietary KPIs and star schema models.
            </span>
            <button
              onClick={() => setCurrentTab('upload')}
              className="text-[#21F1A8] hover:underline font-bold whitespace-nowrap ml-2 flex items-center gap-1"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Upload Real Data
            </button>
          </div>
          <button
            onClick={() => setShowDemoBanner(false)}
            className="text-amber-400 hover:text-amber-200 p-1"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 overflow-y-auto ${isPresentationMode ? 'p-6' : 'p-4 sm:p-6 lg:p-8'}`}>
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <PlatformProvider>
      <MainContent />
    </PlatformProvider>
  );
}

export default App;
