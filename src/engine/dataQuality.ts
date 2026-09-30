import { ColumnProfile, DataQualityReport } from '../types';

export function evaluateDataQuality(profiles: ColumnProfile[], rows: Record<string, any>[]): DataQualityReport {
  const totalRows = rows.length;
  if (totalRows === 0 || profiles.length === 0) {
    return {
      overallScore: 100,
      completenessScore: 100,
      uniquenessScore: 100,
      validityScore: 100,
      consistencyScore: 100,
      totalIssuesCount: 0,
      issues: []
    };
  }

  const issues: DataQualityReport['issues'] = [];

  // 1. Completeness Calculation
  const totalCells = totalRows * profiles.length;
  const totalNullCells = profiles.reduce((sum, p) => sum + p.nullCount, 0);
  const completenessScore = Math.max(0, Math.min(100, Math.round(((totalCells - totalNullCells) / totalCells) * 100)));

  profiles.forEach(p => {
    if (p.nullPercentage > 0) {
      const severity = p.nullPercentage > 20 ? 'high' : p.nullPercentage > 5 ? 'medium' : 'low';
      issues.push({
        id: `missing-${p.name}`,
        column: p.name,
        type: 'missing_values',
        severity,
        description: `Column "${p.name}" has ${p.nullCount} missing values (${p.nullPercentage}% null rate).`,
        affectedRows: p.nullCount,
        recommendedAction: p.dataType === 'number' 
          ? `Impute with mean (${p.mean}) or median (${p.median}), or fill with 0.`
          : `Fill with "Unknown" or drop incomplete rows.`
      });
    }
  });

  // 2. Uniqueness & Duplicate Calculation
  const serializedRows = new Set<string>();
  let duplicateRowCount = 0;
  rows.forEach(r => {
    const s = JSON.stringify(r);
    if (serializedRows.has(s)) {
      duplicateRowCount++;
    } else {
      serializedRows.add(s);
    }
  });
  const uniquenessScore = Math.max(0, Math.min(100, Math.round(((totalRows - duplicateRowCount) / totalRows) * 100)));

  if (duplicateRowCount > 0) {
    issues.push({
      id: `duplicate-rows`,
      column: 'All Columns',
      type: 'duplicates',
      severity: duplicateRowCount > totalRows * 0.05 ? 'high' : 'medium',
      description: `Detected ${duplicateRowCount} exact duplicate rows across all fields.`,
      affectedRows: duplicateRowCount,
      recommendedAction: 'Deduplicate dataset using unique record identification.'
    });
  }

  // 3. Validity & Outliers Calculation
  let totalOutliers = 0;
  profiles.forEach(p => {
    if (p.outliersCount > 0) {
      totalOutliers += p.outliersCount;
      issues.push({
        id: `outliers-${p.name}`,
        column: p.name,
        type: 'outliers',
        severity: p.outliersCount > totalRows * 0.05 ? 'medium' : 'low',
        description: `Found ${p.outliersCount} statistical outliers (outside 1.5 * IQR bounds: min ${p.min}, max ${p.max}).`,
        affectedRows: p.outliersCount,
        recommendedAction: 'Review high-magnitude values or cap at 99th percentile threshold.'
      });
    }
  });

  const validityPenalty = Math.min(30, (totalOutliers / (totalRows || 1)) * 50);
  const validityScore = Math.max(70, Math.round(100 - validityPenalty));

  // 4. Consistency Calculation
  let inconsistentCount = 0;
  profiles.forEach(p => {
    if (p.dataType === 'string') {
      // Check for mixed casing like "USA" vs "usa"
      const lowerMap = new Map<string, Set<string>>();
      p.topValues.forEach(tv => {
        const str = String(tv.value);
        const lower = str.toLowerCase();
        if (!lowerMap.has(lower)) lowerMap.set(lower, new Set());
        lowerMap.get(lower)!.add(str);
      });
      lowerMap.forEach((variations, lower) => {
        if (variations.size > 1) {
          inconsistentCount++;
          issues.push({
            id: `casing-${p.name}-${lower}`,
            column: p.name,
            type: 'formatting',
            severity: 'low',
            description: `Inconsistent casing found for value "${lower}" (e.g. ${Array.from(variations).join(', ')}).`,
            affectedRows: Array.from(variations).length,
            recommendedAction: 'Standardize text casing (UPPERCASE or Proper Case).'
          });
        }
      });
    }
  });
  const consistencyScore = Math.max(75, Math.round(100 - Math.min(25, inconsistentCount * 5)));

  // Weighted overall quality score
  const overallScore = Math.round(
    completenessScore * 0.4 +
    uniquenessScore * 0.3 +
    validityScore * 0.2 +
    consistencyScore * 0.1
  );

  return {
    overallScore,
    completenessScore,
    uniquenessScore,
    validityScore,
    consistencyScore,
    totalIssuesCount: issues.length,
    issues
  };
}

