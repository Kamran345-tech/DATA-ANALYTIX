/**
 * LAZY-LOADED OFFLINE GEOJSON BUNDLE (Part C3)
 * World Countries, US States, and Pakistan Provinces & Districts/Cities.
 * Client-side only — zero external map tile servers, zero API keys, works 100% offline.
 */

export type GeoScopeId = 'world' | 'us-states' | 'pakistan';

export interface GeoRegionFeature {
  id: string;
  name: string;
  isoCode: string;
  scope: GeoScopeId;
  aliases: string[];
  /** Centroid [longitude, latitude] */
  centroid: [number, number];
  /** Simplified polygon ring coordinates [[lng, lat], ...] */
  coordinates: [number, number][][];
  parentRegion?: string;
}

function makeBoxPolygon(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  chamfer = 0.18
): [number, number][][] {
  const dx = (maxLng - minLng) * chamfer;
  const dy = (maxLat - minLat) * chamfer;
  return [[
    [minLng + dx, minLat],
    [maxLng - dx, minLat],
    [maxLng, minLat + dy],
    [maxLng, maxLat - dy],
    [maxLng - dx, maxLat],
    [minLng + dx, maxLat],
    [minLng, maxLat - dy],
    [minLng, minLat + dy],
    [minLng + dx, minLat],
  ]];
}

