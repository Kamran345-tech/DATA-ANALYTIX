import { FeatureFlags, loadFeatureFlags } from '../config/features';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export const STORAGE_KEY_THEME = 'acuitybi_theme';
export const STORAGE_KEY_THEME_PREF = 'dataanalytix_theme_pref';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'dark';
  }
  const pref = window.localStorage.getItem(STORAGE_KEY_THEME_PREF);
  if (pref === 'light' || pref === 'dark' || pref === 'system') {
    return pref;
  }
  const legacy = window.localStorage.getItem(STORAGE_KEY_THEME);
  if (legacy === 'light' || legacy === 'dark') {
    return legacy;
  }
  return 'dark';
}

export function resolveTheme(pref: ThemePreference = getStoredThemePreference()): ResolvedTheme {
  if (pref === 'system') {
    return getSystemTheme();
  }
  return pref === 'light' ? 'light' : 'dark';
}

/**
 * Single source of truth for applying theme classes, color-scheme, and feature attributes to the DOM.
 */
export function applyDocumentTheme(
  modeOrPref: ThemePreference | ResolvedTheme,
  flags: FeatureFlags = loadFeatureFlags()
): ResolvedTheme {
  const resolved = modeOrPref === 'system' ? getSystemTheme() : modeOrPref;

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY_THEME, resolved);
    window.localStorage.setItem(STORAGE_KEY_THEME_PREF, modeOrPref);
  }

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const body = document.body;
    const isLight = resolved === 'light';

    root.style.colorScheme = isLight ? 'light' : 'dark';

    if (isLight) {
      root.classList.add('theme-light');
      root.classList.remove('dark', 'theme-dark');
      if (body) {
        body.classList.add('theme-light');
        body.classList.remove('dark', 'theme-dark', 'bg-[#0B1120]', 'text-[#F8FAFC]');
      }
    } else {
      root.classList.add('dark', 'theme-dark');
      root.classList.remove('theme-light');
      if (body) {
        body.classList.add('dark', 'theme-dark');
        body.classList.remove('theme-light');
      }
    }

    if (flags.unifiedTheme) {
      root.setAttribute('data-unified-theme', 'true');
    } else {
      root.removeAttribute('data-unified-theme');
    }

    if (flags.modernTheme && !isLight) {
      root.setAttribute('data-theme', 'modern');
    } else {
      root.removeAttribute('data-theme');
    }

    if (flags.selfHostedFonts) {
      root.setAttribute('data-font-fallback', 'system');
      root.setAttribute('data-self-hosted-fonts', 'true');
    } else {
      root.removeAttribute('data-font-fallback');
      root.removeAttribute('data-self-hosted-fonts');
    }

    if (flags.depthUI) {
      root.setAttribute('data-depth-ui', 'true');
      root.classList.add('depth-ui');
    } else {
      root.removeAttribute('data-depth-ui');
      root.classList.remove('depth-ui');
    }

    if (flags.heroScene3D) {
      root.setAttribute('data-hero-3d', 'true');
    } else {
      root.removeAttribute('data-hero-3d');
    }
  }

  return resolved;
}

export function subscribeSystemThemeChange(onChange: (resolved: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mql = window.matchMedia('(prefers-color-scheme: light)');
  const listener = (e: MediaQueryListEvent) => {
    if (getStoredThemePreference() === 'system') {
      const next: ResolvedTheme = e.matches ? 'light' : 'dark';
      applyDocumentTheme('system');
      onChange(next);
    }
  };
  mql.addEventListener('change', listener);
  return () => mql.removeEventListener('change', listener);
}
