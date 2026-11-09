import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Database,
  Table as TableIcon,
  Hash,
  Type,
  Calendar,
  Terminal
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { generateDAXFromNaturalLanguage } from '../../engine/daxEngine';

export const DAXLabView: React.FC = () => {
  const { daxMeasures, columns, dataModel, project, themeMode } = usePlatform();
  const isLight = themeMode === 'light';
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [nlPrompt, setNlPrompt] = useState('');
  const [generatedMeasure, setGeneratedMeasure] = useState<{ name: string; formula: string; explanation: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [activeFormula, setActiveFormula] = useState<string>(() => daxMeasures[0]?.formula || '');

  const tableName = dataModel.tables[0]?.name || 'FactTable';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateNL = () => {
    if (!nlPrompt.trim()) return;
    const res = generateDAXFromNaturalLanguage(nlPrompt, tableName, columns);
    setGeneratedMeasure(res);
    setActiveFormula(res.formula);
  };

  const downloadAllDAX = () => {
    const fullText = daxMeasures.map(m => `// ======================================\n// Measure: ${m.name}\n// Category: ${m.category}\n// Description: ${m.description}\n// ======================================\n${m.formula}\n`).join('\n\n');
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_DAX_Measures.dax`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = ['All', 'Aggregation', 'Time Intelligence', 'Financial', 'Ranking'];
  const filteredMeasures = categoryFilter === 'All' 
    ? daxMeasures 
    : daxMeasures.filter(m => m.category === categoryFilter);

  const insertColumnRef = (colName: string) => {
    setActiveFormula(prev => `${prev}${prev ? ' ' : ''}'${tableName}'[${colName}]`);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="depth-card rounded-[20px] p-6 border bg-card border-subtle shadow-[var(--shadow-card)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent-2)] font-mono">
            <Code2 className="w-4 h-4" /> Power BI &amp; Tabular Semantic Engine
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight uppercase text-primary">
            DAX MEASURE WORKBENCH
          </h1>
          <p className="text-xs text-secondary">
            Formulas strictly mapped to your active schema: <span className="font-mono text-accent">'{tableName}'</span>. Includes Time Intelligence, YoY, and Financial Margins.
          </p>
        </div>

        <button
          onClick={downloadAllDAX}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--accent-2)] text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
        >
          <Download className="w-3.5 h-3.5" /> Download .DAX Package
        </button>
      </div>

      {/* Workbench Split Grid: Left Tables & Measures Tree (4 cols) + Right Formula Chrome & Output (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Semantic Tables & Columns Panel */}
        <aside className="lg:col-span-4 depth-card rounded-[20px] border bg-card border-subtle shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-4 py-3 border-b bg-elevated border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--accent-2)]">
              <TableIcon className="w-3.5 h-3.5" />
              <span>Semantic Model</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-elevated text-[var(--accent-2)] border border-subtle">
              {daxMeasures.length} measures
            </span>
          </div>

          <div className="p-3 space-y-3 max-h-[540px] overflow-y-auto">
            <div className="rounded-xl border p-3 space-y-2 bg-elevated border-subtle">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold flex items-center gap-1.5 text-primary">
                  <Database className="w-3.5 h-3.5 text-[var(--accent-2)] shrink-0" />
                  <span className="truncate">'{tableName}'</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-accent border border-subtle">
                  Tabular
                </span>
              </div>

              <div className="space-y-1 pt-1 border-t border-subtle">
                {columns.map(col => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => insertColumnRef(col.name)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer hover:bg-card text-secondary hover:text-primary"
                    title={`Click to insert '${tableName}'[${col.name}]`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {col.dataType === 'number' ? (
                        <Hash className="w-3 h-3 text-accent shrink-0" />
                      ) : col.dataType === 'date' ? (
                        <Calendar className="w-3 h-3 text-[var(--accent-2)] shrink-0" />
                      ) : (
                        <Type className="w-3 h-3 text-[var(--info)] shrink-0" />
                      )}
                      <span className="truncate">[{col.name}]</span>
                    </span>
                    <span className="text-[10px] text-muted uppercase shrink-0 ml-2">{col.dataType}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills in Sidebar */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-muted px-1">
                Filter Measure Category
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer ${
                      categoryFilter === cat 
                        ? 'bg-[var(--accent-2)] text-white border-transparent font-bold' 
                        : 'bg-elevated text-secondary border-subtle hover:text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT: NL to DAX + Formula Editor Chrome + Monospace Measures Output */}
        <div className="lg:col-span-8 space-y-5">
          {/* Natural Language to DAX Generator */}
          <div className="depth-card rounded-[20px] p-4 border bg-card border-subtle shadow-[var(--shadow-card)] space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-2)]" />
              <h3 className="font-heading text-xs font-bold uppercase tracking-wide text-primary">
                NATURAL LANGUAGE &rarr; DAX SYNTHESIZER
              </h3>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 'Calculate running total of Revenue' or 'Rank products descending'..."
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateNL()}
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border bg-input text-primary border-subtle focus:border-[var(--accent-2)] focus:outline-none"
              />
              <button
                onClick={handleGenerateNL}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent-2)] text-white font-bold text-xs transition-colors shrink-0 cursor-pointer"
              >
                Generate DAX
              </button>
            </div>

            {generatedMeasure && (
              <div className="p-3.5 rounded-xl bg-elevated border border-subtle space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[var(--accent-2)]">{generatedMeasure.name}</span>
                  <button
                    onClick={() => copyToClipboard(generatedMeasure.formula, 'nl-gen')}
                    className="text-xs text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'nl-gen' ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'nl-gen' ? 'Copied' : 'Copy Formula'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-input border border-subtle font-mono text-[var(--accent-2)] overflow-x-auto">
                  {generatedMeasure.formula}
                </pre>
                <p className="text-secondary text-[11px] font-sans">{generatedMeasure.explanation}</p>
              </div>
            )}
          </div>

          {/* DAX Workbench Editor Chrome */}
          <div className="editor-chrome no-depth-3d rounded-[20px] border bg-card border-subtle shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-elevated border-subtle text-secondary flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <span className="font-mono text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card text-[var(--accent-2)] border border-subtle">
                  <Terminal className="w-3 h-3" />
                  semantic_measures.dax ('{tableName}')
                </span>
              </div>

              <button
                onClick={() => copyToClipboard(activeFormula, 'active-editor')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-card-hover text-secondary hover:text-primary transition-colors cursor-pointer font-mono text-[11px]"
              >
                {copiedId === 'active-editor' ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'active-editor' ? 'Copied' : 'Copy Buffer'}</span>
              </button>
            </div>

            <div className="p-3 bg-input border-t border-subtle">
              <textarea
                aria-label="DAX formula workbench editor"
                value={activeFormula}
                onChange={(e) => setActiveFormula(e.target.value)}
                rows={5}
                className="no-depth-3d w-full bg-transparent text-xs sm:text-sm text-[var(--accent-2)] font-mono p-2 focus:outline-none leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Monospace Verified DAX Measures Catalog */}
          <div className="space-y-3 no-depth-3d">
            {filteredMeasures.map(measure => (
              <div 
                key={measure.id}
                onClick={() => setActiveFormula(measure.formula)}
                className="rounded-[20px] p-5 border bg-card border-subtle hover:border-strong shadow-[var(--shadow-card)] space-y-3 transition-colors cursor-pointer"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm font-mono text-primary">
                      {measure.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-elevated text-[var(--accent-2)] border border-subtle">
                      {measure.category}
                    </span>
                    <span className="text-[10px] text-muted font-mono">
                      Table: '{measure.table}'
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(measure.formula, measure.id);
                    }}
                    className="flex items-center gap-1 text-xs font-mono text-secondary hover:text-[var(--accent-2)] transition-colors cursor-pointer"
                  >
                    {copiedId === measure.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-accent" />
                        <span className="text-accent">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy DAX</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3.5 rounded-xl bg-input border border-subtle font-mono text-xs text-primary overflow-x-auto whitespace-pre leading-relaxed">
                  {measure.formula}
                </pre>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-secondary pt-1">
                  <p className="max-w-xl">{measure.description}</p>
                  {measure.sourceColumns.length > 0 && (
                    <div className="text-[10px] font-mono text-muted">
                      Deps: {measure.sourceColumns.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