export const WORLD_REGIONS: GeoRegionFeature[] = [
  // --- NORTH & CENTRAL AMERICA ---
  {
    id: 'USA',
    name: 'United States',
    isoCode: 'US',
    scope: 'world',
    aliases: ['usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america', 'america', 'us', 'north america', 'na'],
    centroid: [-98.5, 38.8],
    coordinates: [[
      [-124.7, 48.4], [-117.0, 49.0], [-104.0, 49.0], [-95.1, 49.0], [-89.5, 48.0],
      [-83.0, 46.0], [-82.4, 43.0], [-79.0, 43.2], [-75.0, 45.0], [-71.0, 45.2],
      [-67.0, 47.2], [-67.0, 44.8], [-70.0, 41.8], [-74.0, 40.5], [-75.5, 38.5],
      [-75.5, 35.2], [-80.0, 32.0], [-81.4, 28.5], [-80.1, 25.2], [-82.5, 27.5],
      [-84.5, 30.0], [-89.0, 29.2], [-94.0, 29.7], [-97.1, 26.0], [-100.0, 28.0],
      [-104.0, 29.5], [-106.5, 31.8], [-111.0, 31.3], [-114.8, 32.5], [-117.1, 32.5],
      [-120.5, 34.5], [-122.5, 37.8], [-124.2, 42.0], [-124.7, 48.4],
    ]],
  },
  {
    id: 'CAN',
    name: 'Canada',
    isoCode: 'CA',
    scope: 'world',
    aliases: ['canada', 'ca', 'can', 'toronto', 'vancouver', 'montreal'],
    centroid: [-106.3, 56.1],
    coordinates: [[
      [-141.0, 69.6], [-128.0, 70.5], [-115.0, 73.0], [-95.0, 74.0], [-78.0, 72.5],
      [-64.0, 66.0], [-61.0, 60.0], [-55.6, 52.0], [-53.0, 47.5], [-60.0, 46.0],
      [-66.0, 44.5], [-67.0, 47.2], [-71.0, 45.2], [-75.0, 45.0], [-79.0, 43.2],
      [-82.4, 43.0], [-83.0, 46.0], [-89.5, 48.0], [-95.1, 49.0], [-117.0, 49.0],
      [-124.7, 48.4], [-130.0, 54.5], [-141.0, 60.0], [-141.0, 69.6],
    ]],
  },
  {
    id: 'GRL',
    name: 'Greenland',
    isoCode: 'GL',
    scope: 'world',
    aliases: ['greenland', 'gl', 'grl'],
    centroid: [-42.0, 72.0],
    coordinates: [[
      [-55.0, 60.0], [-43.0, 60.0], [-32.0, 68.0], [-20.0, 76.0], [-28.0, 82.5],
      [-52.0, 82.0], [-68.0, 76.5], [-56.0, 68.0], [-55.0, 60.0],
    ]],
  },
  {
    id: 'MEX',
    name: 'Mexico',
    isoCode: 'MX',
    scope: 'world',
    aliases: ['mexico', 'mx', 'mex', 'méxico', 'mexico city'],
    centroid: [-102.5, 23.6],
    coordinates: [[
      [-117.1, 32.5], [-114.8, 32.5], [-111.0, 31.3], [-106.5, 31.8], [-104.0, 29.5],
      [-100.0, 28.0], [-97.1, 26.0], [-97.8, 22.2], [-94.0, 18.2], [-90.5, 19.8],
      [-87.0, 21.5], [-88.0, 18.0], [-92.2, 14.6], [-97.0, 15.8], [-103.5, 18.3],
      [-105.5, 20.5], [-109.5, 25.5], [-114.0, 28.0], [-117.1, 32.5],
    ]],
  },
  {
    id: 'GTM',
    name: 'Central America',
    isoCode: 'CAM',
    scope: 'world',
    aliases: ['central america', 'guatemala', 'costa rica', 'panama', 'honduras'],
    centroid: [-85.0, 12.5],
    coordinates: [[
      [-92.2, 14.6], [-88.0, 18.0], [-83.5, 15.0], [-83.0, 10.0], [-77.5, 8.5],
      [-78.5, 7.5], [-83.5, 8.5], [-87.5, 12.5], [-92.2, 14.6],
    ]],
  },
  // --- SOUTH AMERICA ---
  {
    id: 'COL',
    name: 'Colombia',
    isoCode: 'CO',
    scope: 'world',
    aliases: ['colombia', 'co', 'col', 'bogota'],
    centroid: [-73.5, 4.5],
    coordinates: [[
      [-77.5, 8.5], [-75.5, 11.0], [-71.5, 12.0], [-72.0, 7.5], [-67.5, 6.0],
      [-67.0, 1.5], [-70.0, -4.2], [-75.0, -0.2], [-78.8, 1.5], [-77.5, 8.5],
    ]],
  },
  {
    id: 'VEN',
    name: 'Venezuela',
    isoCode: 'VE',
    scope: 'world',
    aliases: ['venezuela', 've', 'ven', 'caracas'],
    centroid: [-66.0, 7.0],
    coordinates: [[
      [-71.5, 12.0], [-62.0, 10.6], [-60.0, 8.5], [-60.0, 4.5], [-64.0, 3.8],
      [-67.0, 1.5], [-67.5, 6.0], [-72.0, 7.5], [-71.5, 12.0],
    ]],
  },
  {
    id: 'PER',
    name: 'Peru',
    isoCode: 'PE',
    scope: 'world',
    aliases: ['peru', 'pe', 'per', 'lima'],
    centroid: [-75.0, -9.5],
    coordinates: [[
      [-81.3, -4.5], [-78.8, 1.5], [-75.0, -0.2], [-70.0, -4.2], [-73.8, -7.5],
      [-70.5, -11.0], [-69.0, -13.0], [-70.3, -18.3], [-75.5, -15.0], [-79.0, -8.0],
      [-81.3, -4.5],
    ]],
  },
  {
    id: 'BOL',
    name: 'Bolivia',
    isoCode: 'BO',
    scope: 'world',
    aliases: ['bolivia', 'bo', 'bol', 'la paz'],
    centroid: [-64.5, -16.8],
    coordinates: [[
      [-69.0, -11.0], [-65.0, -10.5], [-60.5, -13.5], [-58.0, -16.5], [-57.8, -20.0],
      [-62.5, -22.5], [-68.5, -22.0], [-69.5, -17.5], [-69.0, -11.0],
    ]],
  },
  {
    id: 'CHL',
    name: 'Chile',
    isoCode: 'CL',
    scope: 'world',
    aliases: ['chile', 'cl', 'chl', 'santiago'],
    centroid: [-71.5, -35.5],
    coordinates: [[
      [-70.3, -18.3], [-68.5, -22.0], [-68.5, -27.0], [-70.0, -33.0], [-71.5, -42.0],
      [-72.0, -50.0], [-68.5, -54.5], [-74.5, -52.5], [-74.0, -44.0], [-71.6, -33.0],
      [-70.5, -24.0], [-70.3, -18.3],
    ]],
  },
  {
    id: 'BRA',
    name: 'Brazil',
    isoCode: 'BR',
    scope: 'world',
    aliases: ['brazil', 'br', 'bra', 'brasil', 'latam', 'south america', 'sao paulo'],
    centroid: [-51.9, -14.2],
    coordinates: [[
      [-60.0, 4.5], [-51.0, 4.0], [-48.0, -1.0], [-41.0, -2.8], [-35.0, -5.8],
      [-34.8, -8.0], [-38.5, -13.0], [-39.0, -18.0], [-41.0, -22.0], [-48.5, -26.0],
      [-50.5, -30.0], [-53.4, -33.7], [-57.6, -30.2], [-57.8, -22.0], [-58.0, -16.5],
      [-60.5, -13.5], [-65.0, -10.5], [-70.5, -11.0], [-73.8, -7.5], [-70.0, -4.2],
      [-67.0, 1.5], [-64.0, 3.8], [-60.0, 4.5],
    ]],
  },
  {
    id: 'ARG',
    name: 'Argentina',
    isoCode: 'AR',
    scope: 'world',
    aliases: ['argentina', 'ar', 'arg', 'buenos aires'],
    centroid: [-64.5, -35.0],
    coordinates: [[
      [-66.0, -22.0], [-58.0, -25.0], [-54.0, -25.8], [-57.6, -30.2], [-58.5, -34.5],
      [-57.5, -38.0], [-62.5, -39.0], [-65.0, -43.0], [-67.5, -48.0], [-68.5, -52.5],
      [-72.0, -50.0], [-71.5, -42.0], [-70.0, -33.0], [-68.5, -27.0], [-66.0, -22.0],
    ]],
  },
  // --- EUROPE ---
  {
    id: 'GBR',
    name: 'United Kingdom',
    isoCode: 'GB',
    scope: 'world',
    aliases: ['uk', 'u.k.', 'united kingdom', 'great britain', 'britain', 'england', 'gb', 'gbr', 'london'],
    centroid: [-2.5, 54.0],
    coordinates: [[
      [-5.0, 58.6], [-2.0, 57.6], [-3.2, 56.0], [-1.5, 55.0], [0.2, 53.5],
      [1.7, 52.5], [1.4, 51.3], [-1.2, 50.7], [-5.2, 50.0], [-3.2, 51.4],
      [-5.0, 52.0], [-3.1, 53.4], [-4.8, 55.0], [-5.6, 56.5], [-5.0, 58.6],
    ]],
  },
  {
    id: 'IRL',
    name: 'Ireland',
    isoCode: 'IE',
    scope: 'world',
    aliases: ['ireland', 'ie', 'irl', 'dublin'],
    centroid: [-8.0, 53.3],
    coordinates: [[
      [-10.0, 54.2], [-6.2, 55.2], [-6.0, 53.3], [-6.5, 52.2], [-9.8, 51.6],
      [-10.2, 52.6], [-10.0, 54.2],
    ]],
  },
  {
    id: 'DEU',
    name: 'Germany',
    isoCode: 'DE',
    scope: 'world',
    aliases: ['germany', 'de', 'deu', 'deutschland', 'dach', 'berlin', 'frankfurt', 'munich'],
    centroid: [10.4, 51.1],
    coordinates: [[
      [8.5, 54.9], [11.0, 54.4], [14.2, 53.9], [15.0, 51.1], [12.5, 50.2],
      [13.8, 48.6], [12.9, 47.6], [10.2, 47.4], [7.6, 47.6], [8.2, 49.0],
      [6.2, 49.5], [6.0, 51.0], [7.2, 53.6], [8.5, 54.9],
    ]],
  },
  {
    id: 'FRA',
    name: 'France',
    isoCode: 'FR',
    scope: 'world',
    aliases: ['france', 'fr', 'fra', 'paris'],
    centroid: [2.2, 46.2],
    coordinates: [[
      [2.5, 51.0], [4.2, 49.9], [6.2, 49.5], [8.2, 49.0], [7.6, 47.6],
      [6.0, 46.2], [7.0, 45.0], [7.5, 43.8], [5.0, 43.3], [3.1, 42.4],
      [-1.8, 43.3], [-1.2, 44.6], [-2.2, 47.2], [-4.8, 48.4], [-1.6, 49.6],
      [1.6, 50.8], [2.5, 51.0],
    ]],
  },
  {
    id: 'NLD',
    name: 'Netherlands',
    isoCode: 'NL',
    scope: 'world',
    aliases: ['netherlands', 'nl', 'nld', 'holland', 'benelux', 'amsterdam'],
    centroid: [5.3, 52.1],
    coordinates: [[
      [4.8, 53.1], [7.2, 53.5], [7.0, 52.2], [6.0, 51.0], [4.0, 51.3],
      [4.5, 52.3], [4.8, 53.1],
    ]],
  },
  {
    id: 'ESP',
    name: 'Spain',
    isoCode: 'ES',
    scope: 'world',
    aliases: ['spain', 'es', 'esp', 'españa', 'madrid', 'barcelona'],
    centroid: [-3.7, 40.4],
    coordinates: [[
      [-9.2, 43.0], [-5.5, 43.6], [-1.8, 43.3], [3.1, 42.4], [0.8, 40.8],
      [-0.4, 39.5], [-0.7, 37.6], [-2.2, 36.8], [-5.4, 36.0], [-7.4, 37.2],
      [-7.0, 39.0], [-8.8, 42.0], [-9.2, 43.0],
    ]],
  },
  {
    id: 'ITA',
    name: 'Italy',
    isoCode: 'IT',
    scope: 'world',
    aliases: ['italy', 'it', 'ita', 'italia', 'milan', 'rome'],
    centroid: [12.5, 41.8],
    coordinates: [[
      [7.0, 45.8], [10.0, 46.5], [12.2, 47.0], [13.8, 46.5], [13.8, 45.6],
      [12.3, 45.4], [12.8, 43.9], [14.2, 42.4], [16.2, 41.9], [18.5, 40.1],
      [16.5, 38.8], [15.6, 38.0], [15.8, 40.0], [13.9, 41.2], [11.8, 42.0],
      [10.3, 43.8], [8.8, 44.4], [7.5, 43.8], [7.0, 45.8],
    ]],
  },
  {
    id: 'CHE',
    name: 'Switzerland',
    isoCode: 'CH',
    scope: 'world',
    aliases: ['switzerland', 'ch', 'che', 'zurich', 'geneva'],
    centroid: [8.2, 46.8],
    coordinates: [[
      [6.0, 46.2], [7.6, 47.6], [9.6, 47.5], [10.5, 46.8], [9.0, 45.9],
      [7.1, 45.9], [6.0, 46.2],
    ]],
  },
  {
    id: 'POL',
    name: 'Poland',
    isoCode: 'PL',
    scope: 'world',
    aliases: ['poland', 'pl', 'pol', 'warsaw'],
    centroid: [19.1, 52.0],
    coordinates: [[
      [14.2, 53.9], [18.6, 54.4], [23.2, 54.2], [24.0, 50.5], [22.5, 49.1],
      [18.8, 49.5], [15.0, 51.1], [14.2, 53.9],
    ]],
  },
  {
    id: 'UKR',
    name: 'Ukraine',
    isoCode: 'UA',
    scope: 'world',
    aliases: ['ukraine', 'ua', 'ukr', 'kyiv'],
    centroid: [31.2, 49.0],
    coordinates: [[
      [23.2, 51.5], [30.5, 52.2], [38.0, 50.0], [40.0, 47.5], [35.0, 46.0],
      [30.0, 46.2], [22.5, 48.2], [23.2, 51.5],
    ]],
  },
  {
    id: 'NOR',
    name: 'Norway',
    isoCode: 'NO',
    scope: 'world',
    aliases: ['norway', 'no', 'nor', 'oslo'],
    centroid: [9.5, 62.0],
    coordinates: [[
      [5.0, 59.0], [5.2, 62.0], [10.0, 64.5], [15.0, 68.5], [25.0, 71.0],
      [30.0, 70.0], [20.5, 69.0], [14.0, 64.5], [12.2, 61.5], [11.2, 58.9],
      [7.5, 58.0], [5.0, 59.0],
    ]],
  },
  {
    id: 'SWE',
    name: 'Sweden',
    isoCode: 'SE',
    scope: 'world',
    aliases: ['sweden', 'se', 'swe', 'nordics', 'stockholm'],
    centroid: [16.5, 62.0],
    coordinates: [[
      [20.5, 69.0], [24.1, 65.8], [21.0, 63.8], [17.5, 60.6], [18.8, 59.3],
      [16.5, 56.5], [14.1, 55.4], [12.7, 56.3], [11.2, 58.9], [12.2, 61.5],
      [14.0, 64.5], [18.0, 68.4], [20.5, 69.0],
    ]],
  },
  {
    id: 'FIN',
    name: 'Finland',
    isoCode: 'FI',
    scope: 'world',
    aliases: ['finland', 'fi', 'fin', 'helsinki'],
    centroid: [26.0, 64.0],
    coordinates: [[
      [21.5, 60.5], [21.5, 63.5], [24.1, 65.8], [20.5, 69.0], [28.5, 70.0],
      [30.0, 65.0], [31.0, 62.5], [27.5, 60.5], [23.0, 59.9], [21.5, 60.5],
    ]],
  },
  {
    id: 'GRC',
    name: 'Southeast Europe',
    isoCode: 'SEE',
    scope: 'world',
    aliases: ['greece', 'romania', 'balkans', 'athens', 'bucharest'],
    centroid: [23.0, 43.0],
    coordinates: [[
      [14.5, 46.0], [22.5, 48.2], [29.5, 45.2], [28.0, 42.0], [26.2, 41.7],
      [23.8, 38.0], [21.5, 37.0], [19.5, 40.5], [16.0, 43.5], [14.5, 46.0],
    ]],
  },
  {
    id: 'RUS',
    name: 'Russia',
    isoCode: 'RU',
    scope: 'world',
    aliases: ['russia', 'ru', 'rus', 'moscow'],
    centroid: [90.0, 61.5],
    coordinates: [[
      [30.0, 60.0], [32.0, 69.5], [44.0, 68.0], [60.0, 70.0], [80.0, 73.5],
      [105.0, 77.0], [135.0, 71.5], [160.0, 70.0], [178.0, 66.0], [162.0, 56.0],
      [140.0, 54.0], [135.0, 48.0], [131.0, 43.0], [120.0, 53.0], [105.0, 50.5],
      [88.0, 49.5], [75.0, 54.0], [60.0, 51.0], [48.0, 46.5], [39.0, 45.0],
      [38.0, 50.0], [31.0, 53.5], [28.0, 57.5], [30.0, 60.0],
    ]],
  },
  // --- MIDDLE EAST & CENTRAL ASIA ---
  {
    id: 'TUR',
    name: 'Turkey',
    isoCode: 'TR',
    scope: 'world',
    aliases: ['turkey', 'tr', 'tur', 'türkiye', 'istanbul', 'ankara'],
    centroid: [35.2, 39.0],
    coordinates: [[
      [26.2, 41.7], [31.5, 41.3], [36.5, 41.3], [41.6, 41.5], [44.5, 39.7],
      [44.8, 37.2], [40.0, 36.8], [36.0, 36.2], [32.5, 36.1], [27.4, 36.8],
      [26.2, 39.8], [26.2, 41.7],
    ]],
  },
  {
    id: 'IRN',
    name: 'Iran',
    isoCode: 'IR',
    scope: 'world',
    aliases: ['iran', 'ir', 'irn', 'tehran'],
    centroid: [53.7, 32.4],
    coordinates: [[
      [44.5, 39.7], [48.5, 38.5], [54.0, 37.5], [61.2, 35.6], [61.5, 29.5],
      [61.6, 25.2], [57.0, 25.6], [54.0, 26.8], [50.5, 29.0], [48.0, 30.5],
      [45.5, 35.5], [44.5, 39.7],
    ]],
  },
  {
    id: 'IRQ',
    name: 'Iraq',
    isoCode: 'IQ',
    scope: 'world',
    aliases: ['iraq', 'iq', 'irq', 'baghdad'],
    centroid: [43.7, 33.2],
    coordinates: [[
      [40.0, 36.8], [44.8, 37.2], [45.5, 35.5], [48.0, 30.5], [46.5, 29.1],
      [39.0, 32.0], [41.0, 34.5], [40.0, 36.8],
    ]],
  },
  {
    id: 'ARE',
    name: 'United Arab Emirates',
    isoCode: 'AE',
    scope: 'world',
    aliases: ['uae', 'u.a.e.', 'united arab emirates', 'ae', 'are', 'dubai', 'abu dhabi', 'mena', 'middle east', 'emea'],
    centroid: [54.3, 24.4],
    coordinates: [[
      [51.6, 24.1], [54.0, 24.5], [56.2, 26.0], [56.4, 25.0], [55.2, 22.7],
      [52.0, 23.0], [51.6, 24.1],
    ]],
  },
  {
    id: 'SAU',
    name: 'Saudi Arabia',
    isoCode: 'SA',
    scope: 'world',
    aliases: ['saudi arabia', 'sa', 'sau', 'ksa', 'riyadh', 'jeddah'],
    centroid: [45.0, 23.8],
    coordinates: [[
      [35.0, 29.5], [39.0, 32.0], [43.0, 30.5], [47.5, 29.0], [50.2, 26.5],
      [51.5, 24.0], [55.2, 22.0], [52.0, 19.0], [47.0, 17.2], [42.8, 16.5],
      [41.0, 19.5], [39.0, 21.5], [37.0, 25.0], [35.0, 29.5],
    ]],
  },
  {
    id: 'KAZ',
    name: 'Kazakhstan',
    isoCode: 'KZ',
    scope: 'world',
    aliases: ['kazakhstan', 'kz', 'kaz', 'almaty', 'astana', 'central asia'],
    centroid: [67.0, 48.0],
    coordinates: [[
      [48.0, 46.5], [60.0, 51.0], [75.0, 54.0], [87.0, 49.2], [80.0, 45.0],
      [74.0, 39.5], [66.0, 41.0], [55.0, 41.5], [50.0, 45.0], [48.0, 46.5],
    ]],
  },
  // --- AFRICA ---
  {
    id: 'MAR',
    name: 'Morocco',
    isoCode: 'MA',
    scope: 'world',
    aliases: ['morocco', 'ma', 'mar', 'casablanca', 'rabat'],
    centroid: [-7.0, 31.8],
    coordinates: [[
      [-5.8, 35.8], [-2.0, 35.0], [-1.5, 32.0], [-8.7, 27.5], [-13.0, 27.5],
      [-9.8, 30.5], [-7.5, 33.6], [-5.8, 35.8],
    ]],
  },
  {
    id: 'DZA',
    name: 'Algeria',
    isoCode: 'DZ',
    scope: 'world',
    aliases: ['algeria', 'dz', 'dza', 'algiers'],
    centroid: [2.6, 28.0],
    coordinates: [[
      [-2.0, 35.0], [8.5, 36.8], [11.5, 33.0], [11.9, 23.5], [4.2, 19.2],
      [-4.8, 25.0], [-8.7, 27.5], [-1.5, 32.0], [-2.0, 35.0],
    ]],
  },
  {
    id: 'LBY',
    name: 'Libya',
    isoCode: 'LY',
    scope: 'world',
    aliases: ['libya', 'ly', 'lby', 'tripoli'],
    centroid: [17.2, 27.0],
    coordinates: [[
      [11.5, 33.0], [15.5, 32.2], [20.0, 32.8], [25.0, 31.6], [25.0, 22.0],
      [24.0, 19.5], [15.0, 23.0], [11.9, 23.5], [11.5, 33.0],
    ]],
  },
  {
    id: 'EGY',
    name: 'Egypt',
    isoCode: 'EG',
    scope: 'world',
    aliases: ['egypt', 'eg', 'egy', 'cairo'],
    centroid: [30.8, 26.8],
    coordinates: [[
      [25.0, 31.6], [29.8, 31.2], [32.3, 31.3], [34.2, 31.2], [34.8, 29.5],
      [33.8, 27.5], [36.8, 22.0], [25.0, 22.0], [25.0, 31.6],
    ]],
  },
  {
    id: 'SDN',
    name: 'Sudan',
    isoCode: 'SD',
    scope: 'world',
    aliases: ['sudan', 'sd', 'sdn', 'khartoum'],
    centroid: [30.2, 15.5],
    coordinates: [[
      [25.0, 22.0], [36.8, 22.0], [38.5, 18.0], [36.0, 13.0], [33.5, 9.5],
      [24.0, 9.5], [22.5, 15.0], [24.0, 19.5], [25.0, 22.0],
    ]],
  },
  {
    id: 'WAF',
    name: 'West Africa',
    isoCode: 'WAF',
    scope: 'world',
    aliases: ['west africa', 'ghana', 'senegal', 'ivory coast', 'mali', 'accra', 'dakar'],
    centroid: [-4.0, 13.5],
    coordinates: [[
      [-17.0, 15.0], [-13.0, 27.5], [-4.8, 25.0], [4.2, 19.2], [11.9, 23.5],
      [14.2, 12.8], [3.6, 11.8], [2.8, 6.4], [-7.5, 4.5], [-13.5, 9.0],
      [-17.0, 15.0],
    ]],
  },
  {
    id: 'NGA',
    name: 'Nigeria',
    isoCode: 'NG',
    scope: 'world',
    aliases: ['nigeria', 'ng', 'nga', 'lagos', 'abuja'],
    centroid: [8.67, 9.08],
    coordinates: [[
      [3.6, 11.8], [5.8, 13.8], [10.5, 13.3], [14.2, 12.8], [13.5, 9.5],
      [11.5, 6.8], [8.5, 4.6], [5.5, 4.3], [2.8, 6.4], [2.8, 9.5], [3.6, 11.8],
    ]],
  },
  {
    id: 'ETH',
    name: 'Ethiopia',
    isoCode: 'ET',
    scope: 'world',
    aliases: ['ethiopia', 'et', 'eth', 'addis ababa'],
    centroid: [39.5, 9.0],
    coordinates: [[
      [36.0, 13.0], [38.5, 18.0], [43.0, 11.5], [48.0, 8.0], [42.0, 4.0],
      [36.0, 4.5], [33.5, 9.5], [36.0, 13.0],
    ]],
  },
  {
    id: 'KEN',
    name: 'Kenya',
    isoCode: 'KE',
    scope: 'world',
    aliases: ['kenya', 'ke', 'ken', 'nairobi', 'east africa'],
    centroid: [37.9, 0.5],
    coordinates: [[
      [34.0, 4.2], [41.8, 3.9], [41.5, -1.6], [39.2, -4.6], [34.0, -1.0],
      [34.0, 4.2],
    ]],
  },
  {
    id: 'COD',
    name: 'Central Africa',
    isoCode: 'COD',
    scope: 'world',
    aliases: ['drc', 'congo', 'cameroon', 'central africa', 'kinshasa'],
    centroid: [21.5, -2.5],
    coordinates: [[
      [9.5, 4.0], [14.2, 12.8], [22.5, 15.0], [24.0, 9.5], [31.0, 3.5],
      [29.5, -4.5], [28.5, -11.5], [22.0, -11.0], [12.5, -6.0], [9.5, 4.0],
    ]],
  },
  {
    id: 'TZA',
    name: 'Tanzania',
    isoCode: 'TZ',
    scope: 'world',
    aliases: ['tanzania', 'tz', 'tza', 'dar es salaam'],
    centroid: [34.8, -6.3],
    coordinates: [[
      [30.5, -1.0], [34.0, -1.0], [39.2, -4.6], [40.4, -10.5], [34.0, -11.5],
      [29.5, -4.5], [30.5, -1.0],
    ]],
  },
  {
    id: 'AGO',
    name: 'Southern Africa Interior',
    isoCode: 'SAF',
    scope: 'world',
    aliases: ['angola', 'zambia', 'zimbabwe', 'namibia', 'botswana', 'mozambique'],
    centroid: [22.0, -16.0],
    coordinates: [[
      [12.5, -6.0], [22.0, -11.0], [28.5, -11.5], [34.0, -11.5], [40.4, -10.5],
      [35.5, -22.0], [31.2, -22.3], [22.5, -26.0], [16.5, -28.6], [12.0, -17.0],
      [12.5, -6.0],
    ]],
  },
  {
    id: 'ZAF',
    name: 'South Africa',
    isoCode: 'ZA',
    scope: 'world',
    aliases: ['south africa', 'za', 'zaf', 'johannesburg', 'cape town', 'africa'],
    centroid: [23.5, -29.5],
    coordinates: [[
      [16.5, -28.6], [20.0, -28.5], [22.5, -26.0], [27.0, -23.5], [31.2, -22.3],
      [32.8, -27.0], [30.5, -30.5], [27.5, -33.0], [22.5, -34.2], [18.4, -34.3],
      [17.8, -31.5], [16.5, -28.6],
    ]],
  },
  {
    id: 'MDG',
    name: 'Madagascar',
    isoCode: 'MG',
    scope: 'world',
    aliases: ['madagascar', 'mg', 'mdg'],
    centroid: [46.8, -19.0],
    coordinates: [[
      [49.2, -12.0], [50.4, -15.5], [47.0, -25.0], [43.5, -24.5], [44.2, -16.5],
      [49.2, -12.0],
    ]],
  },
  // --- SOUTH, EAST & SOUTHEAST ASIA ---
  {
    id: 'PAK',
    name: 'Pakistan',
    isoCode: 'PK',
    scope: 'world',
    aliases: ['pakistan', 'pk', 'pak', 'islamic republic of pakistan', 'karachi', 'lahore', 'islamabad', 'sindh', 'punjab'],
    centroid: [69.3, 30.3],
    coordinates: [[
      [71.5, 36.8], [75.5, 37.0], [77.5, 35.4], [74.5, 32.5], [74.0, 30.0],
      [71.0, 27.8], [71.0, 24.2], [67.0, 24.8], [61.6, 25.2], [60.9, 29.5],
      [66.3, 30.0], [69.3, 31.8], [70.0, 34.0], [71.5, 36.8],
    ]],
  },
  {
    id: 'IND',
    name: 'India',
    isoCode: 'IN',
    scope: 'world',
    aliases: ['india', 'in', 'ind', 'mumbai', 'delhi', 'bangalore', 'bengaluru'],
    centroid: [78.9, 21.5],
    coordinates: [[
      [74.5, 34.5], [78.8, 34.0], [80.0, 30.5], [85.0, 27.5], [88.5, 27.5],
      [92.0, 27.5], [97.0, 28.2], [95.0, 24.5], [92.5, 22.0], [88.5, 22.0],
      [85.5, 19.8], [80.3, 16.0], [80.2, 13.0], [77.5, 8.1], [75.0, 12.5],
      [72.8, 19.0], [70.0, 21.0], [68.5, 23.5], [71.0, 24.2], [71.0, 27.8],
      [74.0, 30.0], [74.5, 34.5],
    ]],
  },
  {
    id: 'MNG',
    name: 'Mongolia',
    isoCode: 'MN',
    scope: 'world',
    aliases: ['mongolia', 'mn', 'mng'],
    centroid: [103.8, 46.8],
    coordinates: [[
      [88.0, 49.2], [105.0, 50.5], [119.5, 49.8], [115.0, 44.5], [106.0, 42.0],
      [96.0, 43.0], [88.0, 49.2],
    ]],
  },
  {
    id: 'CHN',
    name: 'China',
    isoCode: 'CN',
    scope: 'world',
    aliases: ['china', 'cn', 'chn', 'prc', 'beijing', 'shanghai', 'shenzhen'],
    centroid: [104.1, 35.8],
    coordinates: [[
      [74.0, 39.5], [80.0, 45.0], [88.0, 49.2], [96.0, 43.0], [106.0, 42.0],
      [115.0, 44.5], [120.0, 50.0], [127.0, 52.5], [134.5, 48.2], [131.0, 43.0],
      [124.0, 40.0], [120.0, 39.0], [122.0, 37.0], [121.8, 31.2], [120.5, 27.5],
      [116.5, 23.0], [110.0, 20.5], [108.0, 21.5], [100.0, 21.5], [97.5, 28.0],
      [88.5, 27.5], [80.0, 30.5], [78.8, 34.0], [75.5, 37.0], [74.0, 39.5],
    ]],
  },
  {
    id: 'THA',
    name: 'Thailand & Mainland SE Asia',
    isoCode: 'TH',
    scope: 'world',
    aliases: ['thailand', 'th', 'tha', 'bangkok', 'vietnam', 'myanmar', 'malaysia', 'kuala lumpur', 'hanoi'],
    centroid: [101.0, 15.0],
    coordinates: [[
      [92.5, 22.0], [97.5, 28.0], [100.0, 21.5], [108.0, 21.5], [109.2, 13.0],
      [105.0, 8.8], [100.5, 13.5], [103.5, 2.5], [100.2, 5.5], [98.5, 16.0],
      [94.5, 16.0], [92.5, 22.0],
    ]],
  },
  {
    id: 'SGP',
    name: 'Singapore',
    isoCode: 'SG',
    scope: 'world',
    aliases: ['singapore', 'sg', 'sgp', 'apac', 'asean'],
    centroid: [103.8, 1.35],
    coordinates: [[
      [102.0, 3.2], [104.5, 2.5], [104.6, 1.0], [102.2, 1.2], [102.0, 3.2],
    ]],
  },
  {
    id: 'IDN',
    name: 'Indonesia',
    isoCode: 'ID',
    scope: 'world',
    aliases: ['indonesia', 'id', 'idn', 'jakarta'],
    centroid: [113.9, -2.5],
    coordinates: [[
      [95.3, 5.5], [105.0, -3.0], [114.5, -3.5], [120.0, -2.0], [125.0, -8.5],
      [114.0, -8.5], [106.0, -6.5], [95.3, 5.5],
    ]],
  },
  {
    id: 'PHL',
    name: 'Philippines',
    isoCode: 'PH',
    scope: 'world',
    aliases: ['philippines', 'ph', 'phl', 'manila'],
    centroid: [122.0, 12.8],
    coordinates: [[
      [120.5, 18.5], [122.5, 17.0], [126.0, 11.0], [126.2, 6.5], [122.0, 7.0],
      [120.0, 14.0], [120.5, 18.5],
    ]],
  },
  {
    id: 'JPN',
    name: 'Japan',
    isoCode: 'JP',
    scope: 'world',
    aliases: ['japan', 'jp', 'jpn', 'tokyo', 'osaka'],
    centroid: [138.2, 36.2],
    coordinates: [[
      [141.5, 45.4], [145.0, 43.3], [141.0, 41.5], [140.8, 38.0], [140.0, 35.5],
      [136.0, 34.0], [131.0, 31.2], [129.8, 33.5], [133.0, 35.5], [137.0, 37.2],
      [140.0, 40.5], [141.5, 45.4],
    ]],
  },
  {
    id: 'KOR',
    name: 'South Korea',
    isoCode: 'KR',
    scope: 'world',
    aliases: ['south korea', 'korea', 'kr', 'kor', 'seoul'],
    centroid: [127.7, 35.9],
    coordinates: [[
      [126.5, 38.0], [128.6, 38.5], [129.5, 35.5], [126.5, 34.3], [126.2, 36.8],
      [126.5, 38.0],
    ]],
  },
  // --- OCEANIA ---
  {
    id: 'AUS',
    name: 'Australia',
    isoCode: 'AU',
    scope: 'world',
    aliases: ['australia', 'au', 'aus', 'anz', 'sydney', 'melbourne'],
    centroid: [133.7, -25.2],
    coordinates: [[
      [131.0, -11.5], [136.5, -12.0], [136.0, -15.0], [141.0, -16.5], [142.5, -10.8],
      [145.5, -15.5], [150.5, -22.5], [153.6, -28.0], [151.0, -34.0], [147.0, -38.5],
      [141.0, -38.4], [136.0, -35.0], [131.5, -31.5], [123.0, -34.0], [115.0, -34.3],
      [113.5, -25.5], [114.2, -21.8], [122.0, -18.0], [127.0, -14.0], [131.0, -11.5],
    ]],
  },
  {
    id: 'NZL',
    name: 'New Zealand',
    isoCode: 'NZ',
    scope: 'world',
    aliases: ['new zealand', 'nz', 'nzl', 'auckland', 'wellington'],
    centroid: [172.5, -41.5],
    coordinates: [[
      [173.0, -35.0], [178.0, -37.8], [175.0, -41.5], [174.0, -42.5], [168.0, -46.5],
      [166.5, -45.5], [171.0, -42.0], [174.0, -39.0], [173.0, -35.0],
    ]],
  },
];

