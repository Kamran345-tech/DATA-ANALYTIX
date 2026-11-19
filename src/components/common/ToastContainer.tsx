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
      data-testid="toast-notification"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
      aria-live="polite"
      className={`relative w-full max-w-[320px] sm:max-w-[340px] rounded-xl border backdrop-blur-xl py-2.5 px-3.5 shadow-xl transition-all duration-200 transform translate-y-0 opacity-100 overflow-hidden ${getBorderAndBg()}`}
    >
      <div className="flex items-start gap-2.5">
        {/* Type Icon */}
        <div className="mt-0.5">{getIcon()}</div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold tracking-tight truncate text-primary">
              {toast.title}
            </h4>
            {toast.stage && (
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md border shrink-0 bg-elevated border-subtle text-accent">
                {toast.stage}
              </span>
            )}
          </div>

          {toast.message && (
            <p className="text-[11px] mt-0.5 leading-snug text-secondary line-clamp-2">
              {toast.message}
            </p>
          )}

          {/* If progress toast: active animated bar with percentage */}
          {toast.type === 'progress' && typeof toast.progress === 'number' && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={isLight ? 'text-muted' : 'text-secondary'}>Ingestion Pipeline</span>
                <span className="font-bold text-accent">{Math.round(toast.progress)}%</span>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-input' : 'bg-elevated'}`}>
                <div 
                  className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
                  style={{ width: `${toast.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          {toast.action && (
            <div className="mt-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer bg-accent text-on-accent hover:opacity-90"
              >
                <span>{toast.action.label}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="p-1 rounded-lg transition-colors cursor-pointer shrink-0 text-secondary hover:text-primary hover:bg-elevated"
        >
          <X className="w-3.5 h-3.5" />
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
  const { toasts, dismissToast } = useToast();
  const { themeMode } = usePlatform();
  const isLight = themeMode === 'light';

  if (!toasts || toasts.length === 0) return null;
  // Max 1 visible toast at a time
  const visibleToasts = toasts.slice(-1);

  return (
    <aside 
      aria-label="Notifications"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 sm:bottom-5 sm:right-5 sm:left-auto sm:translate-x-0 z-[120] flex flex-col items-center sm:items-end gap-2 max-w-[320px] sm:max-w-[340px] w-full pointer-events-none px-3 sm:px-0"
    >
      <div className="flex flex-col-reverse gap-2 pointer-events-auto w-full">
        {visibleToasts.map((item) => (
          <ToastCard 
            key={`${item.id}-${item.timestamp}`} 
            toast={item} 
            onDismiss={dismissToast} 
            isLight={isLight} 
          />
        ))}
      </div>
    </aside>
  );
};
