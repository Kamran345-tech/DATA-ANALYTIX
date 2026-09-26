import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Gemini if API key is provided
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  let ai: GoogleGenAI | null = null;
  if (geminiApiKey) {
    try {
      ai = new GoogleGenAI({ apiKey: geminiApiKey });
    } catch (err) {
      console.warn('Gemini initialization warning:', err);
    }
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      capabilities: {
        geminiConfigured: !!ai,
        inMemoryAnalytics: true,
        exportEngines: ['xlsx', 'pbip', 'json', 'csv', 'dax', 'sql', 'python']
      }
    });
  });

  // AI Interpretation API grounded in calculated data
  app.post('/api/ai/interpret', async (req, res) => {
    try {
      const { prompt, analyticalContext, mode } = req.body;
      if (!prompt || !analyticalContext) {
        return res.status(400).json({ error: 'Missing prompt or analytical context.' });
      }

      if (ai) {
        try {
          const systemInstruction = `You are a Principal Data Analyst and Business Intelligence Architect at NexusBI.
CRITICAL MANDATES:
1. NEVER invent, hallucinate, or alter any numbers, KPIs, or percentages.
2. Rely EXCLUSIVELY on the provided verified calculation engine results in the analytical context.
3. Every insight, risk, and recommendation MUST cite the exact metric, value, and segment from the context.
4. Structure your response into: WHAT happened, WHY it happened, WHO/WHAT contributed, HOW significant it is, and ACTIONABLE RECOMMENDATIONS for management.
5. If data is insufficient for a claim, state: "Insufficient data to calculate this metric."`;

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
            }
          });

          return res.json({
            text: response.text || '',
            model: 'gemini-2.5-flash',
            grounded: true,
            sourceMetrics: Object.keys(analyticalContext.kpis || {})
          });
        } catch (apiError: any) {
          console.error('Gemini API call failed, falling back to local analytical engine:', apiError?.message);
        }
      }

      // High-precision local rule-based analytical engine response
      return res.json({
        text: generateLocalAnalysis(prompt, analyticalContext, mode),
        model: 'nexusbi-local-deterministic-engine',
        grounded: true,
        sourceMetrics: Object.keys(analyticalContext.kpis || {})
      });
    } catch (error: any) {
      console.error('AI interpret endpoint error:', error);
      res.status(500).json({ error: error.message || 'Failed to interpret data' });
    }
  });

  // Setup Vite in middleware mode for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`NexusBI Data Analyst Server running on http://0.0.0.0:${port}`);
  });
}

function generateLocalAnalysis(query: string, context: any, mode?: string): string {
  const kpis = context.kpis || [];
  const topCategories = context.topCategories || [];
  const anomalies = context.anomalies || [];
  const trends = context.trends || [];
  const recommendations = context.recommendations || [];

  let kpiSummary = kpis.map((k: any) => `• **${k.name}**: ${k.formattedValue || k.value} (${k.change >= 0 ? '+' : ''}${k.changePercent ? k.changePercent.toFixed(1) + '%' : 'N/A'} vs prior period - ${k.status})`).join('\n');
  let topSummary = topCategories.slice(0, 3).map((c: any) => `• **${c.name}**: ${c.formattedValue || c.value} (${c.percentage ? c.percentage.toFixed(1) + '%' : ''} share)`).join('\n');
  let anomalySummary = anomalies.slice(0, 3).map((a: any) => `• [${a.severity.toUpperCase()}] **${a.title}**: ${a.description}`).join('\n');
  let recSummary = recommendations.slice(0, 3).map((r: any) => `• **${r.title}** (Priority: ${r.priority}): ${r.action}`).join('\n');

  return `### Verified Analytical Synthesis

#### 1. What is Happening?
Based on the exact ingested dataset (${context.rowCount || 0} rows, ${context.columnCount || 0} columns):
${kpiSummary || '• Key metrics computed across valid numeric observations.'}

#### 2. Segment Performance & Drivers
${topSummary || '• Distributed across observed categorical dimensions.'}

#### 3. Detected Risks & Anomalies
${anomalySummary || '• No critical statistical outliers or threshold breaches detected in current filter scope.'}

#### 4. Actionable Management Directives
${recSummary || '• Maintain ongoing cadence and monitor primary conversion and volume variance.'}

*Source of Truth: Analytical metrics computed directly from uploaded dataset without extrapolation.*`;
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
