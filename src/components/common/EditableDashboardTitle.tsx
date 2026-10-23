import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Sparkles, RotateCcw } from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

interface EditableDashboardTitleProps {
  className?: string;
  inputClassName?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  showLabelPrefix?: boolean;
  showEditButton?: boolean;
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
  showEditButton = true
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
                ? 'bg-white text-slate-900 border-emerald-600 shadow-md shadow-emerald-500/10'
                : 'bg-[#121212] text-white border-[#21F1A8] shadow-xl shadow-[#21F1A8]/15'
            } ${inputClassName}`}
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
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
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-[#252525] text-gray-300 hover:text-white hover:bg-red-500/20 hover:text-red-400 border-border-subtle'
            }`}
            title="Cancel (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>

        {/* Quick suggestions & keyboard hint */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className={`font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
            Hint: Enter to save • Esc to cancel
          </span>
          <span className={isLight ? 'text-slate-300' : 'text-gray-600'}>|</span>
          <span className={`font-medium flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
            <Sparkles className="w-3 h-3 text-emerald-500" /> Quick ideas:
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
                  ? 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-300 hover:border-emerald-300'
                  : 'bg-[#222] hover:bg-[#2e2e2e] text-gray-300 hover:text-[#21F1A8] border-[#333]'
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
    <div className="inline-flex items-center gap-2.5 flex-wrap">
      <div 
        onClick={() => setIsEditing(true)}
        className={`group inline-flex items-center gap-2 cursor-pointer rounded-xl px-2.5 py-1 -mx-2 border transition-all select-none ${
          isLight
            ? 'hover:bg-slate-100/80 border-transparent hover:border-slate-300'
            : 'hover:bg-[#252525]/70 border-transparent hover:border-[#383838]'
        } ${className}`}
        title="Double-click or click to rename this dashboard"
      >
        {showLabelPrefix && (
          <span className={`text-xs font-mono uppercase tracking-wider ${
            isLight ? 'text-slate-500' : 'text-gray-400'
          }`}>
            Dashboard:
          </span>
        )}
        <span className={`font-heading font-extrabold transition-colors truncate ${
          isLight 
            ? 'text-slate-900 group-hover:text-emerald-700' 
            : 'text-white group-hover:text-[#21F1A8]'
        }`}>
          {project.name}
        </span>
      </div>

      {showEditButton && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shadow-2xs shrink-0 cursor-pointer border ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-emerald-700 border-slate-300'
              : 'bg-[#222222] hover:bg-[#2d2d2d] text-gray-300 hover:text-[#21F1A8] border-[#3a3a3a] hover:border-[#21F1A8]/50'
          }`}
          title="Rename this dashboard"
        >
          <Pencil className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-[#21F1A8]'}`} />
          <span className="text-[11px] font-semibold">Rename</span>
        </button>
      )}

      {isSavedRecently && (
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold animate-fadeIn flex items-center gap-1 border ${
          isLight
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-[#21F1A8]/20 border border-[#21F1A8]/40 text-[#21F1A8]'
        }`}>
          <Check className="w-3 h-3 stroke-[3]" /> Dashboard name saved
        </span>
      )}
    </div>
  );
};
