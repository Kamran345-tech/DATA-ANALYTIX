import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  UploadCloud, 
  ShieldAlert, 
  Wand2, 
  Network, 
  TrendingUp, 
  Database, 
  Cpu, 
  Code2, 
  SlidersHorizontal, 
  Sparkles, 
  FileSpreadsheet, 
  FolderDown, 
  Settings, 
  X,
  FileText
} from 'lucide-react';
import { usePlatform, NavigationTab } from '../../store/usePlatformStore';

interface CommandItem {
  id: NavigationTab;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

const COMMAND_ITEMS: CommandItem[] = [
  { id: 'executive_dashboard', title: 'Executive Dashboard', category: 'Build', icon: LayoutDashboard, keywords: ['kpi', 'revenue', 'overview', 'metrics'] },
  { id: 'upload', title: 'Upload & Data Ingestion', category: 'Data', icon: UploadCloud, keywords: ['import', 'csv', 'excel', 'file'] },
  { id: 'quality', title: 'Quality Auditor', category: 'Prepare', icon: ShieldAlert, keywords: ['hygiene', 'health', 'nulls', 'issues'] },
  { id: 'cleaning', title: 'Cleaning Lab', category: 'Prepare', icon: Wand2, keywords: ['clean', 'outliers', 'whitespace', 'transform'] },
  { id: 'modeling', title: 'Star Schema & ERD', category: 'Prepare', icon: Network, keywords: ['schema', 'fact', 'dimensions', 'erd'] },
  { id: 'sql_lab', title: 'SQL Workbench', category: 'Analyze', icon: Database, keywords: ['query', 'select', 'join', 'alasql'] },
  { id: 'dax_lab', title: 'DAX Measure Studio', category: 'Analyze', icon: Cpu, keywords: ['powerbi', 'measures', 'dax', 'yoy'] },
  { id: 'python_lab', title: 'Python Sandbox', category: 'Analyze', icon: Code2, keywords: ['pandas', 'numpy', 'pyodide', 'code'] },
  { id: 'ai_insights', title: 'Ask Data AI', category: 'Analyze', icon: Sparkles, keywords: ['chat', 'questions', 'copilot', 'analysis'] },
  { id: 'dashboard_builder', title: 'Dashboard Builder', category: 'Build', icon: SlidersHorizontal, keywords: ['widgets', 'charts', 'customize'] },
  { id: 'reports', title: 'Executive Reports', category: 'Build', icon: FileText, keywords: ['pdf', 'deck', 'presentation'] },
  { id: 'export_center', title: 'Export Center', category: 'Export', icon: FolderDown, keywords: ['pbip', 'power bi', 'download', 'archive'] },
  { id: 'settings', title: 'Settings & Appearance', category: 'Admin', icon: Settings, keywords: ['theme', 'branding', 'flags', 'mode'] },
];

export interface ModernCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModernCommandPalette: React.FC<ModernCommandPaletteProps> = ({ isOpen, onClose }) => {
  const { setCurrentTab } = usePlatform();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return COMMAND_ITEMS;
    const q = query.toLowerCase();
    return COMMAND_ITEMS.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    );
  }, [query]);

  // Focus input and lock scroll
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Global keydown handler for Escape, Arrow navigation, and Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          setCurrentTab(selected.id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, setCurrentTab, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-xs modern-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[var(--modern-bg-surface)] border border-[var(--modern-border)] rounded-2xl shadow-2xl overflow-hidden modern-slide-up flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--modern-border)] gap-3 bg-[var(--modern-bg-surface-2)]">
          <Search className="w-4 h-4 text-[var(--modern-primary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a module name or keyword (e.g. SQL, Quality, Export)..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            aria-label="Search modules and commands"
            className="w-full bg-transparent text-sm text-[var(--modern-text)] placeholder-[var(--modern-text-muted)] focus:outline-hidden"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-[var(--modern-text-muted)] hover:text-[var(--modern-text)]"
              aria-label="Clear query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[var(--modern-border)]/50">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--modern-text-muted)]">
              No analytical module matching "<span className="text-[var(--modern-text)] font-semibold">{query}</span>"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left transition-colors ${
                    isSelected 
                      ? 'bg-[var(--modern-primary-muted)] text-[var(--modern-primary)] font-semibold' 
                      : 'text-[var(--modern-text)] hover:bg-[var(--modern-bg-surface-2)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[var(--modern-primary)] text-white' : 'bg-[var(--modern-bg-surface-2)] text-[var(--modern-text-muted)]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-medium truncate">{item.title}</div>
                      <div className="text-[10px] text-[var(--modern-text-muted)] font-normal">{item.category}</div>
                    </div>
                  </div>
                  <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--modern-bg-surface-2)] text-[var(--modern-text-muted)]">
                    Jump ↵
                  </kbd>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[var(--modern-bg-surface-2)] border-t border-[var(--modern-border)] text-[10px] text-[var(--modern-text-muted)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to close</span>
          </div>
          <span>{filteredItems.length} modules</span>
        </div>
      </div>
    </div>
  );
};
