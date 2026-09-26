import { ColumnProfile, DataType } from '../types';

export function profileDataset(columns: string[], rows: Record<string, any>[], detectedTypes: Record<string, DataType>): ColumnProfile[] {
  const totalCount = rows.length;

  return columns.map(col => {
    const dataType = detectedTypes[col] || 'string';
    const values = rows.map(r => r[col]);
    
    // Null counts
    const nullValues = values.filter(v => v === null || v === undefined || v === '');
    const nullCount = nullValues.length;
    const nullPercentage = totalCount > 0 ? (nullCount / totalCount) * 100 : 0;

    // Non-null values
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    // Distinct counts and frequencies
    const freqMap: Map<any, number> = new Map();
    nonNullValues.forEach(v => {
      const key = typeof v === 'object' ? JSON.stringify(v) : v;
      freqMap.set(key, (freqMap.get(key) || 0) + 1);
    });

    const distinctCount = freqMap.size;
    const uniquePercentage = totalCount > 0 ? (distinctCount / totalCount) * 100 : 0;

    // Top 5 values
    const sortedFrequencies = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({
        value,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
      }));

    const mode = sortedFrequencies.length > 0 ? sortedFrequencies[0].value : undefined;

    let min: number | string | undefined;
    let max: number | string | undefined;
    let mean: number | undefined;
    let median: number | undefined;
    let stdDev: number | undefined;
    let outliersCount = 0;
    let distribution: { range: string; count: number }[] = [];

    if (dataType === 'number' && nonNullValues.length > 0) {
      const numVals = (nonNullValues as number[]).filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
      if (numVals.length > 0) {
        min = numVals[0];
        max = numVals[numVals.length - 1];
        
        const sum = numVals.reduce((acc, curr) => acc + curr, 0);
        mean = sum / numVals.length;

        // Median
        const mid = Math.floor(numVals.length / 2);
        median = numVals.length % 2 !== 0 ? numVals[mid] : (numVals[mid - 1] + numVals[mid]) / 2;

        // Standard Deviation
        const variance = numVals.reduce((acc, val) => acc + Math.pow(val - mean!, 2), 0) / numVals.length;
        stdDev = Math.sqrt(variance);

        // IQR Outlier Detection
        const q1Idx = Math.floor(numVals.length * 0.25);
        const q3Idx = Math.floor(numVals.length * 0.75);
        const q1 = numVals[q1Idx];
        const q3 = numVals[q3Idx];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        outliersCount = numVals.filter(v => v < lowerBound || v > upperBound).length;

        // Distribution buckets (5 buckets)
        if (numVals.length >= 5 && (max as number) > (min as number)) {
          const step = ((max as number) - (min as number)) / 5;
          for (let b = 0; b < 5; b++) {
            const bMin = (min as number) + b * step;
            const bMax = b === 4 ? (max as number) : bMin + step;
            const countInBucket = numVals.filter(v => v >= bMin && (b === 4 ? v <= bMax : v < bMax)).length;
            distribution.push({
              range: `${Math.round(bMin)}-${Math.round(bMax)}`,
              count: countInBucket
            });
          }
        }
      }
    } else if (dataType === 'date' && nonNullValues.length > 0) {
      const dateStrings = (nonNullValues as string[]).sort();
      min = dateStrings[0];
      max = dateStrings[dateStrings.length - 1];
    }

    // Key Candidate Detection
    const isPrimaryKeyCandidate = nullCount === 0 && distinctCount === totalCount && totalCount > 0;
    const lowerCol = col.toLowerCase();
    const isForeignKeyCandidate = (lowerCol.endsWith('id') || lowerCol.endsWith('_id') || lowerCol.endsWith('key') || lowerCol.endsWith('code')) && !isPrimaryKeyCandidate;

    return {
      name: col,
      originalName: col,
      dataType,
      totalCount,
      nullCount,
      nullPercentage: Number(nullPercentage.toFixed(2)),
      distinctCount,
      uniquePercentage: Number(uniquePercentage.toFixed(2)),
      min,
      max,
      mean: mean !== undefined ? Number(mean.toFixed(2)) : undefined,
      median: median !== undefined ? Number(median.toFixed(2)) : undefined,
      stdDev: stdDev !== undefined ? Number(stdDev.toFixed(2)) : undefined,
      mode,
      topValues: sortedFrequencies,
      distribution,
      isPrimaryKeyCandidate,
      isForeignKeyCandidate,
      inconsistentFormatsCount: 0,
      outliersCount
    };
  });
}
