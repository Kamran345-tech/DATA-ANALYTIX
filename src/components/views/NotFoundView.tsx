import React from 'react';

export interface NotFoundViewProps {
  onGoHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onGoHome }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-soft border border-subtle flex items-center justify-center text-accent mb-6">
        <span className="material-symbols-outlined text-3xl">troubleshoot</span>
      </div>
      <h1 className="text-3xl font-bold text-primary mb-2">Module Not Found (404)</h1>
      <p className="text-sm text-secondary max-w-md mb-6 leading-relaxed">
        The analytical view or deep-linked hash route requested does not exist or has been relocated in the active catalog.
      </p>
      <button
        onClick={onGoHome}
        className="px-5 py-2.5 rounded-lg bg-accent hover:opacity-90 text-on-accent font-bold text-sm transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">dashboard</span>
        Return to Executive Dashboard
      </button>
    </div>
  );
};

