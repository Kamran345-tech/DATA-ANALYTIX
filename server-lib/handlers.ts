import { getGeminiClient, interpretAnalyticalData } from './aiService.js';
import { validateExternalUrl, validateExternalUrlHardened, safeFetch } from './ssrfValidator.js';
import { getSuggestedTablesForDb, generateLiveDatabaseStream } from './dbHelpers.js';
import { checkRateLimit } from './rateLimiter.js';

export function handleHealth() {
  const ai = getGeminiClient();
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    capabilities: {
      geminiConfigured: !!ai,
      inMemoryAnalytics: true,
      exportEngines: ['xlsx', 'pbip', 'json', 'csv', 'dax', 'sql', 'python'],
      liveDataConnector: true,
      hardenedSecurity: true,
      rateLimiterPruning: true
    }
  };
}

export async function handleTestConnection(body: any) {
  const { serverType, host, database, restEndpoint } = body || {};
  const startTime = Date.now();

  // If REST API endpoint is specified, test HTTP connectivity with SSRF guard
  if (serverType === 'rest_api' || restEndpoint) {
    const targetUrl = restEndpoint || host;
    if (!targetUrl) {
      return { status: 400, data: { success: false, error: 'REST endpoint URL is required.' } };
    }

    const ssrfCheck = await validateExternalUrlHardened(targetUrl);
    if (!ssrfCheck.valid) {
      return { status: 400, data: { success: false, error: ssrfCheck.error } };
    }

    try {
      const fetchRes = await safeFetch(targetUrl, {
        headers: body.headers || { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      const latencyMs = Date.now() - startTime;
      return {
        status: 200,
        data: {
          success: fetchRes.ok,
          status: fetchRes.status,
          statusText: fetchRes.statusText,
          latencyMs,
          isSimulation: false,
          message: fetchRes.ok
            ? `Connected to REST API (${fetchRes.status} ${fetchRes.statusText}) in ${latencyMs}ms`
            : `HTTP ${fetchRes.status}: ${fetchRes.statusText}`
        }
      };
    } catch (fetchErr: any) {
      return {
        status: 502,
        data: {
          success: false,
          latencyMs: Date.now() - startTime,
          error: `Failed to reach endpoint: ${fetchErr?.message || 'Connection timed out'}`
        }
      };
    }
  }

  // Honest labeling for browser sandbox direct database simulation
  const latencyMs = Math.floor(Math.random() * 30) + 25;
  const detectedTables = getSuggestedTablesForDb(serverType, database);

  return {
    status: 200,
    data: {
      success: true,
      isSimulation: true,
      latencyMs,
      serverType: serverType || 'postgres',
      host: host || 'demo-warehouse.sandbox',
      database: database || 'production_db',
      ssl: body?.ssl !== false,
      message: `Verified demo sandbox profile for ${(serverType || 'DATABASE').toUpperCase()} (Database: "${database || 'main'}"). Native TCP wire protocols run in demo mode; connect via REST API for live production endpoints.`,
      availableTables: detectedTables
    }
  };
}

export async function handleFetch(body: any) {
  const {
    serverType = 'postgres',
    host,
    database,
    tableName = 'orders',
    query,
    restEndpoint,
    limit = 100
  } = body || {};

  // Real REST API Fetch with SSRF validation
  if (serverType === 'rest_api' && restEndpoint) {
    const ssrfCheck = await validateExternalUrlHardened(restEndpoint);
    if (!ssrfCheck.valid) {
      return { status: 400, data: { success: false, error: ssrfCheck.error } };
    }

    try {
      const fetchRes = await safeFetch(restEndpoint, {
        headers: body.headers || { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (!fetchRes.ok) {
        return {
          status: fetchRes.status,
          data: {
            success: false,
            error: `REST API responded with HTTP ${fetchRes.status}: ${fetchRes.statusText}`
          }
        };
      }

      const json = await fetchRes.json();
      let rows: any[] = [];
      if (Array.isArray(json)) {
        rows = json;
      } else if (json && typeof json === 'object') {
        const arrayProp = Object.values(json).find(v => Array.isArray(v)) as any[] | undefined;
        if (arrayProp) {
          rows = arrayProp;
        } else {
          rows = [json];
        }
      }

      const flattened = rows.slice(0, Number(limit) || 200).map((r) => {
        const flatRow: Record<string, any> = {};
        for (const [k, v] of Object.entries(r)) {
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            for (const [subK, subV] of Object.entries(v)) {
              flatRow[`${k}_${subK}`] = subV;
            }
          } else {
            flatRow[k] = v;
          }
        }
        return flatRow;
      });

      return {
        status: 200,
        data: {
          success: true,
          isSimulation: false,
          source: 'rest_api',
          tableName: 'Live_REST_Data',
          rowCount: flattened.length,
          rows: flattened,
          timestamp: new Date().toISOString()
        }
      };
    } catch (apiErr: any) {
      return {
        status: 502,
        data: {
          success: false,
          error: `Failed to fetch from REST endpoint: ${apiErr?.message || 'Network error'}`
        }
      };
    }
  }

  // Honest labeling for simulated database demo stream
  const liveData = generateLiveDatabaseStream(serverType, tableName, query, Number(limit) || 120);

  return {
    status: 200,
    data: {
      success: true,
      isSimulation: true,
      source: `${serverType} (Simulated Demo Stream)`,
      host: host || 'demo-warehouse.sandbox',
      database: database || 'production_warehouse',
      tableName: tableName || 'Fact_LiveStream',
      rowCount: liveData.length,
      rows: liveData,
      timestamp: new Date().toISOString(),
      queryExecuted: query || `SELECT * FROM ${tableName} ORDER BY timestamp DESC LIMIT ${limit};`,
      disclaimer: 'Browser sandbox demo data: native TCP database protocols utilize simulated transactional records.'
    }
  };
}

export async function handleInterpret(body: any, clientIp: string, idToken?: string) {
  if (!checkRateLimit(clientIp, 30, 60000)) {
    return {
      status: 429,
      data: { error: 'Rate limit exceeded. Maximum 30 requests per minute.' }
    };
  }

  const { prompt, analyticalContext, mode } = body || {};
  if (!prompt || !analyticalContext) {
    return {
      status: 400,
      data: { error: 'Missing prompt or analytical context.' }
    };
  }

  // Check request size
  if (JSON.stringify(analyticalContext).length > 2 * 1024 * 1024) {
    return {
      status: 413,
      data: { error: 'Analytical context payload exceeds 2MB limit.' }
    };
  }

  try {
    const result = await interpretAnalyticalData(prompt, analyticalContext, mode, idToken);
    return {
      status: 200,
      data: result
    };
  } catch (err: any) {
    return {
      status: 500,
      data: { error: err.message || 'Failed to interpret data' }
    };
  }
}
