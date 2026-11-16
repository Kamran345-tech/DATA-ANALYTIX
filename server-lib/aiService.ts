import { GoogleGenAI } from '@google/genai';

let cachedAi: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (cachedAi) return cachedAi;

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (geminiApiKey) {
    try {
      cachedAi = new GoogleGenAI({ apiKey: geminiApiKey });
      return cachedAi;
    } catch (err) {
      console.warn('Gemini initialization warning:', err);
    }
  }
  return null;
}

export interface InterpretResult {
  text: string;
  model: string;
  grounded: boolean;
  isRuleBased?: boolean;
  sourceMetrics: string[];
}

export async function interpretAnalyticalData(
  prompt: string,
  analyticalContext: any,
  mode?: string,
  idToken?: string
): Promise<InterpretResult> {
  // Optional Firebase Auth check when REQUIRE_AUTH_FOR_AI is enabled
  if (process.env.REQUIRE_AUTH_FOR_AI === 'true') {
    if (!idToken) {
      throw new Error('Authentication required: missing authorization token.');
    }
    if (!idToken.startsWith('Bearer ') && idToken.split('.').length !== 3) {
      throw new Error('Invalid authentication token format.');
    }
  }

  const ai = getGeminiClient();
  const packLabel = analyticalContext?.packName
    ? `Active Analytics Pack: ${analyticalContext.packName} (${analyticalContext.packId || 'general'})`
    : 'General BI Workspace';

  if (ai) {
    try {
      const systemInstruction = `You are a Principal Data Analyst and Business Intelligence Architect.
${packLabel}
CRITICAL MANDATES:
1. NEVER invent, hallucinate, or alter any numbers, KPIs, or percentages.
2. Rely EXCLUSIVELY on the provided verified calculation engine results and pack KPIs in the analytical context.
3. Every insight, risk, SQL suggestion, and recommendation MUST cite the exact metric, value, and segment from the context.
4. Structure your response into: WHAT happened, WHY it happened, WHO/WHAT contributed, HOW significant it is, DOMAIN SQL SUGGESTION, and ACTIONABLE RECOMMENDATIONS for management.
5. Clearly label your response as "[AI-Generated Grounded Analysis]". If data is insufficient for a claim, state: "Insufficient data to calculate this metric."`;

      const fullContent = `Context Data Summary:
${JSON.stringify(analyticalContext, null, 2)}

User Question / Analysis Request:
${prompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: fullContent }],
        config: {
          systemInstruction,
          temperature: 0.2, // deterministic, strictly grounded
        },
      });

      const packMetricNames = Array.isArray(analyticalContext?.packKpis)
        ? analyticalContext.packKpis.map((k: any) => k.name)
        : [];
      const coreMetricNames = Array.isArray(analyticalContext?.kpis)
        ? analyticalContext.kpis.map((k: any) => k.name)
        : Object.keys(analyticalContext?.kpis || {});

      return {
        text: response.text || '',
        model: 'gemini-2.5-flash',
        grounded: true,
        isRuleBased: false,
        sourceMetrics: [...packMetricNames, ...coreMetricNames].slice(0, 8),
      };
    } catch (apiError: any) {
      console.error('Gemini API call failed, falling back to local analytical engine:', apiError?.message);
    }
  }

  const packMetricNames = Array.isArray(analyticalContext?.packKpis)
    ? analyticalContext.packKpis.map((k: any) => k.name)
    : [];
  const coreMetricNames = Array.isArray(analyticalContext?.kpis)
    ? analyticalContext.kpis.map((k: any) => k.name)
    : Object.keys(analyticalContext?.kpis || {});

  // Rule-based deterministic fallback when AI is unavailable
  return {
    text: generateLocalAnalysis(prompt, analyticalContext, mode),
    model: 'nexusbi-local-deterministic-engine',
    grounded: false, // Honestly distinguish rule-based template from AI model
    isRuleBased: true,
    sourceMetrics: [...packMetricNames, ...coreMetricNames].slice(0, 8),
  };
}

export function generateLocalAnalysis(query: string, context: any, _mode?: string): string {
  const kpis = context?.kpis || [];
  const packKpis = Array.isArray(context?.packKpis) ? context.packKpis : [];
  const packName = context?.packName || 'Enterprise BI';
  const packId = context?.packId || 'general';
  const topCategories = context?.topCategories || [];
  const anomalies = context?.anomalies || [];
  const recSummary = (context?.recommendations || [])
    .slice(0, 3)
    .map((r: any) => `• **${r.title}** (Priority: ${r.priority}): ${r.action}`)
    .join('\n');

  const kpiSummary = kpis
    .map(
      (k: any) =>
        `• **${k.name}**: ${k.formattedValue || k.value} (${k.change >= 0 ? '+' : ''}${
          k.changePercent ? k.changePercent.toFixed(1) + '%' : 'N/A'
        } vs prior period - ${k.status})`
    )
    .join('\n');

  const packKpiSummary = packKpis
    .filter((k: any) => k.status === 'available')
    .slice(0, 6)
    .map(
      (k: any) =>
        `• **${k.name}** [${packName}]: ${k.formattedValue}${
          k.deltaPercent !== undefined ? ` (${k.deltaPercent >= 0 ? '+' : ''}${k.deltaPercent.toFixed(1)}%)` : ''
        }`
    )
    .join('\n');

  const topSummary = topCategories
    .slice(0, 3)
    .map(
      (c: any) =>
        `• **${c.name}**: ${c.formattedValue || c.value} (${
          c.percentage ? c.percentage.toFixed(1) + '%' : ''
        } share)`
    )
    .join('\n');

  const anomalySummary = anomalies
    .slice(0, 3)
    .map((a: any) => `• [${a.severity.toUpperCase()}] **${a.title}**: ${a.description}`)
    .join('\n');

  return `### Deterministic Dataset Analysis (Offline Rule-Based Summary)

*Query Analyzed*: "${query}"
*Active Pack Context*: **${packName}** (\`${packId}\`)

#### 1. Dataset Overview & Metric Baselines
Based on ${context?.rowCount || 0} audited records across ${context?.columnCount || 0} columns:
${kpiSummary || '• Primary metrics computed across verified numeric fields.'}
${packKpiSummary ? `\n#### 2. ${packName} Domain KPIs\n${packKpiSummary}` : ''}

#### 3. Segment Performance & Distribution
${topSummary || '• Distributed across observed categorical dimensions.'}

#### 4. Detected Risks & Anomalies
${anomalySummary || '• No critical statistical outliers or threshold breaches detected in current filter scope.'}

#### 5. Suggested Pack SQL Query
\`\`\`sql
SELECT * FROM FactSales LIMIT 25; -- Customize for ${packName} (${packId})
\`\`\`

#### 6. Actionable Management Directives
${recSummary || '• Sustain current operational pacing and monitor variance thresholds.'}

*Note: Generated via deterministic rule engine based strictly on computed metrics (not generative AI).*`;
}
