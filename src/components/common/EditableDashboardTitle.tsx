import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Sparkles, RotateCcw } from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

interface EditableDashboardTitleProps {
  className?: string;
  inputClassName?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  showLabelPrefix?: boolean;
  showEditButton?: boolean;
  singleLine?: boolean;
}

const PRESET_SUGGESTIONS = [
  'Executive Intelligence Hub',
  'Revenue & Profit Performance',
  'Operations & Margin Analytics',
  'Commercial Growth Dashboard'
];

export const EditableDashboardTitle: React.FC<EditableDashboardTitleProps> = ({
  className = '',
  inputClassName = '',
  iconSize = 'md',
  showLabelPrefix = false,
  showEditButton = true,
  singleLine = false
}) => {
  const { project, updateProjectMetadata, themeMode } = usePlatform();
  const isLight = themeMode === 'light';
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(project.name);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(project.name);
  }, [project.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = tempName.trim();
    if (trimmed && trimmed !== project.name) {
      updateProjectMetadata({ name: trimmed });
      setIsSavedRecently(true);
      setTimeout(() => setIsSavedRecently(false), 2500);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempName(project.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handlePickPreset = (preset: string) => {
    setTempName(preset);
    updateProjectMetadata({ name: preset });
    setIsSavedRecently(true);
    setIsEditing(false);
    setTimeout(() => setIsSavedRecently(false), 2500);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 z-20 py-1 max-w-xl animate-fadeIn">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={inputRef}
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type custom dashboard name..."
            className={`px-3.5 py-1.5 rounded-xl border-2 focus:outline-none text-sm sm:text-lg font-bold min-w-[260px] sm:min-w-[340px] transition-all ${
              isLight
                ? 'bg-white text-primary border-sky-600 shadow-md shadow-sky-500/10'
                : 'bg-app text-primary border-cyan-400 shadow-xl shadow-cyan-400/15'
            } ${inputClassName}`}
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-primary font-semibold text-xs transition-all shadow-md cursor-pointer"
            title="Save dashboard name (Enter)"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Save</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCancel();
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer border ${
              isLight
                ? 'bg-elevated hover:bg-input text-muted border-slate-300'
                : 'bg-elevated text-secondary hover:text-primary hover:bg-red-500/20 hover:text-red-400 border-border-subtle'
            }`}
            title="Cancel (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>

        {/* Quick suggestions & keyboard hint */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className={`font-mono text-[10px] ${isLight ? 'text-muted' : 'text-muted'}`}>
            Hint: Enter to save • Esc to cancel
          </span>
          <span className={isLight ? 'text-secondary' : 'text-muted'}>|</span>
          <span className={`font-medium flex items-center gap-1 ${isLight ? 'text-muted' : 'text-secondary'}`}>
            <Sparkles className="w-3 h-3 text-sky-500" /> Quick ideas:
          </span>
          {PRESET_SUGGESTIONS.map((preset) => (
            <button
              key={preset}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handlePickPreset(preset);
              }}
              className={`px-2 py-0.5 rounded-md transition-colors text-[10px] border cursor-pointer ${
                isLight
                  ? 'bg-elevated hover:bg-sky-50 text-muted hover:text-sky-700 border-slate-300 hover:border-sky-300'
                  : 'bg-elevated hover:bg-elevated text-secondary hover:text-cyan-400 border-subtle'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 flex-wrap min-w-0 max-w-full">
      <div 
        onClick={() => setIsEditing(true)}
        className={`group inline-flex items-center gap-2 cursor-pointer rounded-xl px-1.5 py-0.5 border transition-colors select-none min-w-0 max-w-full ${
          isLight
            ? 'hover:bg-elevated border-transparent hover:border-slate-300'
            : 'hover:bg-elevated border-transparent hover:border-subtle'
        } ${className}`}
        title={project.name}
        aria-label={project.name}
      >
        {showLabelPrefix && (
          <span className={`text-xs font-mono uppercase tracking-wider shrink-0 ${
            isLight ? 'text-muted' : 'text-secondary'
          }`}>
            Dashboard:
          </span>
        )}
        <span
          title={project.name}
          aria-label={project.name}
          className={`font-heading font-extrabold transition-colors min-w-0 max-w-full ${
            singleLine ? 'truncate' : 'line-clamp-2 [overflow-wrap:anywhere]'
          } ${
            isLight 
              ? 'text-primary group-hover:text-sky-700' 
              : 'text-primary group-hover:text-cyan-400'
          }`}
        >
          {project.name}
        </span>
      </div>

      {showEditButton && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shadow-2xs shrink-0 cursor-pointer border whitespace-nowrap ${
            isLight
              ? 'bg-elevated hover:bg-sky-50 text-muted hover:text-sky-700 border-slate-300 hover:border-sky-300'
              : 'bg-elevated hover:bg-elevated text-secondary hover:text-cyan-400 border-teal-500/40 hover:border-cyan-400/50'
          }`}
          title="Rename this dashboard"
        >
          <Pencil className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
          <span className="text-[11px] font-semibold">Rename</span>
        </button>
      )}

      {isSavedRecently && (
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold animate-fadeIn flex items-center gap-1 border ${
          isLight
            ? 'bg-sky-50 text-sky-800 border-sky-200'
            : 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300'
        }`}>
          <Check className="w-3 h-3 stroke-[3]" /> Dashboard name saved
        </span>
      )}
    </div>
  );
};