export const US_STATES_REGIONS: GeoRegionFeature[] = [
  { id: 'US-WA', name: 'Washington', isoCode: 'WA', scope: 'us-states', aliases: ['washington', 'wa', 'seattle', 'pacific northwest', 'west', 'us-west'], centroid: [-120.7, 47.4], coordinates: makeBoxPolygon(-124.7, 45.5, -116.9, 49.0) },
  { id: 'US-OR', name: 'Oregon', isoCode: 'OR', scope: 'us-states', aliases: ['oregon', 'or', 'portland'], centroid: [-120.5, 43.8], coordinates: makeBoxPolygon(-124.5, 42.0, -116.5, 45.5) },
  { id: 'US-CA', name: 'California', isoCode: 'CA', scope: 'us-states', aliases: ['california', 'ca', 'san francisco', 'los angeles', 'san diego', 'silicon valley', 'bay area'], centroid: [-119.4, 36.7], coordinates: makeBoxPolygon(-124.4, 32.5, -114.1, 42.0) },
  { id: 'US-NV', name: 'Nevada', isoCode: 'NV', scope: 'us-states', aliases: ['nevada', 'nv', 'las vegas', 'reno'], centroid: [-116.4, 38.8], coordinates: makeBoxPolygon(-120.0, 35.0, -114.0, 42.0) },
  { id: 'US-AZ', name: 'Arizona', isoCode: 'AZ', scope: 'us-states', aliases: ['arizona', 'az', 'phoenix', 'tucson', 'southwest'], centroid: [-111.0, 34.0], coordinates: makeBoxPolygon(-114.8, 31.3, -109.0, 37.0) },
  { id: 'US-UT', name: 'Utah', isoCode: 'UT', scope: 'us-states', aliases: ['utah', 'ut', 'salt lake city'], centroid: [-111.5, 39.3], coordinates: makeBoxPolygon(-114.0, 37.0, -109.0, 42.0) },
  { id: 'US-ID', name: 'Idaho', isoCode: 'ID', scope: 'us-states', aliases: ['idaho', 'id', 'boise'], centroid: [-114.7, 44.0], coordinates: makeBoxPolygon(-117.0, 42.0, -111.0, 49.0) },
  { id: 'US-MT', name: 'Montana', isoCode: 'MT', scope: 'us-states', aliases: ['montana', 'mt'], centroid: [-110.3, 46.8], coordinates: makeBoxPolygon(-116.0, 44.5, -104.0, 49.0) },
  { id: 'US-WY', name: 'Wyoming', isoCode: 'WY', scope: 'us-states', aliases: ['wyoming', 'wy'], centroid: [-107.3, 43.0], coordinates: makeBoxPolygon(-111.0, 41.0, -104.0, 45.0) },
  { id: 'US-CO', name: 'Colorado', isoCode: 'CO', scope: 'us-states', aliases: ['colorado', 'co', 'denver', 'boulder', 'mountain'], centroid: [-105.7, 39.5], coordinates: makeBoxPolygon(-109.0, 37.0, -102.0, 41.0) },
  { id: 'US-NM', name: 'New Mexico', isoCode: 'NM', scope: 'us-states', aliases: ['new mexico', 'nm', 'albuquerque'], centroid: [-105.8, 34.5], coordinates: makeBoxPolygon(-109.0, 31.3, -103.0, 37.0) },
  { id: 'US-TX', name: 'Texas', isoCode: 'TX', scope: 'us-states', aliases: ['texas', 'tx', 'austin', 'dallas', 'houston', 'san antonio', 'south', 'us-south'], centroid: [-99.9, 31.9], coordinates: makeBoxPolygon(-106.6, 25.8, -93.5, 36.5) },
  { id: 'US-OK', name: 'Oklahoma', isoCode: 'OK', scope: 'us-states', aliases: ['oklahoma', 'ok'], centroid: [-97.0, 35.5], coordinates: makeBoxPolygon(-103.0, 33.6, -94.4, 37.0) },
  { id: 'US-KS', name: 'Kansas', isoCode: 'KS', scope: 'us-states', aliases: ['kansas', 'ks'], centroid: [-98.4, 38.5], coordinates: makeBoxPolygon(-102.0, 37.0, -94.6, 40.0) },
  { id: 'US-NE', name: 'Nebraska', isoCode: 'NE', scope: 'us-states', aliases: ['nebraska', 'ne', 'omaha'], centroid: [-99.9, 41.4], coordinates: makeBoxPolygon(-104.0, 40.0, -95.3, 43.0) },
  { id: 'US-MN', name: 'Minnesota', isoCode: 'MN', scope: 'us-states', aliases: ['minnesota', 'mn', 'minneapolis'], centroid: [-94.6, 46.7], coordinates: makeBoxPolygon(-97.2, 43.5, -89.5, 49.0) },
  { id: 'US-IA', name: 'Iowa', isoCode: 'IA', scope: 'us-states', aliases: ['iowa', 'ia'], centroid: [-93.1, 41.8], coordinates: makeBoxPolygon(-96.6, 40.4, -90.1, 43.5) },
  { id: 'US-MO', name: 'Missouri', isoCode: 'MO', scope: 'us-states', aliases: ['missouri', 'mo', 'st. louis', 'kansas city'], centroid: [-91.8, 37.9], coordinates: makeBoxPolygon(-95.7, 36.0, -89.1, 40.6) },
  { id: 'US-IL', name: 'Illinois', isoCode: 'IL', scope: 'us-states', aliases: ['illinois', 'il', 'chicago', 'midwest', 'us-midwest', 'central'], centroid: [-89.3, 40.6], coordinates: makeBoxPolygon(-91.5, 37.0, -87.5, 42.5) },
  { id: 'US-WI', name: 'Wisconsin', isoCode: 'WI', scope: 'us-states', aliases: ['wisconsin', 'wi', 'milwaukee', 'madison'], centroid: [-89.6, 43.7], coordinates: makeBoxPolygon(-92.8, 42.5, -86.8, 47.0) },
  { id: 'US-MI', name: 'Michigan', isoCode: 'MI', scope: 'us-states', aliases: ['michigan', 'mi', 'detroit'], centroid: [-85.6, 44.3], coordinates: makeBoxPolygon(-87.5, 41.7, -82.4, 46.5) },
  { id: 'US-IN', name: 'Indiana', isoCode: 'IN', scope: 'us-states', aliases: ['indiana', 'in', 'indianapolis'], centroid: [-86.1, 40.2], coordinates: makeBoxPolygon(-88.0, 37.8, -84.8, 41.7) },
  { id: 'US-OH', name: 'Ohio', isoCode: 'OH', scope: 'us-states', aliases: ['ohio', 'oh', 'columbus', 'cleveland', 'cincinnati'], centroid: [-82.9, 40.4], coordinates: makeBoxPolygon(-84.8, 38.4, -80.5, 42.0) },
  { id: 'US-PA', name: 'Pennsylvania', isoCode: 'PA', scope: 'us-states', aliases: ['pennsylvania', 'pa', 'philadelphia', 'pittsburgh'], centroid: [-77.2, 41.2], coordinates: makeBoxPolygon(-80.5, 39.7, -74.7, 42.3) },
  { id: 'US-NY', name: 'New York', isoCode: 'NY', scope: 'us-states', aliases: ['new york', 'ny', 'nyc', 'manhattan', 'northeast', 'us-east', 'east'], centroid: [-75.0, 43.0], coordinates: makeBoxPolygon(-79.7, 40.5, -71.8, 45.0) },
  { id: 'US-MA', name: 'Massachusetts', isoCode: 'MA', scope: 'us-states', aliases: ['massachusetts', 'ma', 'boston', 'new england'], centroid: [-71.3, 42.4], coordinates: makeBoxPolygon(-73.5, 41.2, -69.9, 42.9) },
  { id: 'US-NJ', name: 'New Jersey', isoCode: 'NJ', scope: 'us-states', aliases: ['new jersey', 'nj', 'newark'], centroid: [-74.4, 40.0], coordinates: makeBoxPolygon(-75.5, 38.9, -73.9, 41.4) },
  { id: 'US-VA', name: 'Virginia', isoCode: 'VA', scope: 'us-states', aliases: ['virginia', 'va', 'richmond', 'arlington', 'dc', 'washington dc'], centroid: [-78.6, 37.4], coordinates: makeBoxPolygon(-83.6, 36.5, -75.2, 39.5) },
  { id: 'US-NC', name: 'North Carolina', isoCode: 'NC', scope: 'us-states', aliases: ['north carolina', 'nc', 'charlotte', 'raleigh'], centroid: [-79.0, 35.7], coordinates: makeBoxPolygon(-84.3, 33.8, -75.4, 36.6) },
  { id: 'US-GA', name: 'Georgia', isoCode: 'GA', scope: 'us-states', aliases: ['georgia', 'ga', 'atlanta', 'southeast'], centroid: [-83.5, 32.1], coordinates: makeBoxPolygon(-85.6, 30.3, -80.8, 35.0) },
  { id: 'US-FL', name: 'Florida', isoCode: 'FL', scope: 'us-states', aliases: ['florida', 'fl', 'miami', 'orlando', 'tampa'], centroid: [-81.5, 27.6], coordinates: makeBoxPolygon(-87.6, 24.5, -80.0, 31.0) },
  { id: 'US-TN', name: 'Tennessee', isoCode: 'TN', scope: 'us-states', aliases: ['tennessee', 'tn', 'nashville', 'memphis'], centroid: [-86.5, 35.5], coordinates: makeBoxPolygon(-90.3, 35.0, -81.6, 36.7) },
];

