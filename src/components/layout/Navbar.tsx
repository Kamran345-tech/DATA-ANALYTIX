import React from 'react';
import { 
  BarChart3, 
  UploadCloud, 
  Search, 
  Maximize2, 
  Minimize2, 
  Menu, 
  ShieldCheck, 
  DownloadCloud, 
  Sparkles,
  AlertTriangle,
  FolderGit2
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

export const Navbar: React.FC = () => {
  const { 
    project, 
    qualityReport, 
    setCurrentTab, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    isPresentationMode, 
    setIsPresentationMode,
    filters,
    setFilters
  } = usePlatform();

  return (
    <header className="sticky top-0 z-40 bg-[#171717]/95 backdrop-blur border-b border-[#2d2d2d] px-4 py-2.5 flex items-center justify-between">
      {/* Left branding & drawer trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-[#21F1A8] hover:bg-[#222] transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div 
          onClick={() => setCurrentTab('executive_dashboard')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#21F1A8]/10 border border-[#21F1A8]/40 flex items-center justify-center group-hover:glow-neon transition-all shrink-0">
            <BarChart3 className="w-5 h-5 text-[#21F1A8]" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold tracking-wider text-white flex items-center gap-1">
              NEXUS<span className="text-[#21F1A8]">BI</span>
            </span>
          </div>
        </div>

        {/* Project Title & Active Badge */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-[#2e2e2e]">
          <span className="text-xs font-medium text-gray-300 truncate max-w-[180px] lg:max-w-xs">{project.name}</span>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-[#21F1A8]/15 text-[#21F1A8] border border-[#21F1A8]/30 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#21F1A8]" />
            Enterprise Model
          </span>
          <span className="text-xs text-gray-500 font-mono">{project.version}</span>
        </div>
      </div>

      {/* Center Search */}
      <div className="hidden lg:flex items-center relative w-72">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Global filter or search data..."
          value={filters.searchQuery}
          onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
          className="w-full bg-[#1f1f1f] text-xs text-gray-200 pl-9 pr-3 py-1.5 rounded-lg border border-[#333] focus:outline-none focus:border-[#21F1A8] transition-colors"
        />
        {filters.searchQuery && (
          <button 
            onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
            className="absolute right-2 text-xs text-gray-500 hover:text-gray-300"
          >
            ×
          </button>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Quality Score Indicator */}
        <button
          onClick={() => setCurrentTab('quality')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1f1f1f] border border-[#333] hover:border-[#21F1A8]/50 transition-colors text-xs"
          title="Data Quality Audit"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#21F1A8]" />
          <span className="text-gray-400">Quality:</span>
          <span className="font-semibold text-white">{qualityReport.overallScore}%</span>
        </button>

        {/* Presentation Mode Toggle */}
        <button
          onClick={() => setIsPresentationMode(!isPresentationMode)}
          className={`p-2 rounded-lg border transition-colors ${isPresentationMode ? 'bg-[#21F1A8]/20 text-[#21F1A8] border-[#21F1A8]' : 'text-gray-400 border-[#333] hover:bg-[#222]'}`}
          title={isPresentationMode ? 'Exit Presentation Mode' : 'Enter Presentation Mode'}
        >
          {isPresentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Quick Upload CTA */}
        <button
          onClick={() => setCurrentTab('upload')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] hover:glow-neon transition-all"
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Data</span>
        </button>

        {/* Export Center CTA */}
        <button
          onClick={() => setCurrentTab('export_center')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1f1f1f] border border-[#333] hover:border-[#21F1A8] text-gray-200 text-xs transition-colors"
          title="Export Packages & Power BI ZIP"
        >
          <DownloadCloud className="w-4 h-4 text-[#21F1A8]" />
          <span className="hidden md:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
