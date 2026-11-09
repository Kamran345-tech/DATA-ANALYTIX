import React from 'react';
import { 
  UploadCloud, 
  Sun, 
  Moon, 
  Command, 
  User, 
  Sparkles,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';
import { BRAND, getBrandText, loadFeatureFlags } from '../../config/features';

export interface ModernNavbarProps {
  onOpenCommandPalette?: () => void;
  onOpenWelcome?: () => void;
}

export const ModernNavbar: React.FC<ModernNavbarProps> = ({
  onOpenCommandPalette,
  onOpenWelcome
}) => {
  const { 
    currentTab, 
    setCurrentTab, 
    themeMode, 
    toggleThemeMode, 
    uiMode, 
    setUiMode,
    project,
    cleanRows,
    columns 
  } = usePlatform();

  const { currentUser, isGuestMode, setIsAuthModalOpen, logout } = useFirebaseAuth();
  const flags = loadFeatureFlags();
  const brandName = getBrandText('primary', flags);

  const rowCount = cleanRows?.length || project?.rowCount || 0;
  const colCount = columns?.length || project?.columnCount || 0;

  return (
    <header 
      role="banner"
      aria-label="Application Top Bar"
      className="h-14 border-b border-[var(--modern-border)] bg-[var(--modern-bg-surface)] px-4 sm:px-6 flex items-center justify-between gap-4 select-none shrink-0 z-30"
    >
      {/* Zone 1: Brand & Dataset Context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setCurrentTab('executive_dashboard')}
          aria-label="Go to Executive Dashboard"
          className="flex items-center gap-2.5 text-left focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs shrink-0">
            DA
          </div>
          <div className="truncate">
            <span className="font-extrabold text-sm tracking-tight text-[var(--modern-text)]">
              {brandName}
            </span>
          </div>
        </button>

        {/* Dataset metadata badge: unboxed text with subtle separator */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[var(--modern-border)] text-xs text-[var(--modern-text-muted)] font-mono">
          <span className="font-medium text-[var(--modern-text)] truncate max-w-[200px]" title={project.name}>
            {project.sourceFileName || project.name}
          </span>
          <span aria-hidden="true" className="text-[var(--modern-text-subtle)]">·</span>
          <span>{rowCount.toLocaleString()} rows</span>
          <span aria-hidden="true" className="text-[var(--modern-text-subtle)]">·</span>
          <span>{colCount} cols</span>
        </div>
      </div>

      {/* Zone 2: Search & Command Palette Trigger (Desktop) */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-md">
        <button
          onClick={onOpenCommandPalette}
          aria-label="Open Command Palette (Ctrl+K)"
          className="w-full max-w-sm px-3.5 py-1.5 rounded-lg border border-[var(--modern-border)] bg-[var(--modern-bg-surface-2)] text-xs text-[var(--modern-text-muted)] flex items-center justify-between hover:border-[var(--modern-primary)] transition-colors group cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-[var(--modern-primary)]" />
            <span>Search modules, commands, or data...</span>
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--modern-border)] text-[var(--modern-text-muted)] font-semibold">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Quick Welcome Screen Launcher */}
        <button
          onClick={onOpenWelcome}
          title="Open Welcome Overview & Guided Flow"
          aria-label="Open Welcome Overview"
          className="p-2 rounded-lg text-[var(--modern-text-muted)] hover:text-[var(--modern-text)] hover:bg-[var(--modern-bg-surface-2)] transition-colors hidden sm:flex items-center gap-1.5 text-xs font-medium"
        >
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="hidden xl:inline">Overview</span>
        </button>

        {/* Theme Toggle (Dark/Light) */}
        <button
          onClick={toggleThemeMode}
          title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2 rounded-lg text-[var(--modern-text-muted)] hover:text-[var(--modern-text)] hover:bg-[var(--modern-bg-surface-2)] transition-colors"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-sky-500" />
          )}
        </button>

        {/* Classic / Modern Switcher Toggle */}
        <button
          onClick={() => setUiMode(uiMode === 'modern' ? 'classic' : 'modern')}
          title="Toggle between Modern and Classic layout"
          aria-label="Toggle Modern layout"
          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--modern-border)] bg-[var(--modern-bg-surface-2)] text-[var(--modern-text)] hover:border-[var(--modern-primary)] transition-all flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--modern-primary)]" />
          <span>Modern</span>
        </button>

        {/* Primary Action Button */}
        <button
          onClick={() => setCurrentTab('upload')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--modern-primary)] hover:bg-[var(--modern-primary-hover)] text-[var(--text-on-accent)] shadow-xs transition-colors flex items-center gap-1.5"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload Data</span>
        </button>

        {/* User Account / Auth Trigger */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          title={currentUser ? currentUser.email || 'Account' : isGuestMode ? 'Guest Mode (Click to Sign In)' : 'Sign In'}
          aria-label="Account Settings"
          className="p-1.5 rounded-lg border border-[var(--modern-border)] hover:border-[var(--modern-primary)] text-[var(--modern-text-muted)] hover:text-[var(--modern-text)] transition-colors flex items-center gap-1.5 text-xs"
        >
          <User className="w-4 h-4 text-[var(--modern-primary)]" />
          {currentUser && (
            <span className="hidden md:inline font-mono max-w-[100px] truncate text-[var(--modern-text)]">
              {currentUser.email?.split('@')[0]}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
