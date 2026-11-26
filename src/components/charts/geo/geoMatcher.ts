/**
 * GEOGRAPHIC AUTO-DETECTOR & ALIAS MATCHER (Part C1 & C2)
 * Detects geographic columns (country, state/province, city, postal code, latitude, longitude)
 * and matches row values against World Countries, US States, and Pakistan Provinces/Districts.
 * Supports one-click user overrides for unmatched location names.
 */

import {
  GeoScopeId,
  GeoRegionFeature,
  WORLD_REGIONS,
  US_STATES_REGIONS,
  PAKISTAN_REGIONS,
  PAKISTAN_CITY_BUBBLES,
  getRegionsForScope,
} from './geoDataLazy';

export interface DetectedGeoColumns {
  hasGeo: boolean;
  locationCol?: string;
  countryCol?: string;
  stateProvinceCol?: string;
  cityCol?: string;
  postalCodeCol?: string;
  latitudeCol?: string;
  longitudeCol?: string;
  recommendedScope: GeoScopeId;
}

export interface MatchedGeoRowSummary {
  feature: GeoRegionFeature;
  value: number;
  count: number;
  rawLabels: string[];
  pointCoords?: [number, number];
}

export interface GeoMatchResult {
  scope: GeoScopeId;
  matched: MatchedGeoRowSummary[];
  unmatchedValues: Array<{
    rawValue: string;
    count: number;
    metricSum: number;
    suggestedFeatureId: string;
    suggestedFeatureName: string;
  }>;
  totalMatchedRows: number;
  totalUnmatchedRows: number;
}

