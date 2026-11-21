import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  Database,
  Layers,
  Clock,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { ColumnProfile } from '../../types';
import {
  MeasureType,
  PackId,
  SemanticColumnRole,
  buildDatasetUnderstandingProfile,
  saveDatasetColumnOverride,
  saveDatasetGrainOverride,
} from '../../analytics';
import { toast } from '../../store/useToast';

const SEMANTIC_ROLES: SemanticColumnRole[] = [
  'id',
  'date',
  'amount',
  'quantity',
  'rate',
  'category',
  'geo',
  'text',
];

const MEASURE_TYPES: MeasureType[] = ['additive', 'average', 'ratio'];

export interface DatasetUnderstandingCardProps {
  datasetName: string;
  rows: Record<string, any>[];
  columns: ColumnProfile[];
  roleMapping?: Record<string, string>;
  packId?: PackId;
  defaultExpanded?: boolean;
  onProfileUpdated?: () => void;
}

export const DatasetUnderstandingCard: React.FC<
  DatasetUnderstandingCardProps
> = ({
  datasetName,
  rows,
  columns,
  roleMapping,
  packId = 'financial',
  defaultExpanded = false,
  onProfileUpdated,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditingGrain, setIsEditingGrain] = useState(false);
  const [grainInput, setGrainInput] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRevision((r) => r + 1);
    window.addEventListener('dataanalytix:learning-updated', handleUpdate);
    return () =>
      window.removeEventListener('dataanalytix:learning-updated', handleUpdate);
  }, []);

  const colNames = useMemo(
    () =>
      columns.length > 0
        ? columns.map((c) => c.name)
        : rows.length > 0
        ? Object.keys(rows[0])
        : [],
    [columns, rows]
  );

  const profile = useMemo(
    () =>
      buildDatasetUnderstandingProfile({
        datasetName,
        rows,
        columns,
        roleMapping,
      }),
    [datasetName, rows, columns, roleMapping, revision]
  );

  const handleSaveGrain = () => {
    if (!grainInput.trim()) {
      setIsEditingGrain(false);
      return;
    }
    saveDatasetGrainOverride(colNames, grainInput.trim());
    setIsEditingGrain(false);
    setRevision((r) => r + 1);
    onProfileUpdated?.();
    toast.success(
      'Dataset Grain Updated',
      `Learned grain: "${grainInput.trim()}"`
    );
  };

  const handleRoleChange = (colName: string, newRole: SemanticColumnRole) => {
    saveDatasetColumnOverride(
      colNames,
      colName,
      { semanticRole: newRole },
      packId
    );
    setRevision((r) => r + 1);
    onProfileUpdated?.();
    toast.info(
      'Learned Column Semantic Role',
      `Mapped [${colName}] to semantic role "${newRole}".`
    );
  };

  const handleMeasureTypeChange = (
    colName: string,
    newMeasureType: MeasureType
  ) => {
    saveDatasetColumnOverride(
      colNames,
      colName,
      { measureType: newMeasureType },
      packId
    );
    setRevision((r) => r + 1);
    onProfileUpdated?.();
    toast.info(
      'Learned Measure Type',
      `Set [${colName}] measure behavior to "${newMeasureType}".`
    );
  };

  if (rows.length === 0 && columns.length === 0) return null;

  const learnedOverridesCount = profile.columns.filter(
    (c) => c.isLearnedOverride
  ).length;

  return (
    <section
      data-testid="dataset-understanding-card"
      className="rounded-2xl bg-card border border-subtle p-4 sm:p-5 space-y-3 shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent border border-subtle flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-primary">
                How I understood your data
              </h3>
              <span
                data-testid="understanding-time-granularity"
                className="px-2 py-0.5 rounded-md bg-elevated text-secondary border border-subtle text-[10px] font-mono uppercase"
              >
                <Clock className="w-2.5 h-2.5 inline mr-1 text-accent" />
                {profile.timeGranularity} granularity
              </span>
              {learnedOverridesCount > 0 && (
                <span
                  data-testid="learned-rule-badge"
                  className="px-2 py-0.5 rounded-md bg-accent-soft text-accent border border-subtle text-[10px] font-mono font-semibold"
                >
                  Learned from your earlier correction ({learnedOverridesCount})
                </span>
              )}
            </div>

            {/* Grain Display & Inline Editor */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {isEditingGrain ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    data-testid="understanding-grain-input"
                    value={grainInput}
                    onChange={(e) => setGrainInput(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-input text-primary border border-strong text-xs font-mono"
                  />
                  <button
                    type="button"
                    data-testid="understanding-grain-save-btn"
                    onClick={handleSaveGrain}
                    className="px-2.5 py-1 rounded-lg bg-accent text-on-accent text-xs font-semibold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p
                  data-testid="understanding-grain-text"
                  className="text-xs text-secondary font-mono"
                >
                  <strong className="text-primary">Grain:</strong>{' '}
                  {profile.grain}
                  <button
                    type="button"
                    data-testid="understanding-grain-edit-btn"
                    onClick={() => {
                      setGrainInput(profile.grain);
                      setIsEditingGrain(true);
                    }}
                    title="Edit dataset grain"
                    className="ml-2 inline-flex items-center gap-1 text-[10px] text-accent hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>Edit</span>
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          data-testid="toggle-understanding-details-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated hover:bg-card-hover text-secondary hover:text-primary border border-subtle text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>
            {isExpanded
              ? 'Hide schema profile'
              : `Inspect & edit ${profile.columnCount} columns`}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Summary Pills Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-secondary">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-elevated border border-subtle">
          <Database className="w-3 h-3 text-accent" />
          <span>
            {profile.rowCount.toLocaleString()} rows × {profile.columnCount}{' '}
            cols
          </span>
        </span>
        {profile.hierarchies.length > 0 && (
          <span
            data-testid="understanding-hierarchies"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-elevated border border-subtle"
          >
            <GitBranch className="w-3 h-3 text-accent" />
            <span>Hierarchy: {profile.hierarchies.join(' • ')}</span>
          </span>
        )}
        {profile.primaryKeyColumns.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-elevated border border-subtle">
            <Layers className="w-3 h-3 text-accent" />
            <span>Key: {profile.primaryKeyColumns.slice(0, 2).join(', ')}</span>
          </span>
        )}
        {profile.qualityNotes[0] && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-elevated border border-subtle">
            <ShieldCheck className="w-3 h-3 text-accent" />
            <span>{profile.qualityNotes[0]}</span>
          </span>
        )}
      </div>

      {/* Expandable Inline Column Semantic & Measure Type Editor */}
      {isExpanded && (
        <div
          data-testid="understanding-columns-table"
          className="pt-3 border-t border-subtle overflow-x-auto"
        >
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-subtle text-muted text-[10px] uppercase">
                <th className="py-2 pr-3">Column</th>
                <th className="py-2 px-3">Semantic Role (Editable)</th>
                <th className="py-2 px-3">Unit / Currency</th>
                <th className="py-2 px-3">Measure Type (Editable)</th>
                <th className="py-2 pl-3">Completeness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {profile.columns.map((col) => (
                <tr key={col.columnName} className="hover:bg-elevated">
                  <td className="py-2 pr-3 font-bold text-primary">
                    {col.columnName}
                    {col.mappedPackRole && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-accent-soft text-accent text-[10px]">
                        → {col.mappedPackRole}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <select
                      data-testid={`understanding-role-select-${col.columnName}`}
                      value={col.semanticRole}
                      onChange={(e) =>
                        handleRoleChange(
                          col.columnName,
                          e.target.value as SemanticColumnRole
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-input text-primary border border-subtle text-xs font-mono cursor-pointer"
                    >
                      {SEMANTIC_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-secondary">{col.unit}</td>
                  <td className="py-2 px-3">
                    <select
                      data-testid={`understanding-measure-select-${col.columnName}`}
                      value={col.measureType}
                      onChange={(e) =>
                        handleMeasureTypeChange(
                          col.columnName,
                          e.target.value as MeasureType
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-input text-primary border border-subtle text-xs font-mono cursor-pointer"
                    >
                      {MEASURE_TYPES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pl-3 text-secondary">
                    {100 - col.nullPct}% ({col.distinctCount} distinct)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