/**
 * Pakistan Provinces, Federal Territory, and Major Cities/Districts (Part C1)
 * Explicitly matches "Sindh", "Punjab", "KPK", "Balochistan", "Karachi", "Lahore", "Islamabad", etc.
 */
export const PAKISTAN_REGIONS: GeoRegionFeature[] = [
  {
    id: 'PK-PB',
    name: 'Punjab',
    isoCode: 'PK-PB',
    scope: 'pakistan',
    aliases: ['punjab', 'pb', 'pk-pb', 'lahore', 'faisalabad', 'rawalpindi', 'multan', 'gujranwala', 'sialkot', 'bahawalpur', 'sargodha'],
    centroid: [72.7, 31.1],
    coordinates: [[[69.5, 33.9], [75.3, 33.2], [74.6, 29.8], [71.0, 27.8], [69.3, 28.5], [70.5, 31.5], [69.5, 33.9]]],
  },
  {
    id: 'PK-SD',
    name: 'Sindh',
    isoCode: 'PK-SD',
    scope: 'pakistan',
    aliases: ['sindh', 'sind', 'sd', 'pk-sd', 'karachi', 'hyderabad', 'sukkur', 'larkana', 'mirpur khas', 'nawabshah', 'thatta'],
    centroid: [68.5, 25.9],
    coordinates: [[[66.6, 28.5], [71.0, 27.8], [71.1, 24.1], [67.0, 24.0], [66.6, 25.4], [66.6, 28.5]]],
  },
  {
    id: 'PK-KP',
    name: 'Khyber Pakhtunkhwa (KPK)',
    isoCode: 'PK-KP',
    scope: 'pakistan',
    aliases: ['kpk', 'kp', 'khyber pakhtunkhwa', 'nwfp', 'pk-kp', 'peshawar', 'mardan', 'abbottabad', 'swat', 'mingora', 'kohat', 'dera ismail khan', 'chitral'],
    centroid: [71.5, 34.5],
    coordinates: [[[69.2, 36.8], [73.8, 36.8], [73.6, 33.8], [70.2, 31.5], [69.2, 33.5], [69.2, 36.8]]],
  },
  {
    id: 'PK-BA',
    name: 'Balochistan',
    isoCode: 'PK-BA',
    scope: 'pakistan',
    aliases: ['balochistan', 'baluchistan', 'ba', 'pk-ba', 'quetta', 'gwadar', 'turbat', 'khuzdar', 'chaman', 'zhob', 'sibi'],
    centroid: [65.2, 28.4],
    coordinates: [[[60.9, 31.5], [69.5, 31.8], [69.3, 28.5], [66.6, 28.5], [66.6, 25.4], [61.5, 25.1], [60.9, 29.5], [60.9, 31.5]]],
  },
  {
    id: 'PK-IS',
    name: 'Islamabad (ICT)',
    isoCode: 'PK-IS',
    scope: 'pakistan',
    aliases: ['islamabad', 'ict', 'islamabad capital territory', 'isb', 'pk-is', 'federal capital'],
    centroid: [73.05, 33.68],
    coordinates: makeBoxPolygon(72.75, 33.45, 73.45, 33.95, 0.2),
  },
  {
    id: 'PK-GB',
    name: 'Gilgit-Baltistan',
    isoCode: 'PK-GB',
    scope: 'pakistan',
    aliases: ['gilgit-baltistan', 'gilgit', 'baltistan', 'gb', 'pk-gb', 'skardu', 'hunza', 'northern areas'],
    centroid: [75.3, 35.8],
    coordinates: [[[72.5, 37.1], [77.8, 37.1], [77.0, 34.6], [73.8, 35.0], [72.5, 37.1]]],
  },
  {
    id: 'PK-JK',
    name: 'Azad Jammu & Kashmir (AJK)',
    isoCode: 'PK-JK',
    scope: 'pakistan',
    aliases: ['ajk', 'azad kashmir', 'kashmir', 'azad jammu and kashmir', 'pk-jk', 'muzaffarabad', 'mirpur', 'rawalakot'],
    centroid: [73.9, 34.1],
    coordinates: [[[73.4, 35.1], [74.8, 35.1], [74.5, 32.8], [73.4, 33.2], [73.4, 35.1]]],
  },
];

