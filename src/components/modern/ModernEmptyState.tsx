import React from 'react';
import { Database, Play, UploadCloud } from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { DEMO_DATASETS } from '../../data/demoDatasets';
import { DownloadMenu, DownloadMenuContext } from '../common/DownloadMenu';

export interface ModernEmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
  downloadContext?: DownloadMenuContext;
}

function mapTabToDownloadContext(tab: string): DownloadMenuContext {
  switch (tab) {
    case 'executive_dashboard':
      return 'executive_dashboard';
    case 'dashboard_builder':
      return 'dashboard_builder';
    case 'preview':
      return 'preview';
    case 'quality':
      return 'quality';
    case 'cleaning':
      return 'cleaning';
    case 'modeling':
      return 'modeling';
    case 'sql_lab':
      return 'sql_lab';
    case 'dax_lab':
      return 'dax_lab';
    case 'python_lab':
      return 'python_lab';
    case 'reports':
      return 'reports';
    case 'export_center':
      return 'export_center';
    default:
      return 'executive_dashboard';
  }
}

export const ModernEmptyState: React.FC<ModernEmptyStateProps> = ({
  title = 'No Data Ingested Yet',
  message = 'Load a curated enterprise benchmark dataset or upload your own file to start analyzing.',
  icon: Icon = Database,
  downloadContext,
}) => {
  const { currentTab, setCurrentTab, loadDemoDataset } = usePlatform();
  const { enterAsGuest } = useFirebaseAuth();

  const resolvedContext = downloadContext || mapTabToDownloadContext(currentTab);

  const handleLoadSample = () => {
    enterAsGuest();
    loadDemoDataset(DEMO_DATASETS[0]?.id || 'global_tech_sales');
    setCurrentTab('executive_dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center modern-card max-w-xl mx-auto my-12 border border-[var(--modern-border)]">
      <div className="w-14 h-14 rounded-2xl bg-[var(--modern-primary-muted)] text-[var(--modern-primary)] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-[var(--modern-text)] mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-[var(--modern-text-muted)] max-w-sm mb-6 leading-relaxed">
        {message}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleLoadSample}
          className="btn-primary text-xs shadow-xs cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Load Sample Data
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab('upload')}
          className="btn-secondary text-xs cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[var(--modern-primary)]" />
          Upload Spreadsheet
        </button>
        <DownloadMenu context={resolvedContext} label="Download Templates & Guides" />
      </div>
    </div>
  );
};
