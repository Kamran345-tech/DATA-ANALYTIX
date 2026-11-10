import React from 'react';

export interface SkeletonCardProps {
  lines?: number;
  hasHeader?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  hasHeader = true,
  className = ''
}) => {
  return (
    <div className={`p-5 rounded-xl border border-slate-800 bg-app animate-pulse ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-elevated rounded-md w-1/3"></div>
          <div className="h-4 bg-elevated rounded-md w-12"></div>
        </div>
      )}
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-elevated rounded-md"
            style={{ width: `${Math.max(45, 95 - i * 18)}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
};
