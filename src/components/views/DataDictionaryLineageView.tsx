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
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <BookOpen className="w-4 h-4" /> Traceability & Data Governance
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            DATA DICTIONARY & LINEAGE
          </h1>
          <p className="text-xs text-gray-400">
            End-to-end provenance. Inspect exact column definitions or trace how raw data evolves into KPIs and exports.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-xl border border-[#333]">
          <button
            onClick={() => setActiveTab('lineage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'lineage' ? 'bg-[#21F1A8] text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Data Lineage Graph
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'dictionary' ? 'bg-[#21F1A8] text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Column Data Dictionary
          </button>
        </div>
      </div>

      {activeTab === 'lineage' ? (
        /* Visual Lineage Graph */
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-6">
          <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wide">
            END-TO-END ANALYTICAL PIPELINE PROVENANCE
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {lineageNodes.map((node, idx) => (
              <div 
                key={node.id} 
                className="p-4 rounded-xl bg-[#141414] border border-[#2a2a2a] space-y-2 relative group hover:border-[#21F1A8]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#21F1A8] bg-[#21F1A8]/10 px-2 py-0.5 rounded font-bold">
                    STEP {node.id}
                  </span>
                  {idx < lineageNodes.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-gray-600 hidden md:block" />
                  )}
                </div>

                <h4 className="font-bold text-white text-xs">{node.title}</h4>
                <p className="text-[11px] text-gray-400 truncate">{node.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] text-xs text-gray-400 space-y-2 font-mono">
            <div className="font-bold text-white uppercase text-[11px]">Auditability Guarantee (Rule 7 & 11):</div>
            <p>
              Every KPI card, chart visual, AI insight, and exported Power BI measure references the exact same immutable source fields and verified calculation formulas.
            </p>
          </div>
        </div>
      ) : (
        /* Data Dictionary Table */
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
          <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wide">
            ENTERPRISE DATA DICTIONARY ({columns.length} FIELDS)
          </h2>

          <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#141414] text-gray-400 border-b border-[#2a2a2a]">
                <tr>
                  <th className="p-3">Field Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Null %</th>
                  <th className="p-3">Distinct %</th>
                  <th className="p-3">Extremes / Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {columns.map(col => {
                  const role = col.isPrimaryKeyCandidate 
                    ? 'Primary Key' 
                    : col.isForeignKeyCandidate 
                    ? 'Foreign Key' 
                    : col.dataType === 'number' 
                    ? 'Measure' 
                    : 'Dimension';

                  return (
                    <tr key={col.name} className="hover:bg-[#202020] text-gray-300">
                      <td className="p-3 font-bold text-white">{col.name}</td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded bg-[#242424] text-gray-300 text-[10px] uppercase">
                          {col.dataType}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          role === 'Primary Key' ? 'bg-amber-500/20 text-amber-300' :
                          role === 'Measure' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-[#262626] text-gray-300'
                        }`}>
                          {role}
                        </span>
                      </td>
                      <td className="p-3">{col.nullPercentage}%</td>
                      <td className="p-3">{col.uniquePercentage}%</td>
                      <td className="p-3 text-gray-400">
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
