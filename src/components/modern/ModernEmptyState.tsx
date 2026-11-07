import React from 'react';
import { Database, Play, UploadCloud } from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { DEMO_DATASETS } from '../../data/demoDatasets';

export interface ModernEmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const ModernEmptyState: React.FC<ModernEmptyStateProps> = ({
  title = 'No Data Ingested Yet',
  message = 'Load a curated enterprise benchmark dataset or upload your own file to start analyzing.',
  icon: Icon = Database
}) => {
  const { setCurrentTab, loadDemoDataset } = usePlatform();
  const { enterAsGuest } = useFirebaseAuth();

  const handleLoadSample = () => {
    enterAsGuest();
    loadDemoDataset(DEMO_DATASETS[0]?.id || 'sales_demo');
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
          onClick={handleLoadSample}
          className="btn-primary text-xs shadow-xs"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          Load Sample Data
        </button>
        <button
          onClick={() => setCurrentTab('upload')}
          className="btn-secondary text-xs"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[var(--modern-primary)]" />
          Upload Spreadsheet
        </button>
      </div>
    </div>
  );
};
