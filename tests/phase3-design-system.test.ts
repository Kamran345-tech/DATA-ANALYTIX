import { describe, it, expect } from 'vitest';
import pkg from '../package.json';
import { APP_VERSION, APP_VERSION_LABEL, toDatasetIdentifier } from '../src/config/appVersion';
import { DESIGN_TOKENS } from '../src/config/designTokens';
import { PAGE_HEADER_CATALOG } from '../src/components/common/PageHeader';
import {
  WORKFLOW_SIDEBAR_GROUPS,
  ALL_WORKFLOW_NAV_ITEMS,
  DEFAULT_PINNED_TABS,
  findWorkflowGroupForTab,
} from '../src/config/navigationConfig';
import {
  DEFAULT_FEATURE_FLAGS,
  CLASSIC_FEATURE_FLAGS,
  FEATURE_METADATA,
} from '../src/config/features';

describe('Phase 3: UI, Design System, Workflow Sidebar & Visible Bug Fixes', () => {
  it('3.4.2 uses package.json version as the single source of truth across appVersion and DESIGN_TOKENS', () => {
    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION_LABEL).toBe(`v${pkg.version}`);
    expect(DESIGN_TOKENS.version).toBe(pkg.version);
    expect(DESIGN_TOKENS.brand.version).toBe(pkg.version);
  });

  it('3.4.3 derives deterministic dataset identifier slug matching the active dataset', () => {
    expect(
      toDatasetIdentifier(
        'Enterprise Sales & Margin Telemetry',
        'enterprise_sales_telemetry.csv'
      )
    ).toBe('enterprise-sales-margin-telemetry');
    expect(toDatasetIdentifier('', 'financial_ledger_2026.xlsx')).toBe('financial-ledger-2026');
    expect(toDatasetIdentifier('', '')).toBe('workspace-dataset');
  });

  it('3.1 & 3.2 defines canonical sentence-case PageHeader entries and 3-step quick guides for all 26 navigation pages', () => {
    const pageKeys = Object.keys(PAGE_HEADER_CATALOG);
    expect(pageKeys.length).toBeGreaterThanOrEqual(26);

    for (const [id, spec] of Object.entries(PAGE_HEADER_CATALOG)) {
      expect(spec.id).toBe(id);
      expect(spec.title.length).toBeGreaterThan(2);
      expect(spec.title).not.toBe(spec.title.toUpperCase());
      expect(spec.purpose.length).toBeGreaterThan(15);
      expect(spec.guideSteps).toHaveLength(3);
    }
  });

  it('3.3 organizes all pages into 5 collapsible workflow groups matching the top stepper with 4 default pinned pages', () => {
    expect(WORKFLOW_SIDEBAR_GROUPS.map((g) => g.title)).toEqual([
      '1 Upload',
      '2 Clean',
      '3 Analyze',
      '4 Present',
      'Help & Settings',
    ]);

    expect(DEFAULT_PINNED_TABS).toEqual([
      'upload',
      'analytics_packs',
      'executive_dashboard',
      'reports',
    ]);

    // Verify all core analyst tools are exposed in 3 Analyze (nothing hidden)
    const analyzeGroup = WORKFLOW_SIDEBAR_GROUPS.find((g) => g.id === 'analyze');
    expect(analyzeGroup?.items.map((i) => i.id)).toEqual([
      'analytics_packs',
      'analysis',
      'sql_lab',
      'python_lab',
      'dax_lab',
      'modeling',
      'data_engineering',
      'excel_automation',
    ]);

    // Verify group lookup for stepper highlighting
    expect(findWorkflowGroupForTab('upload').id).toBe('upload');
    expect(findWorkflowGroupForTab('quality').id).toBe('clean');
    expect(findWorkflowGroupForTab('sql_lab').id).toBe('analyze');
    expect(findWorkflowGroupForTab('executive_dashboard').id).toBe('present');
    expect(findWorkflowGroupForTab('how_to_use').id).toBe('help_settings');

    // Compact labels fit cleanly
    const reportsItem = ALL_WORKFLOW_NAV_ITEMS.find((item) => item.id === 'reports');
    expect(reportsItem?.label).toBe('Executive Reports');
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
      expect(FEATURE_METADATA.some((m) => m.key === key)).toBe(true);
    }
  });
});
