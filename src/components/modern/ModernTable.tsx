import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal } from 'lucide-react';

export interface ColumnDef<T = any> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  isNumeric?: boolean;
  sortable?: boolean;
}

export interface ModernTableProps<T = any> {
  columns: ColumnDef<T>[];
  data: T[];
  title?: string;
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
}

export function ModernTable<T extends Record<string, any>>({
  columns,
  data,
  title,
  pageSize = 10,
  emptyMessage = 'No rows to display in the current scope.',
  className = ''
}: ModernTableProps<T>) {
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const compare = valA > valB ? 1 : -1;
      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [data, sortKey, sortDirection]);

  const totalPages = Math.ceil((sortedData.length || 1) / pageSize);
  const pagedRows = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className={`modern-card overflow-hidden flex flex-col ${className}`}>
      {/* Table Toolbar Header */}
      <div className="p-4 border-b border-[var(--modern-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--modern-bg-surface)]">
        <div>
          {title && <h3 className="font-bold text-sm text-[var(--modern-text)]">{title}</h3>}
          <span className="text-xs text-[var(--modern-text-muted)] font-mono">
            {sortedData.length.toLocaleString()} records
          </span>
        </div>

        {/* Density Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--modern-bg-surface-2)] border border-[var(--modern-border)] text-xs">
          <button
            onClick={() => setDensity('comfortable')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              density === 'comfortable' ? 'bg-[var(--modern-primary)] text-white shadow-xs' : 'text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]'
            }`}
          >
            Comfortable
          </button>
          <button
            onClick={() => setDensity('compact')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              density === 'compact' ? 'bg-[var(--modern-primary)] text-white shadow-xs' : 'text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]'
            }`}
          >
            Compact
          </button>
        </div>
      </div>

      {/* Table Scroller */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className={`modern-table ${density === 'compact' ? 'modern-table-compact' : ''}`}>
          <thead>
            <tr>
              {columns.map(col => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`${col.isNumeric ? 'text-right' : 'text-left'} ${col.sortable !== false ? 'cursor-pointer select-none hover:text-[var(--modern-text)]' : ''}`}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.isNumeric ? 'justify-end' : ''}`}>
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        isSorted ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[var(--modern-primary)]" /> : <ArrowDown className="w-3.5 h-3.5 text-[var(--modern-primary)]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-[var(--modern-text-subtle)] opacity-40 hover:opacity-100" />
                        )
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-[var(--modern-text-muted)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pagedRows.map((row, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 1 ? 'bg-[var(--modern-bg-surface-2)]/40' : ''}>
                  {columns.map(col => {
                    const rawVal = col.accessor ? col.accessor(row) : row[col.key];
                    const isNum = col.isNumeric || typeof rawVal === 'number';

                    return (
                      <td
                        key={col.key}
                        className={`${isNum ? 'text-right font-mono tabular-nums' : 'text-left'}`}
                      >
                        {rawVal !== null && rawVal !== undefined ? String(rawVal) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-[var(--modern-border)] bg-[var(--modern-bg-surface-2)] flex items-center justify-between text-xs text-[var(--modern-text-muted)]">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-md border border-[var(--modern-border)] disabled:opacity-40 hover:bg-[var(--modern-bg-surface)] transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-md border border-[var(--modern-border)] disabled:opacity-40 hover:bg-[var(--modern-bg-surface)] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
