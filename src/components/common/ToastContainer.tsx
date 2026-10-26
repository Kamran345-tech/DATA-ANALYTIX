import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Loader2, 
  X, 
  ArrowRight,
  Database,
  Trash2
} from 'lucide-react';
import { useToast, ToastItem } from '../../store/useToast';
import { usePlatform } from '../../store/usePlatformStore';

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  isLight: boolean;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss, isLight }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progressWidth, setProgressWidth] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.duration || 5000);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If progress type or persistent (duration === 0), don't auto-dismiss
    if (!toast.duration || toast.duration === 0) return;

    const totalDuration = toast.duration;
    let animationFrameId: number;
    let startTimestamp = performance.now();

    const updateTimer = (currentTimestamp: number) => {
      if (!isHovered) {
        const elapsed = currentTimestamp - startTimestamp;
        const remaining = Math.max(0, totalDuration - elapsed);
        const percent = (remaining / totalDuration) * 100;
        setProgressWidth(percent);

        if (remaining <= 0) {
          onDismiss(toast.id);
          return;
        }
      } else {
        // Shift startTimestamp forward so timer freezes during hover
        startTimestamp = performance.now() - (totalDuration * (100 - progressWidth)) / 100;
      }
      animationFrameId = requestAnimationFrame(updateTimer);
    };

    animationFrameId = requestAnimationFrame(updateTimer);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [toast.id, toast.duration, isHovered, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#21F1A8] shrink-0" />;
      case 'progress':
        return <Loader2 className="w-5 h-5 text-[#00D2FF] animate-spin shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-sky-400 shrink-0" />;
    }
  };

  const getBorderAndBg = () => {
    if (isLight) {
      switch (toast.type) {
        case 'success':
          return 'bg-white border-emerald-300 shadow-emerald-500/10 text-slate-900';
        case 'progress':
          return 'bg-white border-cyan-300 shadow-cyan-500/10 text-slate-900';
        case 'warning':
          return 'bg-white border-amber-300 shadow-amber-500/10 text-slate-900';
        case 'error':
          return 'bg-white border-rose-300 shadow-rose-500/10 text-slate-900';
        default:
          return 'bg-white border-slate-300 shadow-slate-500/10 text-slate-900';
      }
    } else {
      switch (toast.type) {
        case 'success':
          return 'bg-[#0f1b29]/95 border-[#21F1A8]/40 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6),0_0_20px_rgba(33,241,168,0.15)] text-slate-100';
        case 'progress':
          return 'bg-[#0f1b29]/95 border-[#00D2FF]/40 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6),0_0_20px_rgba(0,210,255,0.15)] text-slate-100';
        case 'warning':
          return 'bg-[#1b1710]/95 border-amber-500/40 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6),0_0_20px_rgba(245,158,11,0.12)] text-slate-100';
        case 'error':
          return 'bg-[#1c1214]/95 border-rose-500/40 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6),0_0_20px_rgba(244,63,94,0.15)] text-slate-100';
        default:
          return 'bg-[#101826]/95 border-slate-700/60 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] text-slate-100';
      }
    }
  };

  const getProgressColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-[#21F1A8]';
      case 'progress':
        return 'bg-gradient-to-r from-[#21F1A8] to-[#00D2FF]';
      case 'warning':
        return 'bg-amber-400';
      case 'error':
        return 'bg-rose-500';
      default:
        return 'bg-sky-400';
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
      aria-live="polite"
      className={`relative w-full max-w-sm sm:max-w-md rounded-2xl border backdrop-blur-xl p-4 shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100 overflow-hidden ${getBorderAndBg()}`}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className="mt-0.5">{getIcon()}</div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold tracking-tight truncate text-white">
              {toast.title}
            </h4>
            {toast.stage && (
              <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                isLight 
                  ? 'bg-slate-100 border-slate-200 text-slate-600' 
                  : 'bg-[#16253c] border-[#253d62] text-[#21F1A8]'
              }`}>
                {toast.stage}
              </span>
            )}
          </div>

          {toast.message && (
            <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              {toast.message}
            </p>
          )}

          {/* If progress toast: active animated bar with percentage */}
          {toast.type === 'progress' && typeof toast.progress === 'number' && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Ingestion Pipeline</span>
                <span className="font-bold text-[#00D2FF]">{Math.round(toast.progress)}%</span>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#21F1A8] via-[#00D2FF] to-[#3B82F6] transition-all duration-300 ease-out"
                  style={{ width: `${toast.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          {toast.action && (
            <div className="mt-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  toast.action.variant === 'secondary'
                    ? isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      : 'bg-[#1b2a40] hover:bg-[#243958] text-slate-200 border border-[#2b4468]'
                    : 'bg-[#21F1A8] hover:bg-[#1cdb97] text-slate-950 shadow-[0_0_12px_rgba(33,241,168,0.3)]'
                }`}
              >
                <span>{toast.action.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
            isLight 
              ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-dismiss countdown bar at the bottom */}
      {toast.duration && toast.duration > 0 && (
        <div 
          className={`absolute bottom-0 left-0 h-[2px] opacity-75 ${getProgressColor()}`}
          style={{ width: `${progressWidth}%` }}
        />
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast, clearAll } = useToast();
  const { themeMode } = usePlatform();
  const isLight = themeMode === 'light';

  if (!toasts || toasts.length === 0) return null;

  return (
    <aside 
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[120] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none p-2 sm:p-0"
    >
      {/* Clear all pill when multiple notifications exist */}
      {toasts.length > 2 && (
        <div className="flex justify-end pointer-events-auto">
          <button
            type="button"
            onClick={clearAll}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border shadow-md transition-all cursor-pointer ${
              isLight
                ? 'bg-white/90 text-slate-600 border-slate-200 hover:bg-slate-100'
                : 'bg-[#0f1726]/90 text-slate-400 border-slate-700/60 hover:text-white hover:bg-[#16233a]'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear All ({toasts.length})</span>
          </button>
        </div>
      )}

      {/* List of active toasts */}
      <div className="flex flex-col-reverse gap-2.5 pointer-events-auto">
        {toasts.map((item) => (
          <ToastCard 
            key={item.id} 
            toast={item} 
            onDismiss={dismissToast} 
            isLight={isLight} 
          />
        ))}
      </div>
    </aside>
  );
};
