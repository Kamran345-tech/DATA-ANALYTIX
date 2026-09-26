import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Layers, 
  BookOpen, 
  HelpCircle,
  FolderGit2
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { generateDAXFromNaturalLanguage } from '../../engine/daxEngine';

export const DAXLabView: React.FC = () => {
  const { daxMeasures, columns, dataModel, project } = usePlatform();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [nlPrompt, setNlPrompt] = useState('');
  const [generatedMeasure, setGeneratedMeasure] = useState<{ name: string; formula: string; explanation: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

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

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Code2 className="w-4 h-4" /> Power BI & Tabular Semantic Engine
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            DAX MEASURE LAB
          </h1>
          <p className="text-xs text-gray-400">
            Formulas strictly mapped to your actual schema: <span className="font-mono text-[#21F1A8]">'{tableName}'</span>. Includes Time Intelligence, YoY, and Financial Margins.
          </p>
        </div>

        <button
          onClick={downloadAllDAX}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#222] hover:bg-[#2c2c2c] text-white text-xs border border-[#383838] transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#21F1A8]" /> Download .DAX Package
        </button>
      </div>

      {/* Natural Language to DAX Generator */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#21F1A8]" />
          <h3 className="font-heading text-base font-bold text-white uppercase tracking-wide">
            NATURAL LANGUAGE → DAX SYNTHESIZER
          </h3>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 'Calculate running total of Revenue' or 'Rank products descending'..."
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateNL()}
            className="flex-1 bg-[#141414] text-xs text-white px-3.5 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          />
          <button
            onClick={handleGenerateNL}
            className="px-5 py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-colors shrink-0"
          >
            Generate DAX
          </button>
        </div>

        {generatedMeasure && (
          <div className="p-4 rounded-xl bg-[#141414] border border-[#21F1A8]/40 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#21F1A8] font-mono">{generatedMeasure.name}</span>
              <button
                onClick={() => copyToClipboard(generatedMeasure.formula, 'nl-gen')}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                {copiedId === 'nl-gen' ? <Check className="w-3.5 h-3.5 text-[#21F1A8]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'nl-gen' ? 'Copied' : 'Copy Formula'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-[#0d0d0d] font-mono text-[#21F1A8] overflow-x-auto">
              {generatedMeasure.formula}
            </pre>
            <p className="text-gray-400 text-[11px]">{generatedMeasure.explanation}</p>
          </div>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              categoryFilter === cat 
                ? 'bg-[#21F1A8] text-black border-[#21F1A8]' 
                : 'bg-[#1c1c1c] text-gray-400 border-[#2d2d2d] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Measures Grid */}
      <div className="space-y-4">
        {filteredMeasures.map(measure => (
          <div 
            key={measure.id}
            className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-3 hover:border-[#21F1A8]/30 transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm font-mono">{measure.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#242424] text-gray-300 border border-[#333]">
                  {measure.category}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  Table: '{measure.table}'
                </span>
              </div>

              <button
                onClick={() => copyToClipboard(measure.formula, measure.id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#21F1A8] transition-colors"
              >
                {copiedId === measure.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#21F1A8]" />
                    <span className="text-[#21F1A8]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy DAX</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-[#141414] border border-[#262626] font-mono text-xs text-gray-200 overflow-x-auto whitespace-pre leading-relaxed">
              {measure.formula}
            </pre>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 pt-1">
              <p className="max-w-xl">{measure.description}</p>
              {measure.sourceColumns.length > 0 && (
                <div className="text-[10px] font-mono text-gray-500">
                  Deps: {measure.sourceColumns.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
