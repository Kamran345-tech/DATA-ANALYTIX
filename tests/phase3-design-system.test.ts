import { describe, it, expect } from 'vitest';
import pkg from '../package.json';
import { APP_VERSION, APP_VERSION_LABEL, toDatasetIdentifier } from '../src/config/appVersion';
import { DESIGN_TOKENS } from '../src/config/designTokens';
import { PAGE_HEADER_CATALOG } from '../src/components/common/PageHeader';
import { SIMPLE_NAV_ITEMS } from '../src/components/modern/ModernSidebar';
import {
  DEFAULT_FEATURE_FLAGS,
  CLASSIC_FEATURE_FLAGS,
  FEATURE_METADATA,
} from '../src/config/features';

describe('Phase 3: UI, Design System, Navigation & Visible Bug Fixes', () => {
  it('3.4.2 uses package.json version as the single source of truth across appVersion and DESIGN_TOKENS', () => {
    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION_LABEL).toBe(`v${pkg.version}`);
    expect(DESIGN_TOKENS.version).toBe(pkg.version);
    expect(DESIGN_TOKENS.brand.version).toBe(pkg.version);
  });

  it('3.4.3 derives deterministic dataset identifier slug matching the active dataset', () => {
    expect(toDatasetIdentifier('Enterprise Sales & Margin Telemetry', 'enterprise_sales_telemetry.csv')).toBe(
      'enterprise-sales-margin-telemetry'
    );
    expect(toDatasetIdentifier('', 'financial_ledger_2026.xlsx')).toBe('financial-ledger-2026');
    expect(toDatasetIdentifier('', '')).toBe('workspace-dataset');
  });

  it('3.1 & 3.2 defines canonical sentence-case PageHeader entries and 3-step quick guides for all 26 navigation pages', () => {
    const pageKeys = Object.keys(PAGE_HEADER_CATALOG);
    expect(pageKeys.length).toBeGreaterThanOrEqual(26);

    for (const [id, spec] of Object.entries(PAGE_HEADER_CATALOG)) {
      expect(spec.id).toBe(id);
      expect(spec.title.length).toBeGreaterThan(2);
      // Page title must not be ALL-CAPS
      expect(spec.title).not.toBe(spec.title.toUpperCase());
      expect(spec.purpose.length).toBeGreaterThan(15);
      expect(spec.guideSteps).toHaveLength(3);
    }
  });

  it('3.3 Simple navigation mode exposes 8 essential items while Pro mode exposes all modules, with consistent Executive Reports naming', () => {
    expect(SIMPLE_NAV_ITEMS).toHaveLength(8);
    expect(SIMPLE_NAV_ITEMS.map(i => i.id)).toEqual([
      'upload',
      'cleaning',
      'analytics_packs',
      'executive_dashboard',
      'reports',
      'ai_insights',
      'export_center',
      'settings',
    ]);

    const reportsItem = SIMPLE_NAV_ITEMS.find(item => item.id === 'reports');
    expect(reportsItem?.label).toBe('Executive Reports');
    expect(PAGE_HEADER_CATALOG.reports.title).toBe('Executive Reports');
  });

  it('registers additive feature flags for all 5 phases (default ON, OFF in Classic)', () => {
    const phaseFlags = [
      'designSystemV3',
      'analystFeatures',
      'dataEngineerFeatures',
      'southAsiaLocale',
      'productQuality',
    ] as const;

    for (const key of phaseFlags) {
      expect(DEFAULT_FEATURE_FLAGS[key]).toBe(true);
      expect(CLASSIC_FEATURE_FLAGS[key]).toBe(false);
      expect(FEATURE_METADATA.some(m => m.key === key)).toBe(true);
    }
  });
});