export const PAKISTAN_CITY_BUBBLES: Array<{
  name: string;
  provinceId: string;
  lat: number;
  lng: number;
  aliases: string[];
}> = [
  { name: 'Karachi', provinceId: 'PK-SD', lat: 24.8607, lng: 67.0011, aliases: ['karachi', 'khi'] },
  { name: 'Lahore', provinceId: 'PK-PB', lat: 31.5204, lng: 74.3587, aliases: ['lahore', 'lhr'] },
  { name: 'Islamabad', provinceId: 'PK-IS', lat: 33.6844, lng: 73.0479, aliases: ['islamabad', 'isb', 'ict'] },
  { name: 'Rawalpindi', provinceId: 'PK-PB', lat: 33.5651, lng: 73.0169, aliases: ['rawalpindi', 'pindi', 'rwp'] },
  { name: 'Faisalabad', provinceId: 'PK-PB', lat: 31.4504, lng: 73.1350, aliases: ['faisalabad', 'fsd', 'lyallpur'] },
  { name: 'Multan', provinceId: 'PK-PB', lat: 30.1575, lng: 71.5249, aliases: ['multan', 'mux'] },
  { name: 'Peshawar', provinceId: 'PK-KP', lat: 34.0151, lng: 71.5249, aliases: ['peshawar', 'pew'] },
  { name: 'Quetta', provinceId: 'PK-BA', lat: 30.1798, lng: 66.9750, aliases: ['quetta', 'uet'] },
  { name: 'Hyderabad', provinceId: 'PK-SD', lat: 25.3960, lng: 68.3578, aliases: ['hyderabad', 'hdd'] },
  { name: 'Sialkot', provinceId: 'PK-PB', lat: 32.4945, lng: 74.5229, aliases: ['sialkot', 'skt'] },
  { name: 'Gujranwala', provinceId: 'PK-PB', lat: 32.1877, lng: 74.1945, aliases: ['gujranwala', 'grw'] },
  { name: 'Gwadar', provinceId: 'PK-BA', lat: 25.1264, lng: 62.3225, aliases: ['gwadar', 'gwd'] },
  { name: 'Sukkur', provinceId: 'PK-SD', lat: 27.7052, lng: 68.8574, aliases: ['sukkur', 'skz'] },
];

export function getRegionsForScope(scope: GeoScopeId): GeoRegionFeature[] {
  if (scope === 'pakistan') return PAKISTAN_REGIONS;
  if (scope === 'us-states') return US_STATES_REGIONS;
  return WORLD_REGIONS;
}
