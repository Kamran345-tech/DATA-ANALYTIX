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
