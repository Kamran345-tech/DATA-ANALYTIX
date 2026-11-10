import React, { useState } from 'react';
import { 
  BookOpen, 
  GitCommit, 
  ArrowRight, 
  Database, 
  Layers, 
  FileSpreadsheet, 
  LayoutDashboard, 
  DownloadCloud, 
  Key,
  ShieldCheck
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const DataDictionaryLineageView: React.FC = () => {
  const { columns, project, dataModel, transformations } = usePlatform();
  const [activeTab, setActiveTab] = useState<'dictionary' | 'lineage'>('lineage');

  const lineageNodes = [
    { id: '1', title: 'Source Ingestion', desc: project.sourceFileName, type: 'source' },
    { id: '2', title: '01_Raw_Data', desc: `${project.rowCount} raw rows`, type: 'raw' },
    { id: '3', title: 'Cleaning Engine', desc: `${transformations.length} transformations applied`, type: 'clean' },
    { id: '4', title: '02_Clean_Data', desc: 'Active analytical state', type: 'clean_data' },
    { id: '5', title: 'Relational Model', desc: `${dataModel.tables.length} Star Schema tables`, type: 'model' },
    { id: '6', title: 'Semantic Measures', desc: 'Automated DAX & SQL bindings', type: 'measures' },
    { id: '7', title: 'Executive Dashboard', desc: 'Decision Support System', type: 'dashboard' },
    { id: '8', title: 'Power BI & Excel', desc: '14-Folder Complete Project ZIP', type: 'export' }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-card border border-subtle rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400 font-mono">
            <BookOpen className="w-4 h-4" /> Traceability & Data Governance
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary tracking-wide uppercase">
            DATA DICTIONARY & LINEAGE
          </h1>
          <p className="text-xs text-secondary">
            End-to-end provenance. Inspect exact column definitions or trace how raw data evolves into KPIs and exports.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-subtle">
          <button
            onClick={() => setActiveTab('lineage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'lineage' ? 'bg-sky-600 text-primary' : 'text-secondary hover:text-primary'
            }`}
          >
            Data Lineage Graph
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'dictionary' ? 'bg-sky-600 text-primary' : 'text-secondary hover:text-primary'
            }`}
          >
            Column Data Dictionary
          </button>
        </div>
      </div>

      {activeTab === 'lineage' ? (
        /* Visual Lineage Graph */
        <div className="bg-card border border-subtle rounded-2xl p-6 space-y-6">
          <h2 className="font-heading text-xl font-bold text-primary uppercase tracking-wide">
            END-TO-END ANALYTICAL PIPELINE PROVENANCE
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {lineageNodes.map((node, idx) => (
              <div 
                key={node.id} 
                className="p-4 rounded-xl bg-card border border-subtle space-y-2 relative group hover:border-sky-500/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded font-bold border border-sky-500/20">
                    STEP {node.id}
                  </span>
                  {idx < lineageNodes.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted hidden md:block" />
                  )}
                </div>

                <h4 className="font-bold text-primary text-xs">{node.title}</h4>
                <p className="text-[11px] text-secondary truncate">{node.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-card border border-subtle text-xs text-secondary space-y-2 font-mono">
            <div className="font-bold text-primary uppercase text-[11px]">Auditability Guarantee (Rule 7 & 11):</div>
            <p>
              Every KPI card, chart visual, AI insight, and exported Power BI measure references the exact same immutable source fields and verified calculation formulas.
            </p>
          </div>
        </div>
      ) : (
        /* Data Dictionary Table */
        <div className="bg-card border border-subtle rounded-2xl p-6 space-y-4">
          <h2 className="font-heading text-xl font-bold text-primary uppercase tracking-wide">
            ENTERPRISE DATA DICTIONARY ({columns.length} FIELDS)
          </h2>

          <div className="overflow-x-auto rounded-xl border border-subtle">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-card text-secondary border-b border-subtle">
                <tr>
                  <th className="p-3">Field Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Null %</th>
                  <th className="p-3">Distinct %</th>
                  <th className="p-3">Extremes / Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {columns.map(col => {
                  const role = col.isPrimaryKeyCandidate 
                    ? 'Primary Key' 
                    : col.isForeignKeyCandidate 
                    ? 'Foreign Key' 
                    : col.dataType === 'number' 
                    ? 'Measure' 
                    : 'Dimension';

                  return (
                    <tr key={col.name} className="hover:bg-elevated text-secondary">
                      <td className="p-3 font-bold text-primary">{col.name}</td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded bg-elevated text-secondary text-[10px] uppercase">
                          {col.dataType}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          role === 'Primary Key' ? 'bg-amber-500/20 text-amber-300' :
                          role === 'Measure' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-elevated text-secondary'
                        }`}>
                          {role}
                        </span>
                      </td>
                      <td className="p-3">{col.nullPercentage}%</td>
                      <td className="p-3">{col.uniquePercentage}%</td>
                      <td className="p-3 text-secondary">
                        {col.min !== undefined ? `${col.min} - ${col.max}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
