import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Table, 
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { VisualConfig } from '../../types';

export const DashboardBuilderView: React.FC = () => {
  const { customVisuals, addCustomVisual, removeCustomVisual, columns, cleanRows } = usePlatform();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nlPrompt, setNlPrompt] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState<VisualConfig['type']>('bar');
  const [catField, setCatField] = useState(columns.find(c => c.dataType === 'string')?.name || columns[0]?.name || '');
  const [valField, setValField] = useState(columns.find(c => c.dataType === 'number')?.name || columns[0]?.name || '');
  const [aggregation, setAggregation] = useState<VisualConfig['aggregation']>('sum');

  const handleCreateVisual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newVisual: VisualConfig = {
      id: `vis-${Date.now()}`,
      title: title.trim(),
      type,
      categoryField: catField,
      valueField: valField,
      aggregation,
      color: '#21F1A8'
    };

    addCustomVisual(newVisual);
    setIsModalOpen(false);
    setTitle('');
  };

  const handleAIGenerate = () => {
    if (!nlPrompt.trim()) return;
    const numCol = columns.find(c => c.dataType === 'number')?.name || 'Value';
    const catCol = columns.find(c => c.dataType === 'string')?.name || 'Category';

    const generated: VisualConfig = {
      id: `vis-ai-${Date.now()}`,
      title: `${numCol} Distribution by ${catCol}`,
      type: 'bar',
      categoryField: catCol,
      valueField: numCol,
      aggregation: 'sum',
      color: '#21F1A8',
      description: `Synthesized from prompt: "${nlPrompt}"`
    };

    addCustomVisual(generated);
    setNlPrompt('');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <SlidersHorizontal className="w-4 h-4" /> Layout Composition Center
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            DASHBOARD BUILDER
          </h1>
          <p className="text-xs text-gray-400">
            Design tailored dashboards. Compose custom visualizations, pick aggregations, or use AI prompt synthesis.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all"
        >
          <Plus className="w-4 h-4" /> Add Custom Visual
        </button>
      </div>

      {/* AI Dashboard Composer */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4.5 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Sparkles className="w-4 h-4 text-[#21F1A8]" />
          <span>NATURAL LANGUAGE DASHBOARD SYNTHESIS</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 'Create an operations breakdown comparing regional sales'..."
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
            className="flex-1 bg-[#141414] text-xs text-white px-3.5 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          />
          <button
            onClick={handleAIGenerate}
            className="px-4 py-2 rounded-xl bg-[#282828] hover:bg-[#333] text-white text-xs border border-[#444] transition-colors"
          >
            Synthesize Visual
          </button>
        </div>
      </div>

      {/* Visuals Canvas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customVisuals.map(vis => {
          // Compute simple grouped data for preview
          const groupMap = new Map<string, number>();
          cleanRows.forEach(r => {
            const cat = String(r[vis.categoryField] || 'Unassigned');
            const val = Number(r[vis.valueField]) || 0;
            groupMap.set(cat, (groupMap.get(cat) || 0) + val);
          });
          const topEntries = Array.from(groupMap.entries()).slice(0, 5);
          const maxVal = Math.max(...topEntries.map(e => e[1]), 1);

          return (
            <div 
              key={vis.id}
              className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4 hover:border-[#21F1A8]/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-white uppercase">{vis.title}</h3>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {vis.type.toUpperCase()} • {vis.aggregation.toUpperCase()}({vis.valueField}) by {vis.categoryField}
                  </span>
                </div>
                <button
                  onClick={() => removeCustomVisual(vis.id)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-[#252525] transition-colors"
                  title="Remove Visual"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Chart Preview Representation */}
              <div className="space-y-2 pt-2">
                {topEntries.map(([cat, val], i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 truncate max-w-[200px]">{cat}</span>
                      <span className="text-white font-mono">{val.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-[#141414] h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#21F1A8] h-full rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(5, (val / maxVal) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Visual Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-3xl p-6 max-w-md w-full space-y-5 animate-scaleUp">
            <h3 className="font-heading text-2xl font-bold text-white uppercase">ADD NEW VISUAL</h3>

            <form onSubmit={handleCreateVisual} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-400 font-medium">Chart Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sales by Product Category"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-medium">Chart Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="donut">Donut Chart</option>
                  <option value="table">Data Table</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-medium">Dimension (Axis)</label>
                  <select
                    value={catField}
                    onChange={(e) => setCatField(e.target.value)}
                    className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-400 font-medium">Metric (Value)</label>
                  <select
                    value={valField}
                    onChange={(e) => setValField(e.target.value)}
                    className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    {columns.filter(c => c.dataType === 'number').map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#262626] text-gray-300 hover:bg-[#333]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold hover:bg-[#1cdb97]"
                >
                  Create Visual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
