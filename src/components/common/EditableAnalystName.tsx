import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, User } from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

interface EditableAnalystNameProps {
  className?: string;
}

export const EditableAnalystName: React.FC<EditableAnalystNameProps> = ({ className = '' }) => {
  const { brand, setBrand, project, updateProjectMetadata, themeMode } = usePlatform();
  const isLight = themeMode === 'light';
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(brand.author || 'Lead Data Analyst');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(brand.author || 'Lead Data Analyst');
  }, [brand.author]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      setBrand({ ...brand, author: trimmed });
      updateProjectMetadata({ author: trimmed });
      if (typeof window !== 'undefined') {
        localStorage.setItem('acuitybi_analyst_name', trimmed);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTempName(brand.author || 'Lead Data Analyst');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1.5 animate-fadeIn">
        <input
          ref={inputRef}
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter analyst name..."
          className={`px-2 py-0.5 text-xs font-semibold rounded-md border focus:outline-none transition-all ${
            isLight
              ? 'bg-white text-slate-900 border-emerald-600 shadow-xs'
              : 'bg-[#181818] text-white border-emerald-500 shadow-xs'
          }`}
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
          title="Save Name (Enter)"
        >
          <Check className="w-3 h-3 stroke-[3]" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsEditing(false);
          }}
          className={`p-1 rounded transition-colors cursor-pointer border ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
              : 'bg-[#252525] hover:bg-[#303030] text-gray-300 border-border-subtle'
          }`}
          title="Cancel (Esc)"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return (
    <span 
      onClick={() => setIsEditing(true)}
      className={`group inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-md border transition-all ${
        isLight
          ? 'hover:bg-slate-100 hover:border-slate-300 border-transparent text-slate-800'
          : 'hover:bg-[#252525] hover:border-[#383838] border-transparent text-on-surface'
      } ${className}`}
      title="Click to change who prepared this report"
    >
      <User className={`w-3 h-3 ${isLight ? 'text-slate-400 group-hover:text-emerald-700' : 'text-gray-500 group-hover:text-emerald-400'}`} />
      <strong className="font-semibold underline decoration-dotted decoration-slate-400/60 underline-offset-2">
        {brand.author || 'Lead Data Analyst'}
      </strong>
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-emerald-600 dark:text-emerald-400 transition-opacity" />
    </span>
  );
};
