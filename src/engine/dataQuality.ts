import { ColumnProfile, DataQualityReport, MessyDataIssue } from '../types';

export const QUALITY_SCORE_FORMULA_TEXT =
  'Overall Score = 0.40 × Completeness + 0.30 × Uniqueness + 0.20 × Validity + 0.10 × Consistency − Issue Penalties (High: −3, Medium: −2, Low: −1). Invariant: Any active issue (issues > 0) caps the score at ≤ 99% and prevents an A+ or Certified rating.';

const DISMISSED_ISSUES_STORAGE_KEY = 'dataanalytix_dismissed_quality_issues';
let memoryDismissedIssues = new Set<string>();

export function getDismissedQualityIssues(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Set(memoryDismissedIssues);
  }
  try {
    const raw = window.localStorage.getItem(DISMISSED_ISSUES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const combined = new Set<string>([
      ...Array.from(memoryDismissedIssues),
      ...(Array.isArray(parsed) ? parsed : []),
    ]);
    return combined;
  } catch {
    return new Set(memoryDismissedIssues);
  }
}

export function dismissQualityIssue(issueId: string): Set<string> {
  memoryDismissedIssues.add(issueId);
  const current = getDismissedQualityIssues();
  current.add(issueId);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        DISMISSED_ISSUES_STORAGE_KEY,
        JSON.stringify(Array.from(current))
      );
    } catch {
      // ignore storage errors
    }
  }
  return current;
}

