import React, { useState, useRef, useEffect, ReactNode } from 'react';

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
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = rect.top + scrollY;
    let left = rect.left + scrollX;

    if (side === 'right') {
      top = rect.top + rect.height / 2;
      left = rect.right + 10;
    } else if (side === 'left') {
      top = rect.top + rect.height / 2;
      left = rect.left - 10;
    } else if (side === 'top') {
      top = rect.top - 10;
      left = rect.left + rect.width / 2;
    } else {
      top = rect.bottom + 10;
      left = rect.left + rect.width / 2;
    }

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
              side === 'right'
                ? 'translateY(-50%)'
                : side === 'left'
                ? 'translate(-100%, -50%)'
                : side === 'top'
                ? 'translate(-50%, -100%)'
                : 'translateX(-50%)',
            zIndex: 9999
          }}
          className="pointer-events-none w-72 max-w-xs animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="bg-[#111827] text-gray-200 border border-[#00F5A0]/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs">
            {/* Header */}
            {(title || tag) && (
              <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-gray-700/60">
                {title && <span className="font-bold text-white tracking-wide text-[11px] truncate">{title}</span>}
                {tag && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/30 shrink-0">
                    {tag}
                  </span>
                )}
              </div>
            )}

            {/* Body */}
            <div className="text-[11px] leading-relaxed text-gray-300">
              {content}
            </div>

            {/* Micro pointer arrow indicator */}
            <div
              className={`absolute w-2 h-2 bg-[#111827] border-[#00F5A0]/40 ${
                side === 'right'
                  ? 'left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 rotate-45 border-l border-b'
                  : side === 'left'
                  ? 'right-0 translate-x-1/2 top-1/2 -translate-y-1/2 rotate-45 border-r border-t'
                  : side === 'top'
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
