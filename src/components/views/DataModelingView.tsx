import React, { useState } from 'react';
import { 
  Network, 
  Key, 
  Layers, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Share2, 
  ZoomIn, 
  ZoomOut,
  Database
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const DataModelingView: React.FC = () => {
  const { dataModel, project } = usePlatform();
  const [zoom, setZoom] = useState(1);
  const [focusedTable, setFocusedTable] = useState<string | null>(null);

  const exportSchemaJSON = () => {
    const blob = new Blob([JSON.stringify(dataModel, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_Data_Model.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Network className="w-4 h-4" /> Relational Architecture Engine
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            STAR SCHEMA & DATA MODEL DIAGRAM
          </h1>
          <p className="text-xs text-gray-400">
            Automated entity-relationship detection. Fact tables house measures while dimension tables filter context via 1:N cardinality.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportSchemaJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#222] hover:bg-[#2c2c2c] text-white text-xs border border-[#383838] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#21F1A8]" /> Export Schema JSON
          </button>
        </div>
      </div>

      {/* Model Overview Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-4 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-1">
          <span className="text-gray-500 uppercase text-[10px]">Schema Structure</span>
          <div className="text-lg font-bold text-[#21F1A8] uppercase">{dataModel.schemaType} SCHEMA</div>
        </div>
        <div className="p-4 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-1">
          <span className="text-gray-500 uppercase text-[10px]">Total Tables</span>
          <div className="text-lg font-bold text-white">{dataModel.tables.length} Active Tables</div>
        </div>
        <div className="p-4 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-1">
          <span className="text-gray-500 uppercase text-[10px]">Relationships</span>
          <div className="text-lg font-bold text-white">{dataModel.relationships.length} Detected Keys</div>
        </div>
        <div className="p-4 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-1">
          <span className="text-gray-500 uppercase text-[10px]">Validation Status</span>
          <div className="text-lg font-bold text-[#21F1A8] flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Valid
          </div>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-3xl p-6 relative overflow-hidden min-h-[500px]">
        {/* Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#1c1c1c]/90 backdrop-blur p-1 rounded-xl border border-[#333] z-20">
          <button 
            onClick={() => setZoom(z => Math.max(0.7, z - 0.1))} 
            className="p-1.5 hover:bg-[#252525] rounded text-gray-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono px-1.5 text-gray-400">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(z => Math.min(1.4, z + 0.1))} 
            className="p-1.5 hover:bg-[#252525] rounded text-gray-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* ER Diagram Representation */}
        <div 
          className="transition-transform duration-200 origin-top flex flex-wrap items-start justify-center gap-8 pt-8"
          style={{ transform: `scale(${zoom})` }}
        >
          {dataModel.tables.map(table => {
            const isFact = table.type === 'fact';
            const isFocused = focusedTable === table.id;

            return (
              <div
                key={table.id}
                onClick={() => setFocusedTable(table.id === focusedTable ? null : table.id)}
                className={`w-72 bg-[#1c1c1c] rounded-2xl border transition-all cursor-pointer shadow-xl ${
                  isFact 
                    ? 'border-[#21F1A8]/60 glow-neon' 
                    : 'border-[#333] hover:border-[#21F1A8]/40'
                } ${isFocused ? 'ring-2 ring-[#21F1A8]' : ''}`}
              >
                {/* Table Header */}
                <div className={`p-3.5 rounded-t-2xl border-b flex items-center justify-between ${
                  isFact ? 'bg-[#21F1A8]/15 border-[#21F1A8]/30' : 'bg-[#202020] border-[#333]'
                }`}>
                  <div className="flex items-center gap-2">
                    <Database className={`w-4 h-4 ${isFact ? 'text-[#21F1A8]' : 'text-purple-400'}`} />
                    <span className="font-bold text-white text-xs font-mono">{table.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                    isFact ? 'bg-[#21F1A8] text-black' : 'bg-[#333] text-gray-300'
                  }`}>
                    {table.type}
                  </span>
                </div>

                {/* Table Columns List */}
                <div className="p-3 space-y-1.5 max-h-56 overflow-y-auto font-mono text-[11px]">
                  {table.columns.map(col => {
                    const isPk = table.primaryKey === col.name || col.isPrimaryKeyCandidate;
                    const isFk = col.isForeignKeyCandidate || col.name.toLowerCase().endsWith('id');

                    return (
                      <div 
                        key={col.name} 
                        className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#252525] text-gray-300"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                          {isPk ? (
                            <Key className="w-3 h-3 text-amber-400 shrink-0" />
                          ) : isFk ? (
                            <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
                          ) : (
                            <span className="w-3 h-3 text-gray-600 block text-center">•</span>
                          )}
                          <span className={isPk ? 'text-amber-300 font-semibold truncate' : 'truncate'}>
                            {col.name}
                          </span>
                        </div>
                        <span className="text-gray-500 text-[10px]">{col.dataType}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2 border-t border-[#262626] bg-[#171717] rounded-b-2xl text-[10px] text-gray-500 font-mono text-center">
                  {table.rowCount.toLocaleString()} records in schema
                </div>
              </div>
            );
          })}
        </div>

        {/* Relationships list beneath diagram */}
        {dataModel.relationships.length > 0 && (
          <div className="mt-12 pt-6 border-t border-[#262626] space-y-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
              DETECTED RELATIONSHIP CONSTRAINTS
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {dataModel.relationships.map(rel => (
                <div key={rel.id} className="p-3 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] text-xs font-mono space-y-1">
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Cardinality: <strong className="text-[#21F1A8]">{rel.cardinality}</strong></span>
                    <span className="px-1.5 py-0.2 bg-[#222] rounded text-[9px] text-gray-400">Single Filter</span>
                  </div>
                  <div className="text-white truncate">
                    {rel.sourceTable}.[{rel.sourceColumn}] → {rel.targetTable}.[{rel.targetColumn}]
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