export function restoreDismissedQualityIssues(): void {
  memoryDismissedIssues.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(DISMISSED_ISSUES_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * Single authoritative severity function used by Quality Auditor, Cleaning Lab, Data Preview, and PPTX Slide 12.
 */
export function computeQualityIssueSeverity(
  category:
    | 'duplicates'
    | 'missing'
    | 'outliers'
    | 'whitespace'
    | 'casing'
    | 'dirty_numbers'
    | 'constant_column',
  affectedCount: number,
  totalRows: number
): 'high' | 'medium' | 'low' {
  const safeRows = Math.max(1, totalRows);
  const ratio = affectedCount / safeRows;

  switch (category) {
    case 'dirty_numbers':
      return 'high';
    case 'duplicates':
      return ratio > 0.05 ? 'high' : 'medium';
    case 'missing':
      return ratio > 0.15 ? 'high' : ratio > 0.05 ? 'medium' : 'low';
    case 'outliers':
      return ratio > 0.05 ? 'high' : ratio > 0.015 ? 'medium' : 'low';
    case 'whitespace':
      return ratio > 0.1 ? 'high' : 'medium';
    case 'casing':
      return affectedCount > 3 ? 'medium' : 'low';
    case 'constant_column':
      return 'low';
    default:
      return 'low';
  }
}

/**
 * Single authoritative grade function: A+ is awarded ONLY when issuesCount === 0 and overallScore === 100.
 */
export function computeQualityGrade(
  overallScore: number,
  issuesCount: number
): 'A+' | 'A' | 'B' | 'C' | 'D' {
  if (issuesCount === 0 && overallScore >= 100) return 'A+';
  if (overallScore >= 90) return 'A';
  if (overallScore >= 80) return 'B';
  if (overallScore >= 70) return 'C';
  return 'D';
}

/**
 * Single authoritative certification label: "Certified" ONLY when issuesCount === 0.
 */
export function computeQualityStatusLabel(
  overallScore: number,
  issuesCount: number
): string {
  if (issuesCount === 0 && overallScore >= 100) {
    return 'Certified (0 Findings)';
  }
  if (issuesCount > 0) {
    return `${issuesCount} Finding${issuesCount === 1 ? '' : 's'} Detected — Needs Review`;
  }
  return 'Audited Baseline';
}

/**
 * Unified detector that produces identical issue IDs, severities, descriptions, and 99th-percentile / 1.5x IQR wording
 * for Quality Auditor, Cleaning Lab, Data Preview, and PPTX Slide 12.
 */
export function detectMessyIssues(
  profiles: ColumnProfile[],
  rows: Record<string, any>[],
  dismissedIds?: Set<string>
): MessyDataIssue[] {
  const issues: MessyDataIssue[] = [];
  const totalRows = rows.length;
  if (totalRows === 0 || profiles.length === 0) return issues;

  const activeDismissed = dismissedIds ?? getDismissedQualityIssues();

  // 1. Exact Duplicate Rows
  const seen = new Set<string>();
  let dupCount = 0;
  rows.forEach((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) dupCount++;
    else seen.add(k);
  });

  if (dupCount > 0 && !activeDismissed.has('issue-duplicates')) {
    const severity = computeQualityIssueSeverity('duplicates', dupCount, totalRows);
    issues.push({
      id: 'issue-duplicates',
      category: 'duplicates',
      column: 'All Columns',
      title: `${dupCount} Exact Duplicate Records Found`,
      description: `Detected ${dupCount} exact duplicate rows across all fields, which can inflate volumetric and financial aggregates.`,
      affectedCount: dupCount,
      severity,
      recommendedAction:
        'Remove duplicate rows to preserve transaction integrity and prevent double-counting.',
      suggestedActionType: 'remove_duplicates',
      actionParameters: {},
    });
  }

  // 2. Missing / Null Cells
  profiles.forEach((p) => {
    const id = `issue-missing-${p.name}`;
    if (p.nullCount > 0 && !activeDismissed.has(id)) {
      const severity = computeQualityIssueSeverity('missing', p.nullCount, totalRows);
      issues.push({
        id,
        category: 'missing',
        column: p.name,
        title: `Missing Values in [${p.name}]`,
        description: `Column "${p.name}" has ${p.nullCount} missing values (${p.nullPercentage}% null rate).`,
        affectedCount: p.nullCount,
        severity,
        recommendedAction:
          p.dataType === 'number'
            ? `Impute missing values with column mean (${p.mean ?? 0}) or median (${p.median ?? 0}).`
            : `Fill empty text cells with "Unknown" or drop incomplete rows.`,
        suggestedActionType: 'fill_missing',
        actionParameters: {
          column: p.name,
          method: p.dataType === 'number' ? 'mean' : 'unknown',
        },
      });
    }
  });

  // 3. Statistical Outliers (Unified 1.5x IQR & 99th Percentile Wording)
  profiles.forEach((p) => {
    const id = `issue-outliers-${p.name}`;
    if (p.dataType === 'number' && p.outliersCount > 0 && !activeDismissed.has(id)) {
      const severity = computeQualityIssueSeverity('outliers', p.outliersCount, totalRows);
      issues.push({
        id,
        category: 'outliers',
        column: p.name,
        title: `${p.outliersCount} Statistical Outliers in [${p.name}]`,
        description: `Found ${p.outliersCount} statistical outliers outside 1.5x IQR bounds (range: ${p.min} to ${p.max}).`,
        affectedCount: p.outliersCount,
        severity,
        recommendedAction: `Cap extreme values at the 99th percentile threshold (1.5x IQR Winsorization) to stabilize variance.`,
        suggestedActionType: 'cap_outliers',
        actionParameters: { column: p.name, percentile: 99 },
      });
    }
  });

  // 4. Untrimmed Whitespace Padding in Strings
  profiles.forEach((p) => {
    const id = `issue-whitespace-${p.name}`;
    if (p.dataType === 'string' && !activeDismissed.has(id)) {
      let spaceCount = 0;
      rows.forEach((r) => {
        const v = r[p.name];
        if (typeof v === 'string' && v !== v.trim()) {
          spaceCount++;
        }
      });

      if (spaceCount > 0) {
        const severity = computeQualityIssueSeverity('whitespace', spaceCount, totalRows);
        issues.push({
          id,
          category: 'whitespace',
          column: p.name,
          title: `Untrimmed Whitespace in [${p.name}]`,
          description: `${spaceCount} text values contain leading or trailing spaces, which fragments group-by aggregations.`,
          affectedCount: spaceCount,
          severity,
          recommendedAction: `Trim all leading and trailing whitespace from [${p.name}].`,
          suggestedActionType: 'trim_whitespace',
          actionParameters: { column: p.name },
        });
      }
    }
  });

  // 5. Inconsistent Text Casing
  profiles.forEach((p) => {
    const id = `issue-casing-${p.name}`;
    if (p.dataType === 'string' && !activeDismissed.has(id)) {
      const lowerMap = new Map<string, Set<string>>();
      rows.forEach((r) => {
        const v = r[p.name];
        if (typeof v === 'string' && v.trim().length > 0) {
          const trimmed = v.trim();
          const lower = trimmed.toLowerCase();
          if (!lowerMap.has(lower)) lowerMap.set(lower, new Set());
          lowerMap.get(lower)!.add(trimmed);
        }
      });

      let inconsistentCount = 0;
      const examples: string[] = [];
      lowerMap.forEach((variations) => {
        if (variations.size > 1) {
          inconsistentCount += variations.size;
          if (examples.length < 3) {
            examples.push(`"${Array.from(variations).join('" vs "')}"`);
          }
        }
      });

      if (inconsistentCount > 0) {
        const severity = computeQualityIssueSeverity('casing', inconsistentCount, totalRows);
        issues.push({
          id,
          category: 'casing',
          column: p.name,
          title: `Inconsistent Text Casing in [${p.name}]`,
          description: `Mixed casing variations (${examples.join(', ')}) split identical categories across charts.`,
          affectedCount: inconsistentCount,
          severity,
          recommendedAction: `Standardize all values in [${p.name}] to Proper / Title Case.`,
          suggestedActionType: 'standardize_text',
          actionParameters: { column: p.name, format: 'titlecase' },
        });
      }
    }
  });

  // 6. Dirty Currency / Number Strings
  profiles.forEach((p) => {
    const id = `issue-dirty-numbers-${p.name}`;
    if (p.dataType === 'string' && !activeDismissed.has(id)) {
      let dirtyNumCount = 0;
      rows.forEach((r) => {
        const v = String(r[p.name] ?? '').trim();
        if (
          /^[\$€£¥₹\s]*[0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?[\s%]*$/.test(v) &&
          /[$,€£¥₹%]/.test(v)
        ) {
          dirtyNumCount++;
        }
      });

      if (dirtyNumCount >= 3 || (totalRows > 0 && dirtyNumCount / totalRows > 0.2)) {
        const severity = computeQualityIssueSeverity('dirty_numbers', dirtyNumCount, totalRows);
        issues.push({
          id,
          category: 'dirty_numbers',
          column: p.name,
          title: `Unparsed Currency / Number Symbols in [${p.name}]`,
          description: `${dirtyNumCount} values contain currency or percentage symbols that block numeric aggregation.`,
          affectedCount: dirtyNumCount,
          severity,
          recommendedAction: `Strip formatting symbols and cast [${p.name}] to a clean numerical column.`,
          suggestedActionType: 'clean_dirty_numbers',
          actionParameters: { column: p.name },
        });
      }
    }
  });

  // 7. Zero-Variance Constant Columns
  profiles.forEach((p) => {
    const id = `issue-constant-${p.name}`;
    if (p.distinctCount <= 1 && totalRows > 10 && !activeDismissed.has(id)) {
      const severity = computeQualityIssueSeverity('constant_column', totalRows, totalRows);
      issues.push({
        id,
        category: 'constant_column',
        column: p.name,
        title: `Zero-Variance Constant Column [${p.name}]`,
        description: `Column "${p.name}" contains only 1 distinct value across all ${totalRows} rows.`,
        affectedCount: totalRows,
        severity,
        recommendedAction: `Drop redundant constant column [${p.name}] to simplify schema.`,
        suggestedActionType: 'delete_column',
        actionParameters: { column: p.name },
      });
    }
  });

  return issues;
}

/**
 * Shared quality evaluator used across Quality Auditor, Cleaning Lab, Data Preview, and PPTX Slide 12.
 * Guarantees:
 * - Same issues, same severities, and same 99th-percentile / 1.5x IQR wording as `detectMessyIssues`.
 * - Never rounds up to 100% when `issues.length > 0` (caps at <= 99%).
 * - Grade A+ and "Certified" ONLY when `issues.length === 0` and `overallScore === 100`.
 */
export function evaluateDataQuality(
  profiles: ColumnProfile[],
  rows: Record<string, any>[],
  dismissedIds?: Set<string>
): DataQualityReport {
  const totalRows = rows.length;
  if (totalRows === 0 || profiles.length === 0) {
    return {
      overallScore: 100,
      completenessScore: 100,
      uniquenessScore: 100,
      validityScore: 100,
      consistencyScore: 100,
      totalIssuesCount: 0,
      grade: 'A+',
      statusLabel: 'Certified (0 Findings)',
      formulaExplanation: QUALITY_SCORE_FORMULA_TEXT,
      issues: [],
    };
  }

  const unifiedIssues = detectMessyIssues(profiles, rows, dismissedIds);

  // 1. Completeness Score
  const totalCells = Math.max(1, totalRows * profiles.length);
  const missingIssues = unifiedIssues.filter((i) => i.category === 'missing');
  const totalNullCells = missingIssues.reduce((sum, i) => sum + i.affectedCount, 0);
  let completenessScore = Math.max(
    0,
    Math.min(100, Math.round(((totalCells - totalNullCells) / totalCells) * 100))
  );
  if (missingIssues.length > 0 && completenessScore === 100) {
    completenessScore = 99;
  }

  // 2. Uniqueness Score
  const dupIssues = unifiedIssues.filter((i) => i.category === 'duplicates');
  const duplicateRowCount = dupIssues.reduce((sum, i) => sum + i.affectedCount, 0);
  let uniquenessScore = Math.max(
    0,
    Math.min(100, Math.round(((totalRows - duplicateRowCount) / totalRows) * 100))
  );
  if (dupIssues.length > 0 && uniquenessScore === 100) {
    uniquenessScore = 99;
  }

  // 3. Validity Score (Outliers & Dirty Numbers)
  const validityIssues = unifiedIssues.filter(
    (i) => i.category === 'outliers' || i.category === 'dirty_numbers'
  );
  const totalOutliersAndDirty = validityIssues.reduce((sum, i) => sum + i.affectedCount, 0);
  const numColCount = Math.max(1, profiles.filter((p) => p.dataType === 'number').length);
  const outlierRate = totalOutliersAndDirty / Math.max(1, totalRows * numColCount);
  let validityScore = Math.max(0, Math.min(100, Math.round(100 - outlierRate * 100)));
  if (validityIssues.length > 0 && validityScore === 100) {
    validityScore = Math.max(85, 100 - validityIssues.length * 2);
  }

  // 4. Consistency Score (Whitespace, Casing, Constant columns)
  const consistencyIssues = unifiedIssues.filter(
    (i) =>
      i.category === 'whitespace' ||
      i.category === 'casing' ||
      i.category === 'constant_column'
  );
  const stringColCount = Math.max(1, profiles.filter((p) => p.dataType === 'string').length);
  const inconsistencyPenalty = Math.min(
    100,
    (consistencyIssues.length / stringColCount) * 18
  );
  let consistencyScore = Math.max(
    0,
    Math.min(100, Math.round(100 - inconsistencyPenalty))
  );
  if (consistencyIssues.length > 0 && consistencyScore === 100) {
    consistencyScore = Math.max(88, 100 - consistencyIssues.length * 2);
  }

  // Documented Weighted Average + Issue Severity Penalties
  const weightedBase = Math.round(
    completenessScore * 0.4 +
      uniquenessScore * 0.3 +
      validityScore * 0.2 +
      consistencyScore * 0.1
  );

  const issuePenalty = unifiedIssues.reduce((sum, item) => {
    if (item.severity === 'high') return sum + 3;
    if (item.severity === 'medium') return sum + 2;
    return sum + 1;
  }, 0);

  let overallScore = Math.max(0, Math.min(100, weightedBase - issuePenalty));

  // CRITICAL INVARIANT: Never round up to 100% when issues > 0
  if (unifiedIssues.length > 0 && overallScore >= 100) {
    overallScore = 99;
  }

  const mappedIssues: DataQualityReport['issues'] = unifiedIssues.map((m) => ({
    id: m.id,
    column: m.column,
    type:
      m.category === 'missing'
        ? 'missing_values'
        : m.category === 'duplicates'
        ? 'duplicates'
        : m.category === 'outliers'
        ? 'outliers'
        : m.category === 'dirty_numbers'
        ? 'type_mismatch'
        : 'formatting',
    severity: m.severity,
    title: m.title,
    description: m.description,
    affectedRows: m.affectedCount,
    recommendedAction: m.recommendedAction,
    suggestedActionType: m.suggestedActionType,
    actionParameters: m.actionParameters,
  }));

  return {
    overallScore,
    completenessScore,
    uniquenessScore,
    validityScore,
    consistencyScore,
    totalIssuesCount: mappedIssues.length,
    grade: computeQualityGrade(overallScore, mappedIssues.length),
    statusLabel: computeQualityStatusLabel(overallScore, mappedIssues.length),
    formulaExplanation: QUALITY_SCORE_FORMULA_TEXT,
    issues: mappedIssues,
  };
}
