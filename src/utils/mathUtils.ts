/**
 * High-performance, stack-safe math and downsampling utilities.
 * Avoids `Math.min(...arr)` / `Math.max(...arr)` which blow the JavaScript V8
 * call stack when array size exceeds ~65,536 elements.
 */

export function safeMin(arr: (number | null | undefined)[], fallback: number = 0): number {
  if (!arr || arr.length === 0) return fallback;
  let min = Infinity;
  let hasValid = false;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    if (val !== null && val !== undefined && !Number.isNaN(val)) {
      if (val < min) min = val;
      hasValid = true;
    }
  }
  return hasValid ? min : fallback;
}

export function safeMax(arr: (number | null | undefined)[], fallback: number = 0): number {
  if (!arr || arr.length === 0) return fallback;
  let max = -Infinity;
  let hasValid = false;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    if (val !== null && val !== undefined && !Number.isNaN(val)) {
      if (val > max) max = val;
      hasValid = true;
    }
  }
  return hasValid ? max : fallback;
}

export function safeExtremes(arr: (number | null | undefined)[], fallbackMin: number = 0, fallbackMax: number = 0): { min: number; max: number } {
  if (!arr || arr.length === 0) return { min: fallbackMin, max: fallbackMax };
  let min = Infinity;
  let max = -Infinity;
  let hasValid = false;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    if (val !== null && val !== undefined && !Number.isNaN(val)) {
      if (val < min) min = val;
      if (val > max) max = val;
      hasValid = true;
    }
  }
  return {
    min: hasValid ? min : fallbackMin,
    max: hasValid ? max : fallbackMax
  };
}

/**
 * Downsamples large arrays of points to prevent SVG freeze or lag when
 * rendering large datasets (> 300 points).
 */
export function safeDownsample<T>(items: T[], maxPoints: number = 300): T[] {
  if (!items || items.length <= maxPoints) return items;
  const step = items.length / maxPoints;
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(Math.floor(i * step), items.length - 1);
    result.push(items[idx]);
  }
  // Ensure the very last point is preserved
  if (items.length > 0 && result[result.length - 1] !== items[items.length - 1]) {
    result[result.length - 1] = items[items.length - 1];
  }
  return result;
}
