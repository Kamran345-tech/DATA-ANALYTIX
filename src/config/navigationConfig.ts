import React, { useState, useEffect } from 'react';
import type { NavigationTab } from '../store/usePlatformStore';

/**
 * Single Source of Truth for the 8 Core Items in Simple Navigation Mode (Phase 3.3):
 * Upload, Clean, Analyze (packs), Dashboard, Report/Present, Ask AI, Export, Settings.
 */
export const SIMPLE_CORE_TAB_LIST: readonly NavigationTab[] = [
  'upload',
  'cleaning',
  'analytics_packs',
  'executive_dashboard',
  'reports',
  'ai_insights',
  'export_center',
  'settings',
] as const;

export const SIMPLE_CORE_TAB_IDS: ReadonlySet<NavigationTab> = new Set<NavigationTab>(
  SIMPLE_CORE_TAB_LIST
);

/**
 * Shared Navigation Complexity Mode (Simple vs Pro) & Recently Used Tabs Hook.
 * Used identically across Sidebar, GroupedSidebar, and ModernSidebar.
 */
export function useSidebarNavState(defaultMode: 'simple' | 'pro' = 'simple') {
  const [navMode, setNavMode] = useState<'simple' | 'pro'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dataanalytix_nav_mode');
      if (stored === 'simple' || stored === 'pro') return stored;
    }
    return defaultMode;
  });

  const [recentTabs, setRecentTabs] = useState<NavigationTab[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('dataanalytix_recent_tabs');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const handleNavMode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'simple' || detail === 'pro') setNavMode(detail);
    };
    const handleRecent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setRecentTabs(detail);
    };
    window.addEventListener('dataanalytix:nav-mode-updated', handleNavMode);
    window.addEventListener('dataanalytix:recent-tabs-updated', handleRecent);
    return () => {
      window.removeEventListener('dataanalytix:nav-mode-updated', handleNavMode);
      window.removeEventListener('dataanalytix:recent-tabs-updated', handleRecent);
    };
  }, []);

  const updateNavMode = React.useCallback((mode: 'simple' | 'pro') => {
    setNavMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dataanalytix_nav_mode', mode);
      window.dispatchEvent(new CustomEvent('dataanalytix:nav-mode-updated', { detail: mode }));
    }
  }, []);

  return { navMode, setNavMode, updateNavMode, recentTabs, setRecentTabs };
}
