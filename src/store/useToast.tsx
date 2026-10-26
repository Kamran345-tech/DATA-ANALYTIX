import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'progress';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // in milliseconds. 0 = won't auto-dismiss (e.g. progress)
  progress?: number; // 0 to 100
  stage?: string; // Subtitle or step name
  action?: ToastAction;
  timestamp: number;
  persistent?: boolean;
}

export type ToastOptions = Partial<Omit<ToastItem, 'timestamp'>>;

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (item: Omit<ToastItem, 'id' | 'timestamp'> & { id?: string }) => string;
  updateToast: (id: string, updates: Partial<ToastItem>) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
  // Convenience helpers
  success: (title: string, message?: string, options?: ToastOptions) => string;
  error: (title: string, message?: string, options?: ToastOptions) => string;
  info: (title: string, message?: string, options?: ToastOptions) => string;
  warning: (title: string, message?: string, options?: ToastOptions) => string;
  progress: (id: string, percent: number, stage?: string, message?: string) => string;
  complete: (id: string, title: string, message?: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global event bus so toast can also be called directly outside React tree
type ToastListener = (toasts: ToastItem[]) => void;
let globalToasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notifyListeners() {
  listeners.forEach(fn => fn([...globalToasts]));
}

export const toast = {
  show: (options: Omit<ToastItem, 'id' | 'timestamp'> & { id?: string }): string => {
    const id = options.id || `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const existingIndex = globalToasts.findIndex(t => t.id === id);
    const newItem: ToastItem = {
      id,
      duration: options.type === 'progress' ? 0 : 5000,
      timestamp: Date.now(),
      ...options
    };

    if (existingIndex >= 0) {
      globalToasts[existingIndex] = { ...globalToasts[existingIndex], ...newItem };
    } else {
      globalToasts = [...globalToasts, newItem];
    }
    notifyListeners();
    return id;
  },

  success: (title: string, message?: string, options?: ToastOptions): string => {
    return toast.show({
      type: 'success',
      title,
      message,
      duration: 4500,
      ...options
    });
  },

  info: (title: string, message?: string, options?: ToastOptions): string => {
    return toast.show({
      type: 'info',
      title,
      message,
      duration: 5000,
      ...options
    });
  },

  warning: (title: string, message?: string, options?: ToastOptions): string => {
    return toast.show({
      type: 'warning',
      title,
      message,
      duration: 6000,
      ...options
    });
  },

  error: (title: string, message?: string, options?: ToastOptions): string => {
    return toast.show({
      type: 'error',
      title,
      message,
      duration: 7000,
      ...options
    });
  },

  progress: (id: string, percent: number, stage?: string, message?: string): string => {
    return toast.show({
      id,
      type: 'progress',
      title: stage || 'Processing Data Pipeline',
      message,
      stage,
      progress: Math.min(100, Math.max(0, percent)),
      duration: 0 // Keep open during active progress
    });
  },

  complete: (id: string, title: string, message?: string, action?: ToastAction): void => {
    const existing = globalToasts.find(t => t.id === id);
    if (!existing) return;

    toast.show({
      id,
      type: 'success',
      title,
      message: message || existing.message,
      progress: 100,
      stage: 'Completed Successfully',
      duration: 4500,
      action
    });
  },

  dismiss: (id: string): void => {
    globalToasts = globalToasts.filter(t => t.id !== id);
    notifyListeners();
  },

  clearAll: (): void => {
    globalToasts = [];
    notifyListeners();
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>(globalToasts);

  useEffect(() => {
    const handleUpdate = (updated: ToastItem[]) => {
      setToasts(updated);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const addToast = useCallback((item: Omit<ToastItem, 'id' | 'timestamp'> & { id?: string }) => {
    return toast.show(item);
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ToastItem>) => {
    const existing = globalToasts.find(t => t.id === id);
    if (existing) {
      toast.show({ ...existing, ...updates, id });
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  const clearAll = useCallback(() => {
    toast.clearAll();
  }, []);

  const success = useCallback((title: string, message?: string, options?: ToastOptions) => {
    return toast.success(title, message, options);
  }, []);

  const error = useCallback((title: string, message?: string, options?: ToastOptions) => {
    return toast.error(title, message, options);
  }, []);

  const info = useCallback((title: string, message?: string, options?: ToastOptions) => {
    return toast.info(title, message, options);
  }, []);

  const warning = useCallback((title: string, message?: string, options?: ToastOptions) => {
    return toast.warning(title, message, options);
  }, []);

  const progress = useCallback((id: string, percent: number, stage?: string, message?: string) => {
    return toast.progress(id, percent, stage, message);
  }, []);

  const complete = useCallback((id: string, title: string, message?: string, action?: ToastAction) => {
    toast.complete(id, title, message, action);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        updateToast,
        dismissToast,
        clearAll,
        success,
        error,
        info,
        warning,
        progress,
        complete
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback to static singleton if outside provider
    return {
      toasts: globalToasts,
      addToast: toast.show,
      updateToast: (id: string, updates: Partial<ToastItem>) => {
        const existing = globalToasts.find(t => t.id === id);
        if (existing) toast.show({ ...existing, ...updates, id });
      },
      dismissToast: toast.dismiss,
      clearAll: toast.clearAll,
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
      progress: toast.progress,
      complete: toast.complete
    };
  }
  return context;
}