function normalizeGeoToken(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,_()/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Auto-detects geographic columns in a dataset by header names and sample values (Part C2).
 */
export function detectGeographicColumns(
  rows: Record<string, any>[],
  columnNames?: string[]
): DetectedGeoColumns {
  const cols = columnNames && columnNames.length > 0
    ? columnNames
    : rows.length > 0
      ? Object.keys(rows[0])
      : [];

  let countryCol: string | undefined;
  let stateProvinceCol: string | undefined;
  let cityCol: string | undefined;
  let postalCodeCol: string | undefined;
  let latitudeCol: string | undefined;
  let longitudeCol: string | undefined;
  let genericGeoCol: string | undefined;

  for (const col of cols) {
    const h = col.toLowerCase().trim();
    if (!latitudeCol && /\b(lat|latitude|y_coord|geo_lat)\b/i.test(h)) {
      latitudeCol = col;
      continue;
    }
    if (!longitudeCol && /\b(lon|lng|long|longitude|x_coord|geo_lng|geo_lon)\b/i.test(h)) {
      longitudeCol = col;
      continue;
    }
    if (!countryCol && /\b(country|nation|iso_country|country_code|country_name)\b/i.test(h)) {
      countryCol = col;
      continue;
    }
    if (!stateProvinceCol && /\b(state|province|prov|subdivision|oblast|prefecture)\b/i.test(h)) {
      stateProvinceCol = col;
      continue;
    }
    if (!cityCol && /\b(city|town|municipality|metro|district|tehsil|campus|branch|warehouse|facility|clinic|store)\b/i.test(h)) {
      cityCol = col;
      continue;
    }
    if (!postalCodeCol && /\b(zip|zipcode|postal|postcode|pin_code)\b/i.test(h)) {
      postalCodeCol = col;
      continue;
    }
    if (!genericGeoCol && /\b(region|territory|market|geography|location|area|zone)\b/i.test(h)) {
      genericGeoCol = col;
    }
  }

  const locationCol = stateProvinceCol || countryCol || cityCol || genericGeoCol;

  // Inspect sample values to pick the best default scope ('world' | 'us-states' | 'pakistan')
  let recommendedScope: GeoScopeId = 'world';
  if (locationCol && rows.length > 0) {
    const sampleTokens = rows
      .slice(0, 60)
      .map((r) => normalizeGeoToken(r[locationCol]))
      .filter(Boolean);

    let pkHits = 0;
    let usHits = 0;
    let worldHits = 0;

    for (const token of sampleTokens) {
      if (PAKISTAN_REGIONS.some((f) => f.aliases.includes(token) || normalizeGeoToken(f.name) === token)) {
        pkHits++;
      }
      if (US_STATES_REGIONS.some((f) => f.aliases.includes(token) || normalizeGeoToken(f.name) === token)) {
        usHits++;
      }
      if (WORLD_REGIONS.some((f) => f.aliases.includes(token) || normalizeGeoToken(f.name) === token)) {
        worldHits++;
      }
    }

    if (pkHits > 0 && pkHits >= usHits && pkHits >= worldHits) {
      recommendedScope = 'pakistan';
    } else if (usHits > worldHits) {
      recommendedScope = 'us-states';
    } else {
      recommendedScope = 'world';
    }
  }

  return {
    hasGeo: Boolean(locationCol || (latitudeCol && longitudeCol)),
    locationCol,
    countryCol,
    stateProvinceCol,
    cityCol,
    postalCodeCol,
    latitudeCol,
    longitudeCol,
    recommendedScope,
  };
}

/**
 * Resolves a single raw location string to a GeoRegionFeature in the given scope (or across all scopes if auto).
 */
export function resolveGeoFeature(
  rawValue: string,
  scope: GeoScopeId,
  customMappings: Record<string, string> = {}
): { feature: GeoRegionFeature | null; pointCoords?: [number, number] } {
  const token = normalizeGeoToken(rawValue);
  if (!token) return { feature: null };

  const regions = getRegionsForScope(scope);

  // 1. Check user custom one-click mapping overrides first
  const mappedId = customMappings[rawValue] || customMappings[token];
  if (mappedId) {
    const explicit = regions.find((r) => r.id === mappedId || r.isoCode.toLowerCase() === mappedId.toLowerCase());
    if (explicit) return { feature: explicit };
  }

  // 2. If scope is Pakistan, check city bubble centroids too so city-level data ("Karachi", "Lahore", "Islamabad") maps accurately
  if (scope === 'pakistan') {
    const cityMatch = PAKISTAN_CITY_BUBBLES.find((c) => c.aliases.includes(token));
    if (cityMatch) {
      const prov = PAKISTAN_REGIONS.find((r) => r.id === cityMatch.provinceId) || null;
      return { feature: prov, pointCoords: [cityMatch.lng, cityMatch.lat] };
    }
  }

  // 3. Exact match on id, isoCode, name, or alias
  for (const reg of regions) {
    if (
      normalizeGeoToken(reg.id) === token ||
      normalizeGeoToken(reg.isoCode) === token ||
      normalizeGeoToken(reg.name) === token ||
      reg.aliases.some((a) => normalizeGeoToken(a) === token)
    ) {
      return { feature: reg };
    }
  }

  // 4. Substring match for composite strings like "Karachi - South" or "USA (North America)"
  for (const reg of regions) {
    if (
      reg.aliases.some((a) => a.length >= 3 && (token.includes(a) || a.includes(token)))
    ) {
      return { feature: reg };
    }
  }

  return { feature: null };
}

/**
 * Suggests the closest region in `scope` for an unmatched raw value (used for the one-click mapping fix).
 */
function suggestClosestFeature(rawValue: string, scope: GeoScopeId): GeoRegionFeature {
  const regions = getRegionsForScope(scope);
  const token = normalizeGeoToken(rawValue);
  if (!token) return regions[0];

  // Simple prefix / character overlap score
  let best = regions[0];
  let bestScore = -1;
  for (const reg of regions) {
    const candidates = [normalizeGeoToken(reg.name), ...reg.aliases];
    for (const c of candidates) {
      let score = 0;
      if (c[0] === token[0]) score += 2;
      for (let i = 0; i < Math.min(c.length, token.length); i++) {
        if (c[i] === token[i]) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = reg;
      }
    }
  }
  return best;
}

/**
 * Aggregates dataset rows by matched geographic region and collects any unmatched values with 1-click suggestions.
 */
export function matchDatasetToGeoRegions(
  rows: Record<string, any>[],
  locationCol: string,
  metricCol?: string,
  scope: GeoScopeId = 'world',
  customMappings: Record<string, string> = {}
): GeoMatchResult {
  const matchedMap = new Map<string, MatchedGeoRowSummary>();
  const unmatchedMap = new Map<string, { count: number; metricSum: number }>();

  let totalMatchedRows = 0;
  let totalUnmatchedRows = 0;

  for (const row of rows) {
    const rawVal = String(row[locationCol] ?? '').trim();
    if (!rawVal) continue;

    const rawMetric = metricCol ? Number(String(row[metricCol] ?? '0').replace(/[^0-9.-]/g, '')) : 1;
    const metricVal = Number.isFinite(rawMetric) ? rawMetric : 0;

    const { feature, pointCoords } = resolveGeoFeature(rawVal, scope, customMappings);
    if (feature) {
      totalMatchedRows++;
      const existing = matchedMap.get(feature.id);
      if (existing) {
        existing.value += metricVal;
        existing.count += 1;
        if (!existing.rawLabels.includes(rawVal)) {
          existing.rawLabels.push(rawVal);
        }
      } else {
        matchedMap.set(feature.id, {
          feature,
          value: metricVal,
          count: 1,
          rawLabels: [rawVal],
          pointCoords,
        });
      }
    } else {
      totalUnmatchedRows++;
      const prev = unmatchedMap.get(rawVal);
      if (prev) {
        prev.count += 1;
        prev.metricSum += metricVal;
      } else {
        unmatchedMap.set(rawVal, { count: 1, metricSum: metricVal });
      }
    }
  }

  const unmatchedValues = Array.from(unmatchedMap.entries())
    .map(([rawValue, stats]) => {
      const suggestion = suggestClosestFeature(rawValue, scope);
      return {
        rawValue,
        count: stats.count,
        metricSum: stats.metricSum,
        suggestedFeatureId: suggestion.id,
        suggestedFeatureName: suggestion.name,
      };
    })
    .sort((a, b) => b.metricSum - a.metricSum);

  return {
    scope,
    matched: Array.from(matchedMap.values()).sort((a, b) => b.value - a.value),
    unmatchedValues,
    totalMatchedRows,
    totalUnmatchedRows,
  };
}
