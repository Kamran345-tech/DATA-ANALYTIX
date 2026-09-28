import React, { useState } from 'react';
import { 
  Settings, 
  Building2, 
  Palette, 
  Clock, 
  Check, 
  ShieldCheck, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const SettingsView: React.FC = () => {
  const { brand, setBrand, project, updateProjectMetadata, auditLogs } = usePlatform();

  const [companyName, setCompanyName] = useState(brand.companyName);
  const [department, setDepartment] = useState(brand.department);
  const [author, setAuthor] = useState(brand.author);
  const [themeColor, setThemeColor] = useState(brand.themeColor);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    setBrand({
      ...brand,
      companyName,
      department,
      author,
      themeColor
    });
    updateProjectMetadata({ companyName, department, author });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-8 pb-16 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
            <Settings className="w-4 h-4" /> Central Governance & Identity
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-wide uppercase">
            SETTINGS & BRANDING
          </h1>
          <p className="text-xs text-gray-400">
            Define corporate branding parameters. Applied universally across dashboards, executive PDF reports, and Power BI themes.
          </p>
        </div>

        {savedNotice && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30 text-xs font-mono">
            <Check className="w-4 h-4" /> Configuration Saved
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branding Configuration Form */}
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
          <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#21F1A8]" />
            ORGANIZATION & REPORTING BRAND
          </h3>

          <form onSubmit={handleSaveBranding} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-gray-400 font-medium">Enterprise Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-medium">Department / Division</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-medium">Prepared By (Lead Analyst)</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-medium">Primary Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[#333]"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-32 bg-[#141414] text-white p-2 rounded-lg border border-[#333] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setThemeColor('#21F1A8')}
                  className="text-[11px] text-gray-400 hover:text-[#21F1A8] underline"
                >
                  Reset Tiffany Green
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Brand Settings
            </button>
          </form>
        </div>

        {/* Project Version & Governance */}
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
          <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#21F1A8]" />
            PROJECT VERSION & RUNTIME
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Project Identifier:</span>
              <span className="text-white">{project.id}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Active Version:</span>
              <span className="text-[#21F1A8] font-bold">{project.version}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Dataset Scope:</span>
              <span className="text-white">{project.rowCount.toLocaleString()} rows</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Data Source:</span>
              <span className="text-gray-300 truncate max-w-[180px]">{project.sourceFileName}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex justify-between">
              <span className="text-gray-500">Data Integrity Mode:</span>
              <span className="text-[#21F1A8] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#21F1A8]" />
                ENTERPRISE PRODUCTION MODEL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-6 space-y-4">
        <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#21F1A8]" />
          GOVERNED AUDIT TRAIL ({auditLogs.length} EVENTS)
        </h3>

        <div className="overflow-x-auto rounded-xl border border-[#2a2a2a] max-h-64">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#141414] text-gray-400 border-b border-[#2a2a2a]">
              <tr>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Action Event</th>
                <th className="p-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {auditLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-[#202020] text-gray-300">
                  <td className="p-2.5 text-gray-500">{log.timestamp}</td>
                  <td className="p-2.5 text-[#21F1A8] font-bold">{log.action}</td>
                  <td className="p-2.5 text-gray-300">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
