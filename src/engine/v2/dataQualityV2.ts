import { ColumnProfile, DataQualityReport } from '../../types';
import { evaluateDataQuality as evaluateDataQualityClassic } from '../dataQuality';

export interface DataQualityReportV2 extends DataQualityReport {
  isUnfloored: boolean;
  rawPenaltyTotal: number;
  auditTrail: {
    completenessWeight: number;
    uniquenessWeight: number;
    validityWeight: number;
    consistencyWeight: number;
    calculatedAt: string;
  };
}

/**
 * Enhanced Data Quality Evaluator (v2)
 * Removes synthetic floors and computes strictly honest metrics.
 */
export function evaluateDataQualityV2(
  profiles: ColumnProfile[],
  rows: Record<string, any>[]
): DataQualityReportV2 {
  // Defensive normalization of profiles
  const safeProfiles = (profiles || []).map(p => ({
    ...p,
    topValues: p.topValues || []
  }));

  // Obtain base breakdown from classic implementation
  const classic = evaluateDataQualityClassic(safeProfiles, rows);

  const totalRows = rows.length;
  if (totalRows === 0 || profiles.length === 0) {
    return {
      ...classic,
      isUnfloored: true,
      rawPenaltyTotal: 0,
      auditTrail: {
        completenessWeight: 0.4,
        uniquenessWeight: 0.3,
        validityWeight: 0.2,
        consistencyWeight: 0.1,
        calculatedAt: new Date().toISOString()
      }
    };
  }

  // Pure mathematical weighted unfloored score:
  // Completeness (40%) + Uniqueness (30%) + Validity (20%) + Consistency (10%)
  const rawScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        classic.completenessScore * 0.4 +
        classic.uniquenessScore * 0.3 +
        classic.validityScore * 0.2 +
        classic.consistencyScore * 0.1
      )
    )
  );

  const rawPenaltyTotal = 100 - rawScore;

  return {
    ...classic,
    overallScore: rawScore,
    isUnfloored: true,
    rawPenaltyTotal,
    auditTrail: {
      completenessWeight: 0.4,
      uniquenessWeight: 0.3,
      validityWeight: 0.2,
      consistencyWeight: 0.1,
      calculatedAt: new Date().toISOString()
    }
  };
}
