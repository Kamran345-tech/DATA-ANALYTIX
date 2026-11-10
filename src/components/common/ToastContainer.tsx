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
        return <CheckCircle2 className="w-5 h-5 text-success shrink-0" />;
      case 'progress':
        return <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-danger shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-info shrink-0" />;
    }
  };

  const getBorderAndBg = () => {
    return 'bg-card border-subtle shadow-card text-primary';
  };

  const getProgressColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-[var(--success)]';
      case 'progress':
        return 'bg-[var(--accent)]';
      case 'warning':
        return 'bg-[var(--warning)]';
      case 'error':
        return 'bg-[var(--danger)]';
      default:
        return 'bg-[var(--info)]';
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
            <h4 className="text-sm font-bold tracking-tight truncate text-primary">
              {toast.title}
            </h4>
            {toast.stage && (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border shrink-0 bg-elevated border-subtle text-accent">
                {toast.stage}
              </span>
            )}
          </div>

          {toast.message && (
            <p className="text-xs mt-1 leading-relaxed text-secondary">
              {toast.message}
            </p>
          )}

          {/* If progress toast: active animated bar with percentage */}
          {toast.type === 'progress' && typeof toast.progress === 'number' && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className={isLight ? 'text-muted' : 'text-secondary'}>Ingestion Pipeline</span>
                <span className="font-bold text-accent">{Math.round(toast.progress)}%</span>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-input' : 'bg-elevated'}`}>
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-teal-500/20 via-indigo-500/10 to-transparent transition-all duration-300 ease-out"
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
                      ? 'bg-elevated hover:bg-input text-primary border border-slate-200'
                      : 'bg-accent hover:bg-accent text-primary border border-teal-500/40'
                    : 'bg-accent hover:bg-accent text-primary shadow-lg'
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
              ? 'text-secondary hover:text-primary hover:bg-elevated' 
              : 'text-secondary hover:text-primary hover:bg-elevated'
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
                ? 'bg-white/90 text-muted border-slate-200 hover:bg-elevated'
                : 'bg-accent text-secondary border-slate-700/60 hover:text-primary hover:bg-accent'
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