import { MessyDataIssue } from '../types';

export function detectMessyIssues(profiles: ColumnProfile[], rows: Record<string, any>[]): MessyDataIssue[] {
  const issues: MessyDataIssue[] = [];
  const totalRows = rows.length;
  if (totalRows === 0 || profiles.length === 0) return issues;

  // 1. Detect Duplicate Rows
  const seen = new Set<string>();
  let dupCount = 0;
  rows.forEach(r => {
    const k = JSON.stringify(r);
    if (seen.has(k)) dupCount++;
    else seen.add(k);
  });

  if (dupCount > 0) {
    issues.push({
      id: 'messy-duplicates',
      category: 'duplicates',
      column: 'All Columns',
      title: `${dupCount} Exact Duplicate Records Found`,
      description: `Detected ${dupCount} duplicate rows that artificially inflate volumetric and financial aggregates.`,
      affectedCount: dupCount,
      severity: dupCount > totalRows * 0.05 ? 'high' : 'medium',
      recommendedAction: 'Remove duplicate rows to maintain transaction integrity and prevent double-counting.',
      suggestedActionType: 'remove_duplicates',
      actionParameters: {}
    });
  }

  // 2. Detect Whitespace Padding in Strings
  profiles.forEach(p => {
    if (p.dataType === 'string') {
      let spaceCount = 0;
      rows.forEach(r => {
        const v = r[p.name];
        if (typeof v === 'string' && v !== v.trim()) {
          spaceCount++;
        }
      });

      if (spaceCount > 0) {
        issues.push({
          id: `messy-whitespace-${p.name}`,
          category: 'whitespace',
          column: p.name,
          title: `Untrimmed Whitespaces in [${p.name}]`,
          description: `${spaceCount} text values contain leading or trailing spaces (e.g. " ${p.name} "), which fragments group-by aggregations and filters in Power BI and SQL.`,
          affectedCount: spaceCount,
          severity: 'medium',
          recommendedAction: `Trim all leading and trailing whitespace from [${p.name}].`,
          suggestedActionType: 'trim_whitespace',
          actionParameters: { column: p.name }
        });
      }
    }
  });

  // 3. Detect Inconsistent Text Casing
  profiles.forEach(p => {
    if (p.dataType === 'string') {
      const lowerMap = new Map<string, Set<string>>();
      rows.forEach(r => {
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
      lowerMap.forEach((variations, lower) => {
        if (variations.size > 1) {
          inconsistentCount += variations.size;
          if (examples.length < 3) {
            examples.push(`"${Array.from(variations).join('" vs "')}"`);
          }
        }
      });

      if (inconsistentCount > 0) {
        issues.push({
          id: `messy-casing-${p.name}`,
          category: 'casing',
          column: p.name,
          title: `Inconsistent Text Casing in [${p.name}]`,
          description: `Discovered mixed casing variations such as ${examples.join(', ')}. This creates duplicate categories on charts.`,
          affectedCount: inconsistentCount,
          severity: 'medium',
          recommendedAction: `Standardize all values in [${p.name}] to Proper / Title Case.`,
          suggestedActionType: 'standardize_text',
          actionParameters: { column: p.name, format: 'titlecase' }
        });
      }
    }
  });

  // 4. Detect Dirty Number Strings (e.g. "$1,250.00" stored as string)
  profiles.forEach(p => {
    if (p.dataType === 'string') {
      let dirtyNumCount = 0;
      rows.forEach(r => {
        const v = String(r[p.name] ?? '').trim();
        if (/^[\$€£¥₹\s]*[0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?[\s%]*$/.test(v) && /[$,€£¥₹%]/.test(v)) {
          dirtyNumCount++;
        }
      });

      if (dirtyNumCount >= 3 || (totalRows > 0 && dirtyNumCount / totalRows > 0.2)) {
        issues.push({
          id: `messy-dirty-numbers-${p.name}`,
          category: 'dirty_numbers',
          column: p.name,
          title: `Dirty Currency / Number Symbols in [${p.name}]`,
          description: `${dirtyNumCount} values contain currency signs ($), thousand commas (,), or percentage marks that prevent numeric summation and averaging.`,
          affectedCount: dirtyNumCount,
          severity: 'high',
          recommendedAction: `Strip currency symbols and commas, casting [${p.name}] into a clean floating-point numerical column.`,
          suggestedActionType: 'clean_dirty_numbers',
          actionParameters: { column: p.name }
        });
      }
    }
  });

  // 5. Detect Missing / Null Cells
  profiles.forEach(p => {
    if (p.nullCount > 0) {
      issues.push({
        id: `messy-missing-${p.name}`,
        category: 'missing',
        column: p.name,
        title: `Incomplete / Missing Values in [${p.name}]`,
        description: `Column has ${p.nullCount} empty or null records (${p.nullPercentage}% missing rate).`,
        affectedCount: p.nullCount,
        severity: p.nullPercentage > 15 ? 'high' : 'medium',
        recommendedAction: p.dataType === 'number'
          ? `Impute with column mean (${p.mean ?? 0}) or median (${p.median ?? 0}) to preserve sample size.`
          : `Fill empty text cells with "Unknown" or drop incomplete records.`,
        suggestedActionType: 'fill_missing',
        actionParameters: { 
          column: p.name, 
          method: p.dataType === 'number' ? 'mean' : 'unknown' 
        }
      });
    }
  });

  // 6. Detect Extreme Statistical Outliers
  profiles.forEach(p => {
    if (p.dataType === 'number' && p.outliersCount > 0) {
      issues.push({
        id: `messy-outliers-${p.name}`,
        category: 'outliers',
        column: p.name,
        title: `${p.outliersCount} Extreme Outliers in [${p.name}]`,
        description: `Values exceed the 1.5x Interquartile Range fence (bounds: ${p.min} to ${p.max}). Outliers can heavily distort regression models and mean KPIs.`,
        affectedCount: p.outliersCount,
        severity: p.outliersCount > totalRows * 0.05 ? 'high' : 'low',
        recommendedAction: `Cap extreme values at the 98th percentile (Winsorization) to stabilize variance.`,
        suggestedActionType: 'cap_outliers',
        actionParameters: { column: p.name, percentile: 98 }
      });
    }
  });

  // 7. Detect Zero-Variance Constant Columns
  profiles.forEach(p => {
    if (p.distinctCount <= 1 && totalRows > 10) {
      issues.push({
        id: `messy-constant-${p.name}`,
        category: 'constant_column',
        column: p.name,
        title: `Redundant Constant Column [${p.name}]`,
        description: `This column contains only 1 unique value across all rows. It adds zero predictive or analytical value.`,
        affectedCount: totalRows,
        severity: 'low',
        recommendedAction: `Drop redundant column [${p.name}] to optimize memory and simplify schemas.`,
        suggestedActionType: 'delete_column',
        actionParameters: { column: p.name }
      });
    }
  });

  return issues;
}
