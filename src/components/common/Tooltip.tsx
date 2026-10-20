import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { usePlatform } from '../../store/usePlatformStore';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  title?: string;
  tag?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  title,
  tag,
  side = 'right',
  className = '',
  delay = 180
}) => {
  const { themeMode } = usePlatform();
  const isLight = themeMode === 'light';

  const [isVisible, setIsVisible] = useState(false);
  const [effectiveSide, setEffectiveSide] = useState<'top' | 'right' | 'bottom' | 'left'>(side);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let computedSide = side;

    // Viewport edge collision detection
    if (side === 'right' && rect.right + 280 > vw) {
      computedSide = rect.left > 280 ? 'left' : 'bottom';
    } else if (side === 'left' && rect.left - 280 < 0) {
      computedSide = rect.right + 280 < vw ? 'right' : 'bottom';
    } else if (side === 'top' && rect.top - 120 < 0) {
      computedSide = 'bottom';
    } else if (side === 'bottom' && rect.bottom + 120 > vh) {
      computedSide = 'top';
    }

    let top = rect.top;
    let left = rect.left;

    if (computedSide === 'right') {
      top = rect.top + rect.height / 2;
      left = rect.right + 10;
    } else if (computedSide === 'left') {
      top = rect.top + rect.height / 2;
      left = rect.left - 10;
    } else if (computedSide === 'top') {
      top = rect.top - 10;
      left = rect.left + rect.width / 2;
    } else {
      top = rect.bottom + 10;
      left = rect.left + rect.width / 2;
    }

    // Keep tooltip horizontally bounded within screen on small devices
    if (computedSide === 'top' || computedSide === 'bottom') {
      const halfWidth = 140; // Approx half of tooltip width (w-72 is 288px)
      if (left - halfWidth < 12) {
        left = 12 + halfWidth;
      } else if (left + halfWidth > vw - 12) {
        left = vw - 12 - halfWidth;
      }
    }

    setEffectiveSide(computedSide);
    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-block w-full ${className}`}
    >
      {children}

      {isVisible && (
        <div
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform:
              effectiveSide === 'right'
                ? 'translateY(-50%)'
                : effectiveSide === 'left'
                ? 'translate(-100%, -50%)'
                : effectiveSide === 'top'
                ? 'translate(-50%, -100%)'
                : 'translateX(-50%)',
            zIndex: 9999
          }}
          className="pointer-events-none w-72 max-w-[calc(100vw-24px)] animate-in fade-in zoom-in-95 duration-150"
        >
          <div
            className={`rounded-xl p-3 text-xs backdrop-blur-md transition-colors ${
              isLight
                ? 'bg-white/95 text-slate-800 border border-slate-200 shadow-xl shadow-slate-900/10'
                : 'bg-[#111827]/95 text-gray-200 border border-[#00F5A0]/40 shadow-2xl shadow-black/60'
            }`}
          >
            {/* Header */}
            {(title || tag) && (
              <div
                className={`flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b ${
                  isLight ? 'border-slate-100' : 'border-gray-700/60'
                }`}
              >
                {title && (
                  <span
                    className={`font-bold tracking-wide text-[11px] truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {title}
                  </span>
                )}
                {tag && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase shrink-0 ${
                      isLight
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/30'
                    }`}
                  >
                    {tag}
                  </span>
                )}
              </div>
            )}

            {/* Body */}
            <div
              className={`text-[11px] leading-relaxed ${
                isLight ? 'text-slate-600' : 'text-gray-300'
              }`}
            >
              {content}
            </div>

            {/* Pointer arrow indicator */}
            <div
              className={`absolute w-2 h-2 ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-[#111827] border-[#00F5A0]/40'
              } ${
                effectiveSide === 'right'
                  ? 'left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 rotate-45 border-l border-b'
                  : effectiveSide === 'left'
                  ? 'right-0 translate-x-1/2 top-1/2 -translate-y-1/2 rotate-45 border-r border-t'
                  : effectiveSide === 'top'
                  ? 'bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 rotate-45 border-r border-b'
                  : 'top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 rotate-45 border-l border-t'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
