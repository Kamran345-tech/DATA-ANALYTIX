import React from 'react';
import { PlatformProvider, usePlatform } from './store/usePlatformStore';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './components/views/LandingPage';
import { ExecutiveDashboard } from './components/views/ExecutiveDashboard';
import { UploadIngestionView } from './components/views/UploadIngestionView';
import { LiveServerConnectorView } from './components/views/LiveServerConnectorView';
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
import { DrillThroughModal } from './components/common/DrillThroughModal';

const MainContent: React.FC = () => {
  const { currentTab, setCurrentTab, isPresentationMode, themeMode } = usePlatform();

  const renderActiveView = () => {
    switch (currentTab) {
      case 'landing':
        return <LandingPage />;
      case 'executive_dashboard':
        return <ExecutiveDashboard />;
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
    <div className={`min-h-screen ${themeMode === 'light' ? 'bg-[#f8fafc] text-slate-900 theme-light' : 'bg-[#171717] text-gray-100 theme-dark'} flex flex-col font-sans transition-colors duration-200`}>
      {!isPresentationMode && <Navbar />}

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className={`flex-1 overflow-y-auto w-full min-w-0 ${isPresentationMode ? 'p-3 sm:p-6' : 'p-3 sm:p-5 lg:p-7'}`}>
          {renderActiveView()}
        </main>
      </div>

      {/* Global Drill-Through Modal with Breadcrumb Depth Tracking */}
      <DrillThroughModal />
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
