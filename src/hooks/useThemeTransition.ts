import { useEffect, useRef, useState } from 'react';
import { ResolvedTheme } from '../utils/theme';

/**
 * Custom hook that encapsulates the timer and previous-theme tracking logic
 * for a smooth cross-fade transition whenever themeMode toggles between light and dark.
 */
export function useThemeTransition(themeMode: ResolvedTheme, durationMs = 280): boolean {
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const prevThemeRef = useRef<ResolvedTheme>(themeMode);

  useEffect(() => {
    if (prevThemeRef.current !== themeMode) {
      prevThemeRef.current = themeMode;
      setIsThemeTransitioning(true);
      const timer = window.setTimeout(() => {
        setIsThemeTransitioning(false);
      }, durationMs);
      return () => window.clearTimeout(timer);
    }
  }, [themeMode, durationMs]);

  return isThemeTransitioning;
}
