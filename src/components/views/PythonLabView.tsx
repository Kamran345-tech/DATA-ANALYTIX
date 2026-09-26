import React, { useState, useEffect } from 'react';
import { 
  FileCode2, 
  Play, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Cpu,
  Table
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { generatePythonScript, runSandboxedPythonAnalysis, PythonExecutionResult } from '../../engine/pythonEngine';

export const PythonLabView: React.FC = () => {
  const { cleanRows, columns, project, dataModel } = usePlatform();
  const tableName = dataModel.tables[0]?.name || 'FactTable';

  const [script, setScript] = useState('');
  const [result, setResult] = useState<PythonExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const py = generatePythonScript(project.sourceFileName, tableName, columns);
    setScript(py);
  }, [project.sourceFileName, tableName, columns]);

  const handleRun = () => {
    const res = runSandboxedPythonAnalysis(script, cleanRows, columns);
    setResult(res);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = () => {
    const blob = new Blob([script], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_Analysis.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <FileCode2 className="w-4 h-4" /> Reproducible Data Science Engine
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            PYTHON DATA ANALYSIS LAB
          </h1>
          <p className="text-xs text-gray-400">
            Automated Python pipeline with <span className="font-mono text-[#21F1A8]">pandas</span>, <span className="font-mono text-[#21F1A8]">numpy</span>, and <span className="font-mono text-[#21F1A8]">matplotlib</span>. Run analysis in sandboxed runtime or export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadScript}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#242424] hover:bg-[#303030] text-gray-300 text-xs border border-[#383838] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#21F1A8]" /> Export .py
          </button>
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-black" /> Run In-Browser
          </button>
        </div>
      </div>

      {/* Python Code Editor */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="font-mono text-[11px] flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#21F1A8]" /> pipeline.py
          </span>
          <button
            onClick={copyScript}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#21F1A8]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={12}
          className="w-full bg-[#121212] text-xs text-gray-200 font-mono p-4 rounded-xl border border-[#262626] focus:outline-none focus:border-[#21F1A8] leading-relaxed"
        />
      </div>

      {/* Output Terminal / Execution Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Cards */}
          {result.summaryCards && result.summaryCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.summaryCards.map((card, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2d2d2d] space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">{card.label}</span>
                  <div className="text-xl font-heading font-bold text-[#21F1A8]">{card.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Statistical Describe Table */}
          {result.tableOutput && (
            <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-3">
              <h3 className="font-heading text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Table className="w-4 h-4 text-[#21F1A8]" />
                PANDAS DF.DESCRIBE() OUTPUT
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#141414] text-gray-400 border-b border-[#2a2a2a]">
                    <tr>
                      <th className="p-2.5">Field</th>
                      <th className="p-2.5">Count</th>
                      <th className="p-2.5">Mean</th>
                      <th className="p-2.5">Std Dev</th>
                      <th className="p-2.5">Min</th>
                      <th className="p-2.5">Median</th>
                      <th className="p-2.5">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {result.tableOutput.map(r => (
                      <tr key={r.column} className="hover:bg-[#202020] text-gray-300">
                        <td className="p-2.5 font-bold text-white">{r.column}</td>
                        <td className="p-2.5">{r.count}</td>
                        <td className="p-2.5 text-[#21F1A8]">{r.mean.toLocaleString()}</td>
                        <td className="p-2.5">{r.std.toLocaleString()}</td>
                        <td className="p-2.5">{r.min.toLocaleString()}</td>
                        <td className="p-2.5">{r.median.toLocaleString()}</td>
                        <td className="p-2.5">{r.max.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Standard Output Console */}
          <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#21F1A8]" /> Standard Output (Stdout)
              </span>
              <span className="text-gray-500 font-mono">Completed in {result.durationMs}ms</span>
            </div>
            <pre className="p-4 rounded-xl bg-[#0e0e0e] border border-[#262626] text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
              {result.stdout}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
