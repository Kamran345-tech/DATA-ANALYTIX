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
  {
    id: 'USA',
    name: 'United States',
    isoCode: 'US',
    scope: 'world',
    aliases: ['usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america', 'america', 'us', 'north america', 'na'],
    centroid: [-98.5, 39.8],
    coordinates: [[[-125, 49], [-67, 49], [-67, 25], [-81, 25], [-97, 26], [-117, 32], [-125, 49]]],
  },
  {
    id: 'CAN',
    name: 'Canada',
    isoCode: 'CA',
    scope: 'world',
    aliases: ['canada', 'ca', 'can'],
    centroid: [-106.3, 56.1],
    coordinates: [[[-140, 70], [-53, 70], [-53, 45], [-67, 49], [-125, 49], [-140, 60], [-140, 70]]],
  },
  {
    id: 'MEX',
    name: 'Mexico',
    isoCode: 'MX',
    scope: 'world',
    aliases: ['mexico', 'mx', 'mex', 'méxico'],
    centroid: [-102.5, 23.6],
    coordinates: [[[-117, 32], [-97, 26], [-87, 21], [-92, 15], [-105, 19], [-117, 32]]],
  },
  {
    id: 'BRA',
    name: 'Brazil',
    isoCode: 'BR',
    scope: 'world',
    aliases: ['brazil', 'br', 'bra', 'brasil', 'latam', 'south america'],
    centroid: [-51.9, -14.2],
    coordinates: [[[-74, 5], [-35, -5], [-38, -23], [-53, -33], [-60, -20], [-74, -8], [-74, 5]]],
  },
  {
    id: 'GBR',
    name: 'United Kingdom',
    isoCode: 'GB',
    scope: 'world',
    aliases: ['uk', 'u.k.', 'united kingdom', 'great britain', 'britain', 'england', 'gb', 'gbr', 'london'],
    centroid: [-2.5, 54.0],
    coordinates: [[[-8, 59], [2, 59], [2, 50], [-6, 50], [-8, 59]]],
  },
  {
    id: 'DEU',
    name: 'Germany',
    isoCode: 'DE',
    scope: 'world',
    aliases: ['germany', 'de', 'deu', 'deutschland', 'dach', 'berlin', 'frankfurt', 'munich'],
    centroid: [10.4, 51.1],
    coordinates: [[[6, 55], [15, 55], [15, 47], [6, 47], [6, 55]]],
  },
  {
    id: 'FRA',
    name: 'France',
    isoCode: 'FR',
    scope: 'world',
    aliases: ['france', 'fr', 'fra', 'paris'],
    centroid: [2.2, 46.2],
    coordinates: [[[-5, 51], [8, 49], [7, 43], [-2, 43], [-5, 51]]],
  },
  {
    id: 'NLD',
    name: 'Netherlands',
    isoCode: 'NL',
    scope: 'world',
    aliases: ['netherlands', 'nl', 'nld', 'holland', 'benelux', 'amsterdam'],
    centroid: [5.3, 52.1],
    coordinates: [[[3.3, 53.5], [7.2, 53.5], [7.2, 50.7], [3.3, 50.7], [3.3, 53.5]]],
  },
  {
    id: 'ESP',
    name: 'Spain',
    isoCode: 'ES',
    scope: 'world',
    aliases: ['spain', 'es', 'esp', 'españa', 'madrid', 'barcelona'],
    centroid: [-3.7, 40.4],
    coordinates: [[[-9, 43.8], [3.3, 42.4], [0, 36], [-7.5, 37], [-9, 43.8]]],
  },
  {
    id: 'ITA',
    name: 'Italy',
    isoCode: 'IT',
    scope: 'world',
    aliases: ['italy', 'it', 'ita', 'italia', 'milan', 'rome'],
    centroid: [12.5, 41.8],
    coordinates: [[[7, 46.5], [13.8, 46.5], [18.5, 40], [15, 37], [7, 44], [7, 46.5]]],
  },
  {
    id: 'CHE',
    name: 'Switzerland',
    isoCode: 'CH',
    scope: 'world',
    aliases: ['switzerland', 'ch', 'che', 'zurich', 'geneva'],
    centroid: [8.2, 46.8],
    coordinates: [[[6, 47.8], [10.5, 47.8], [10.5, 45.8], [6, 45.8], [6, 47.8]]],
  },
  {
    id: 'SWE',
    name: 'Sweden',
    isoCode: 'SE',
    scope: 'world',
    aliases: ['sweden', 'se', 'swe', 'nordics', 'stockholm'],
    centroid: [18.6, 60.1],
    coordinates: [[[11, 69], [24, 69], [18, 55], [11, 58], [11, 69]]],
  },
  {
    id: 'ARE',
    name: 'United Arab Emirates',
    isoCode: 'AE',
    scope: 'world',
    aliases: ['uae', 'u.a.e.', 'united arab emirates', 'ae', 'are', 'dubai', 'abu dhabi', 'mena', 'middle east', 'emea'],
    centroid: [54.3, 24.4],
    coordinates: [[[51.5, 26.1], [56.4, 26.1], [56.0, 22.6], [51.5, 22.6], [51.5, 26.1]]],
  },
  {
    id: 'SAU',
    name: 'Saudi Arabia',
    isoCode: 'SA',
    scope: 'world',
    aliases: ['saudi arabia', 'sa', 'sau', 'ksa', 'riyadh', 'jeddah'],
    centroid: [45.0, 23.8],
    coordinates: [[[35, 32], [50, 30], [55, 22], [43, 17], [35, 28], [35, 32]]],
  },
  {
    id: 'PAK',
    name: 'Pakistan',
    isoCode: 'PK',
    scope: 'world',
    aliases: ['pakistan', 'pk', 'pak', 'islamic republic of pakistan', 'karachi', 'lahore', 'islamabad', 'sindh', 'punjab'],
    centroid: [69.3, 30.3],
    coordinates: [[[61, 37], [77, 37], [75, 24], [67, 24], [61, 25], [61, 37]]],
  },
  {
    id: 'IND',
    name: 'India',
    isoCode: 'IN',
    scope: 'world',
    aliases: ['india', 'in', 'ind', 'mumbai', 'delhi', 'bangalore', 'bengaluru'],
    centroid: [78.9, 20.5],
    coordinates: [[[68, 35], [97, 28], [88, 22], [77, 8], [72, 19], [68, 24], [68, 35]]],
  },
  {
    id: 'CHN',
    name: 'China',
    isoCode: 'CN',
    scope: 'world',
    aliases: ['china', 'cn', 'chn', 'prc', 'beijing', 'shanghai', 'shenzhen'],
    centroid: [104.1, 35.8],
    coordinates: [[[74, 49], [134, 49], [122, 31], [108, 21], [97, 28], [74, 38], [74, 49]]],
  },
  {
    id: 'SGP',
    name: 'Singapore',
    isoCode: 'SG',
    scope: 'world',
    aliases: ['singapore', 'sg', 'sgp', 'apac', 'asean'],
    centroid: [103.8, 1.35],
    coordinates: [[[101.5, 3.5], [106, 3.5], [106, -1], [101.5, -1], [101.5, 3.5]]],
  },
  {
    id: 'JPN',
    name: 'Japan',
    isoCode: 'JP',
    scope: 'world',
    aliases: ['japan', 'jp', 'jpn', 'tokyo', 'osaka'],
    centroid: [138.2, 36.2],
    coordinates: [[[130, 45], [145, 45], [141, 31], [129, 31], [130, 45]]],
  },
  {
    id: 'KOR',
    name: 'South Korea',
    isoCode: 'KR',
    scope: 'world',
    aliases: ['south korea', 'korea', 'kr', 'kor', 'seoul'],
    centroid: [127.7, 35.9],
    coordinates: [[[125, 38.6], [130, 38.6], [129.5, 34.5], [126, 34.5], [125, 38.6]]],
  },
  {
    id: 'AUS',
    name: 'Australia',
    isoCode: 'AU',
    scope: 'world',
    aliases: ['australia', 'au', 'aus', 'anz', 'sydney', 'melbourne'],
    centroid: [133.7, -25.2],
    coordinates: [[[113, -12], [153, -12], [153, -39], [115, -35], [113, -12]]],
  },
  {
    id: 'ZAF',
    name: 'South Africa',
    isoCode: 'ZA',
    scope: 'world',
    aliases: ['south africa', 'za', 'zaf', 'johannesburg', 'cape town', 'africa'],
    centroid: [22.9, -30.5],
    coordinates: [[[16, -22], [33, -22], [28, -34.8], [18, -34.8], [16, -22]]],
  },
  {
    id: 'NGA',
    name: 'Nigeria',
    isoCode: 'NG',
    scope: 'world',
    aliases: ['nigeria', 'ng', 'nga', 'lagos', 'abuja'],
    centroid: [8.67, 9.08],
    coordinates: [[[2.7, 13.9], [14.7, 13.9], [14.7, 4.3], [2.7, 4.3], [2.7, 13.9]]],
  },
  {
    id: 'EGY',
    name: 'Egypt',
    isoCode: 'EG',
    scope: 'world',
    aliases: ['egypt', 'eg', 'egy', 'cairo'],
    centroid: [30.8, 26.8],
    coordinates: [[[25, 31.6], [35, 31.6], [36, 22], [25, 22], [25, 31.6]]],
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
