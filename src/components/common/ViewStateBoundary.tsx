import React from 'react';
import {
  Database,
  UploadCloud,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export interface EmptyDatasetStateProps {
  title?: string;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onLoadSample?: () => void;
  onUploadFile?: () => void;
  showUploadButton?: boolean;
}

/**
 * Shared Empty State with friendly SVG illustration and 1 clear primary action (Phase 3.5).
 */
export const EmptyDatasetState: React.FC<EmptyDatasetStateProps> = ({
  title = 'No dataset loaded in workspace',
  description = 'Load our verified enterprise sample dataset in one click or upload your own CSV, Excel, or JSON file to populate this view.',
  primaryActionLabel = 'Load Sample Dataset',
  onPrimaryAction,
  onLoadSample,
  onUploadFile,
  showUploadButton = true,
}) => {
  const { loadDemoDataset, setCurrentTab } = usePlatform();

  const handlePrimary = () => {
    if (onLoadSample) {
      onLoadSample();
    } else if (onPrimaryAction) {
      onPrimaryAction();
    } else {
      loadDemoDataset('global-retail-sales');
    }
  };

  const handleUpload = () => {
    if (onUploadFile) {
      onUploadFile();
    } else {
      setCurrentTab('upload');
    }
  };

  return (
    <div
      data-testid="empty-dataset-state"
      role="region"
      aria-label={title}
      className="depth-card rounded-[20px] border border-subtle bg-card p-8 sm:p-10 text-center max-w-2xl mx-auto my-4 space-y-5 shadow-xs"
    >
      {/* Friendly geometric illustration */}
      <div className="w-16 h-16 rounded-2xl bg-accent-soft border border-subtle text-accent flex items-center justify-center mx-auto shadow-xs">
        <Database className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-primary tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-secondary max-w-lg mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <button
          type="button"
          data-testid="empty-state-load-sample-btn"
          onClick={handlePrimary}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-accent hover:opacity-95 text-on-accent text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-opacity cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{primaryActionLabel}</span>
        </button>

        {(showUploadButton || Boolean(onUploadFile)) && (
          <button
            type="button"
            data-testid="empty-state-upload-btn"
            onClick={handleUpload}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-input hover:bg-elevated border border-subtle text-primary text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-accent" />
            <span>Upload File</span>
          </button>
        )}
      </div>
    </div>
  );
};

export interface LoadingSkeletonStateProps {
  label?: string;
  cards?: number;
}

/**
 * Shared Loading Skeleton Shimmer state (Phase 3.5).
 */
export const LoadingSkeletonState: React.FC<LoadingSkeletonStateProps> = ({
  label = 'Computing analytical view...',
  cards = 4,
}) => {
  return (
    <div
      data-testid="loading-skeleton-state"
      role="status"
      aria-busy="true"
      aria-label={label}
      className="space-y-4 my-4"
    >
      <div className="flex items-center gap-2.5 text-xs font-mono text-secondary">
        <span className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin inline-block" />
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-subtle bg-card p-5 space-y-3 animate-pulse"
          >
            <div className="h-3 w-24 rounded bg-elevated" />
            <div className="h-7 w-32 rounded bg-elevated" />
            <div className="h-3 w-full rounded bg-input" />
          </div>
        ))}
      </div>
    </div>
  );
};

export interface ViewErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

/**
 * Shared View Error State with recovery action (Phase 3.5).
 */
export const ViewErrorState: React.FC<ViewErrorStateProps> = ({
  title = 'Unable to complete analytical operation',
  message,
  onRetry,
}) => {
  const { loadDemoDataset } = usePlatform();

  return (
    <div
      data-testid="view-error-state"
      role="alert"
      className="rounded-2xl border border-subtle bg-card p-6 space-y-4 max-w-2xl mx-auto my-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-input border border-subtle text-danger flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <h3 className="font-heading text-base font-bold text-primary">{title}</h3>
          <p className="text-sm text-secondary break-words">{message}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={onRetry || (() => loadDemoDataset('global-retail-sales'))}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-accent text-on-accent text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{onRetry ? 'Retry Operation' : 'Restore Sample Dataset'}</span>
        </button>
      </div>
    </div>
  );
};
