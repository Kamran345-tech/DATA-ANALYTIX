import React from 'react';

export interface ModernPageHeaderProps {
  title: string;
  description?: string;
  category?: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
}

export const ModernPageHeader: React.FC<ModernPageHeaderProps> = ({
  title,
  description,
  category,
  breadcrumbs,
  actions
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-[var(--modern-border)]">
      <div className="space-y-1">
        {(category || (breadcrumbs && breadcrumbs.length > 0)) && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--modern-text-muted)] font-medium">
            {category && <span>{category}</span>}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <>
                {category && <span aria-hidden="true">/</span>}
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span aria-hidden="true">/</span>}
                    <span className={idx === breadcrumbs.length - 1 ? 'text-[var(--modern-primary)] font-semibold' : ''}>
                      {crumb}
                    </span>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--modern-text)]">
          {title}
        </h1>
        {description && (
          <p className="text-xs md:text-sm text-[var(--modern-text-muted)] max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
