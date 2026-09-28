import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Table2, 
  Sparkles,
  Download,
  RotateCcw,
  Layers,
  Settings2,
  Check,
  Eye,
  Filter
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { VisualConfig } from '../../types';

export const DashboardBuilderView: React.FC = () => {
  const { 
    customVisuals, 
    addCustomVisual, 
    removeCustomVisual, 
    columns, 
    cleanRows,
    analytics,
    setFilters
  } = usePlatform();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nlPrompt, setNlPrompt] = useState('');
  const [activePreset, setActivePreset] = useState<string>('custom');

  // Form states for new visual modal
  const [title, setTitle] = useState('');
  const [type, setType] = useState<VisualConfig['type']>('bar');
  const [catField, setCatField] = useState(
    columns.find(c => c.dataType === 'string')?.name || columns[0]?.name || ''
  );
  const [valField, setValField] = useState(
    columns.find(c => c.dataType === 'number')?.name || columns[0]?.name || ''
  );
  const [aggregation, setAggregation] = useState<VisualConfig['aggregation']>('sum');
  const [colorTheme, setColorTheme] = useState('#21F1A8');

  // Local state to override chart types or metrics per card
  const [visualOverrides, setVisualOverrides] = useState<Record<string, { type?: VisualConfig['type']; valueField?: string; categoryField?: string }>>({});

  // Ensure default visuals are populated if empty
  useEffect(() => {
    if (customVisuals.length === 0 && analytics.visuals && analytics.visuals.length > 0) {
      analytics.visuals.forEach(v => addCustomVisual(v));
    }
  }, [customVisuals.length, analytics.visuals, addCustomVisual]);

  // Numeric and String columns
  const numericCols = useMemo(() => columns.filter(c => c.dataType === 'number'), [columns]);
  const stringCols = useMemo(() => columns.filter(c => c.dataType === 'string' || c.dataType === 'date'), [columns]);

  // Handle creating visual from form
  const handleCreateVisual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newVisual: VisualConfig = {
      id: `vis-${Date.now()}`,
      title: title.trim(),
      type,
      categoryField: catField || stringCols[0]?.name || 'Category',
      valueField: valField || numericCols[0]?.name || 'Value',
      aggregation,
      color: colorTheme,
      description: `${aggregation.toUpperCase()}(${valField}) segmented by ${catField}`
    };

    addCustomVisual(newVisual);
    setIsModalOpen(false);
    setTitle('');
  };

  // AI Prompt Synthesizer
  const handleAIGenerate = () => {
    if (!nlPrompt.trim()) return;
    const lower = nlPrompt.toLowerCase();
    
    // Choose chart type
    let chosenType: VisualConfig['type'] = 'bar';
    if (lower.includes('trend') || lower.includes('time') || lower.includes('month') || lower.includes('line')) {
      chosenType = 'line';
    } else if (lower.includes('share') || lower.includes('pie') || lower.includes('donut') || lower.includes('proportion')) {
      chosenType = 'donut';
    } else if (lower.includes('table') || lower.includes('matrix') || lower.includes('detail')) {
      chosenType = 'table';
    }

    const numCol = numericCols.find(c => lower.includes(c.name.toLowerCase()))?.name || numericCols[0]?.name || 'Value';
    const catCol = stringCols.find(c => lower.includes(c.name.toLowerCase()))?.name || stringCols[0]?.name || 'Category';

    const generated: VisualConfig = {
      id: `vis-ai-${Date.now()}`,
      title: `${numCol} Breakdown by ${catCol}`,
      type: chosenType,
      categoryField: catCol,
      valueField: numCol,
      aggregation: lower.includes('average') || lower.includes('avg') ? 'avg' : 'sum',
      color: chosenType === 'donut' ? '#00d8f6' : '#21F1A8',
      description: `Synthesized: "${nlPrompt}"`
    };

    addCustomVisual(generated);
    setNlPrompt('');
  };

  // Load Preset Dashboard templates
  const loadPreset = (presetName: string) => {
    setActivePreset(presetName);
    const num1 = numericCols[0]?.name || 'Revenue';
    const num2 = numericCols[1]?.name || num1;
    const str1 = stringCols[0]?.name || 'Category';
    const str2 = stringCols[1]?.name || str1;

    if (presetName === 'financial') {
      const p1: VisualConfig = {
        id: `vis-p1-${Date.now()}`,
        title: `Primary Revenue Performance (${str1})`,
        type: 'bar',
        categoryField: str1,
        valueField: num1,
        aggregation: 'sum',
        color: '#21F1A8'
      };
      const p2: VisualConfig = {
        id: `vis-p2-${Date.now()}`,
        title: `Financial Share Breakdown (${str2})`,
        type: 'donut',
        categoryField: str2,
        valueField: num2,
        aggregation: 'sum',
        color: '#00d8f6'
      };
      const p3: VisualConfig = {
        id: `vis-p3-${Date.now()}`,
        title: `Monthly Growth Progression`,
        type: 'line',
        categoryField: columns.find(c => c.dataType === 'date')?.name || str1,
        valueField: num1,
        aggregation: 'sum',
        color: '#f59e0b'
      };
      const p4: VisualConfig = {
        id: `vis-p4-${Date.now()}`,
        title: `Operational Matrix Overview`,
        type: 'table',
        categoryField: str1,
        valueField: num1,
        aggregation: 'avg',
        color: '#a855f7'
      };
      [p1, p2, p3, p4].forEach(v => addCustomVisual(v));
    } else if (presetName === 'operations') {
      const p1: VisualConfig = {
        id: `vis-op1-${Date.now()}`,
        title: `Volume & Transaction Distribution`,
        type: 'bar',
        categoryField: str1,
        valueField: num1,
        aggregation: 'count',
        color: '#21F1A8'
      };
      const p2: VisualConfig = {
        id: `vis-op2-${Date.now()}`,
        title: `Segment Channel Proportion`,
        type: 'donut',
        categoryField: str2,
        valueField: num1,
        aggregation: 'sum',
        color: '#ec4899'
      };
      [p1, p2].forEach(v => addCustomVisual(v));
    }
  };

  // Helper to switch type on a card
  const toggleChartType = (visId: string, currentType: VisualConfig['type']) => {
    const sequence: VisualConfig['type'][] = ['bar', 'line', 'donut', 'table'];
    const nextType = sequence[(sequence.indexOf(currentType) + 1) % sequence.length];
    setVisualOverrides(prev => ({
      ...prev,
      [visId]: { ...prev[visId], type: nextType }
    }));
  };

  // Helper to compute grouped data with proper aggregation
  const computeGroupedData = (
    categoryField: string, 
    valueField: string, 
    agg: VisualConfig['aggregation'] = 'sum'
  ) => {
    const groupMap = new Map<string, { sum: number; count: number; min: number; max: number }>();
    let grandTotal = 0;

    cleanRows.forEach(r => {
      const cat = String(r[categoryField] ?? 'Unassigned');
      const val = Number(r[valueField]) || 0;
      
      const current = groupMap.get(cat) || { sum: 0, count: 0, min: val, max: val };
      current.sum += val;
      current.count += 1;
      current.min = Math.min(current.min, val);
      current.max = Math.max(current.max, val);
      groupMap.set(cat, current);

      grandTotal += val;
    });

    const entries = Array.from(groupMap.entries()).map(([cat, stats]) => {
      let finalVal = stats.sum;
      if (agg === 'avg') finalVal = stats.count > 0 ? stats.sum / stats.count : 0;
      else if (agg === 'count') finalVal = stats.count;
      else if (agg === 'min') finalVal = stats.min;
      else if (agg === 'max') finalVal = stats.max;

      return {
        category: cat,
        value: Math.round(finalVal * 100) / 100,
        count: stats.count,
        share: grandTotal > 0 ? Math.round((stats.sum / grandTotal) * 1000) / 10 : 0
      };
    });

    // Sort descending by value
    entries.sort((a, b) => b.value - a.value);
    return { items: entries.slice(0, 10), grandTotal, allCount: entries.length };
  };

  // Export current visual as CSV
  const handleExportCSV = (visTitle: string, items: { category: string; value: number; share: number }[]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      ['Category,Value,SharePct', ...items.map(i => `"${i.category}",${i.value},${i.share}%`)].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `${visTitle.replace(/[^a-zA-Z0-9]/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn w-full max-w-7xl mx-auto">
      {/* 1. Header & Actions */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <SlidersHorizontal className="w-4 h-4" /> Custom Dashboard Composition Studio
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-wide uppercase">
            DASHBOARD BUILDER & VISUAL STUDIO
          </h1>
          <p className="text-xs text-gray-400">
            Build, rearrange, and customize your analytical dashboard. Switch between Bar, Line, Donut, and Table views in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Presets */}
          <div className="hidden sm:flex items-center bg-[#141414] border border-[#333] rounded-xl p-1 text-xs">
            <button
              onClick={() => loadPreset('financial')}
              className="px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-[#252525] transition-colors"
            >
              Executive Pack
            </button>
            <button
              onClick={() => loadPreset('operations')}
              className="px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-[#252525] transition-colors"
            >
              Operations Pack
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] hover:glow-neon transition-all"
          >
            <Plus className="w-4 h-4" /> Add Custom Visual
          </button>
        </div>
      </div>

      {/* 2. Natural Language Visual Composer */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Sparkles className="w-4 h-4 text-[#21F1A8]" />
          <span>NATURAL LANGUAGE DASHBOARD SYNTHESIS</span>
          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">(Type what you want to chart and press Enter)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="e.g. 'Show revenue by region as a donut chart' or 'Trend of sales over time'..."
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
            className="flex-1 bg-[#141414] text-xs text-white px-3.5 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          />
          <button
            onClick={handleAIGenerate}
            className="px-4 py-2.5 rounded-xl bg-[#252525] hover:bg-[#2f2f2f] text-white text-xs font-medium border border-[#3d3d3d] hover:border-[#21F1A8]/50 transition-colors shrink-0"
          >
            Synthesize Visual
          </button>
        </div>
      </div>

      {/* 3. Visuals Canvas Grid */}
      {customVisuals.length === 0 ? (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-12 text-center space-y-4">
          <Layers className="w-12 h-12 text-[#21F1A8] mx-auto opacity-70" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Canvas Ready for Custom Analytics</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Add custom visualizations using the button above, or click below to load pre-built executive analytical widgets.
            </p>
          </div>
          <button
            onClick={() => loadPreset('financial')}
            className="px-4 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97]"
          >
            Load Recommended Visual Suite
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {customVisuals.map((vis) => {
            const override = visualOverrides[vis.id] || {};
            const activeType = override.type || vis.type;
            const activeVal = override.valueField || vis.valueField;
            const activeCat = override.categoryField || vis.categoryField;

            const { items, grandTotal } = computeGroupedData(activeCat, activeVal, vis.aggregation);
            const maxVal = Math.max(...items.map(i => i.value), 1);
            const primaryColor = vis.color || '#21F1A8';

            return (
              <div 
                key={vis.id}
                className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4 hover:border-[#21F1A8]/40 transition-all flex flex-col justify-between"
              >
                {/* Visual Header & Toolbar */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-bold text-white uppercase truncate">
                        {vis.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400 font-mono pt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#21F1A8] border border-[#2d2d2d] uppercase">
                          {vis.aggregation}({activeVal})
                        </span>
                        <span>by</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-white border border-[#2d2d2d]">
                          {activeCat}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Chart Type Toggle Button */}
                      <button
                        onClick={() => toggleChartType(vis.id, activeType)}
                        className="px-2 py-1 rounded-lg bg-[#141414] border border-[#333] hover:border-[#21F1A8]/50 text-gray-300 hover:text-white text-[11px] font-mono flex items-center gap-1"
                        title="Click to cycle chart types (Bar, Line, Donut, Table)"
                      >
                        {activeType === 'bar' && <BarChart3 className="w-3.5 h-3.5 text-[#21F1A8]" />}
                        {activeType === 'line' && <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
                        {activeType === 'donut' && <PieChart className="w-3.5 h-3.5 text-pink-400" />}
                        {activeType === 'table' && <Table2 className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="uppercase text-[9px] font-bold">{activeType}</span>
                      </button>

                      {/* Export CSV */}
                      <button
                        onClick={() => handleExportCSV(vis.title, items)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                        title="Export Chart Data as CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove Visual */}
                      <button
                        onClick={() => removeCustomVisual(vis.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-[#252525] transition-colors"
                        title="Remove Visual"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Field Selectors */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#262626]">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-gray-500 font-mono">Axis:</span>
                      <select
                        value={activeCat}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: { ...prev[vis.id], categoryField: e.target.value }
                        }))}
                        className="bg-[#141414] text-xs text-gray-300 px-2 py-0.5 rounded border border-[#2e2e2e] focus:border-[#21F1A8] focus:outline-none"
                      >
                        {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-gray-500 font-mono">Metric:</span>
                      <select
                        value={activeVal}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: { ...prev[vis.id], valueField: e.target.value }
                        }))}
                        className="bg-[#141414] text-xs text-[#21F1A8] font-mono px-2 py-0.5 rounded border border-[#2e2e2e] focus:border-[#21F1A8] focus:outline-none"
                      >
                        {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* REAL CHART RENDERING ENGINE */}
                <div className="py-2 min-h-[200px] flex items-center justify-center">
                  {/* BAR CHART */}
                  {activeType === 'bar' && (
                    <div className="w-full space-y-2.5">
                      {items.map((item, idx) => {
                        const pct = Math.min(100, Math.max(6, (item.value / maxVal) * 100));
                        return (
                          <div key={idx} className="space-y-1 group">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-300 font-medium truncate max-w-[200px] group-hover:text-white">
                                {item.category}
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-white font-semibold">{item.value.toLocaleString()}</span>
                                <span className="text-[10px] text-gray-500">({item.share}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-[#141414] h-3 rounded-full overflow-hidden border border-[#282828] p-0.5">
                              <div 
                                className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                                style={{ 
                                  width: `${pct}%`,
                                  backgroundColor: idx === 0 ? primaryColor : idx === 1 ? '#00d8f6' : idx === 2 ? '#f59e0b' : '#6b7280'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* LINE / AREA CHART */}
                  {activeType === 'line' && (
                    <div className="w-full">
                      {items.length >= 2 ? (
                        <div className="relative w-full">
                          <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
                            <defs>
                              <linearGradient id={`grad-${vis.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            
                            {/* Gridlines */}
                            {[0, 0.5, 1].map((pct, i) => (
                              <line 
                                key={i} 
                                x1="40" 
                                y1={20 + 150 * (1 - pct)} 
                                x2="480" 
                                y2={20 + 150 * (1 - pct)} 
                                stroke="#282828" 
                                strokeDasharray="3,3" 
                              />
                            ))}

                            {/* Line & Area */}
                            {(() => {
                              const coords = items.map((it, i) => ({
                                x: 40 + (i / (items.length - 1)) * 440,
                                y: 20 + 150 - (it.value / maxVal) * 150
                              }));
                              const pathD = coords.reduce((acc, curr, i) => i === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`, '');
                              const areaD = `${pathD} L ${coords[coords.length - 1].x},170 L ${coords[0].x},170 Z`;
                              
                              return (
                                <>
                                  <path d={areaD} fill={`url(#grad-${vis.id})`} />
                                  <path d={pathD} fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  {coords.map((c, i) => (
                                    <circle key={i} cx={c.x} cy={c.y} r="4" fill="#171717" stroke={primaryColor} strokeWidth="2" />
                                  ))}
                                </>
                              );
                            })()}
                          </svg>

                          {/* X-axis Labels */}
                          <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
                            <span className="truncate max-w-[100px]">{items[0]?.category}</span>
                            <span className="truncate max-w-[100px]">{items[Math.floor(items.length / 2)]?.category}</span>
                            <span className="truncate max-w-[100px]">{items[items.length - 1]?.category}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-gray-500">Need at least 2 points to render line chart.</div>
                      )}
                    </div>
                  )}

                  {/* DONUT CHART */}
                  {activeType === 'donut' && (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-around gap-4">
                      <div className="relative w-36 h-36 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          {(() => {
                            let cumulativePct = 0;
                            const colors = ['#21F1A8', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
                            return items.slice(0, 6).map((item, idx) => {
                              const strokeDasharray = `${item.share * 2.512} 251.2`;
                              const strokeDashoffset = -cumulativePct * 2.512;
                              cumulativePct += item.share;
                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="transparent"
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth="14"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  className="transition-all hover:opacity-80"
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] text-gray-400 uppercase font-mono">Total</span>
                          <span className="text-xs font-bold text-white font-mono">{grandTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-1.5 text-xs w-full max-w-[200px]">
                        {items.slice(0, 5).map((item, idx) => {
                          const colors = ['#21F1A8', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
                          return (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                                <span className="text-gray-300 truncate">{item.category}</span>
                              </div>
                              <span className="font-mono text-gray-400 text-[11px]">{item.share}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* DATA TABLE */}
                  {activeType === 'table' && (
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#141414] text-gray-400 border-b border-[#2d2d2d]">
                          <tr>
                            <th className="p-2">Rank</th>
                            <th className="p-2">{activeCat}</th>
                            <th className="p-2 text-right">{activeVal}</th>
                            <th className="p-2 text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#252525]">
                          {items.map((it, idx) => (
                            <tr key={idx} className="hover:bg-[#1f1f1f] transition-colors">
                              <td className="p-2 text-gray-500 font-bold">#{idx + 1}</td>
                              <td className="p-2 text-white font-sans">{it.category}</td>
                              <td className="p-2 text-right text-[#21F1A8] font-semibold">{it.value.toLocaleString()}</td>
                              <td className="p-2 text-right text-gray-400">{it.share}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Footer Insight */}
                <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>Aggregation: {vis.aggregation.toUpperCase()}</span>
                  <span>Top {items.length} segments analyzed</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add Visual Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#1c1c1c] border border-[#333] rounded-3xl p-6 max-w-lg w-full space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-3">
              <h3 className="font-heading text-xl font-bold text-white uppercase flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#21F1A8]" />
                COMPOSE NEW VISUAL
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVisual} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-medium">Visualization Title</label>
                <input
                  type="text"
                  placeholder="e.g. Regional Sales Volume Breakdown"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Chart Representation</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    <option value="bar">Bar Chart (Ranking & Comparison)</option>
                    <option value="line">Line / Trend Curve (Progression)</option>
                    <option value="donut">Donut Ring (Part-to-Whole)</option>
                    <option value="table">Data Table (Detailed Matrix)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Aggregation Function</label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as any)}
                    className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    <option value="sum">SUM (Total Aggregate)</option>
                    <option value="avg">AVERAGE (Mean Value)</option>
                    <option value="count">COUNT (Number of Records)</option>
                    <option value="max">MAX (Peak Value)</option>
                    <option value="min">MIN (Lowest Value)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Dimension (Category Axis)</label>
                  <select
                    value={catField}
                    onChange={(e) => setCatField(e.target.value)}
                    className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Metric (Numerical Value)</label>
                  <select
                    value={valField}
                    onChange={(e) => setValField(e.target.value)}
                    className="w-full bg-[#141414] text-[#21F1A8] font-mono p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-gray-300 font-medium">Accent Color Theme</label>
                <div className="flex items-center gap-3 pt-1">
                  {[
                    { color: '#21F1A8', label: 'Tiffany Neon' },
                    { color: '#00d8f6', label: 'Cyan' },
                    { color: '#f59e0b', label: 'Amber' },
                    { color: '#ec4899', label: 'Rose' },
                    { color: '#a855f7', label: 'Purple' }
                  ].map(c => (
                    <button
                      type="button"
                      key={c.color}
                      onClick={() => setColorTheme(c.color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${colorTheme === c.color ? 'border-white scale-110' : 'border-transparent opacity-70'}`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    >
                      {colorTheme === c.color && <Check className="w-3.5 h-3.5 text-black" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2d2d2d]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#262626] text-gray-300 hover:bg-[#333] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold hover:bg-[#1cdb97] transition-all"
                >
                  Create & Mount Visual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
