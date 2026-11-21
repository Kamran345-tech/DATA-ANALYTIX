import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Layers,
  ArrowUpRight,
  Clock,
  BarChart3,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { loadFeatureFlags } from '../../config/features';
import { PageHeader } from '../common/PageHeader';
import { EmptyDatasetState } from '../common/ViewStateBoundary';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  grounded?: boolean;
  isRuleBased?: boolean;
  sourceMetrics?: string[];
  packName?: string;
}

interface RecentAnswerEntry {
  id: string;
  question: string;
  summary: string;
  packName: string;
  metricBadge: string;
  timestamp: string;
}

const RECENT_AI_ANSWERS_KEY = 'dataanalytix_recent_ai_answers';

export const AskDataAIView: React.FC = () => {
  const { analytics, project, cleanRows, columns, activePackId, setCurrentTab, loadDemoDataset } = usePlatform();
  const flags = loadFeatureFlags();
  const [packContext, setPackContext] = useState<{
    packId: string;
    packName: string;
    kpis: { id: string; name: string; formattedValue: string; status: string; deltaPercent?: number }[];
  } | null>(null);

  useEffect(() => {
    if (!flags.analyticsPacks || columns.length === 0) return;
    let cancelled = false;
    import('../../analytics').then(mod => {
      if (cancelled) return;
      const pack = mod.getPackById(activePackId);
      const dsId = project?.id || project?.name || 'default';
      const persisted = mod.getPersistedPackRoleMap(dsId, pack.id);
      const roleMap = mod.mapRoles({ columns, rows: cleanRows, datasetId: dsId }, pack, persisted);
      const kpis = mod.computeKpis(pack, cleanRows, roleMap);
      setPackContext({
        packId: pack.id,
        packName: pack.name,
        kpis: kpis.map(k => ({
          id: k.id,
          name: k.label,
          formattedValue: k.formattedValue,
          status: k.status,
          deltaPercent: k.changePercent ?? undefined,
        })),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [flags.analyticsPacks, activePackId, columns, cleanRows, project?.id, project?.name]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your Data Analytix Principal Data Intelligence Assistant. I am strictly grounded in the verified metrics calculated from your **${project.name}** dataset (${cleanRows.length.toLocaleString()} rows).\n\nSelect a pack-aware prompt card below or ask any question about revenue drivers, domain pack KPIs, SQL queries, statistical anomalies, or management action items.`,
      timestamp: new Date().toLocaleTimeString(),
      grounded: true,
      isRuleBased: false,
      sourceMetrics: ['Total Volume', 'Quality Score'],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const availablePackKpis = useMemo(
    () => (packContext?.kpis || []).filter(k => k.status === 'available'),
    [packContext]
  );

  const primaryKpi = availablePackKpis[0] || {
    name: analytics.kpis[0]?.name || 'Total Volume',
    formattedValue: analytics.kpis[0]?.formattedValue || `${cleanRows.length.toLocaleString()} rows`,
  };
  const secondaryKpi = availablePackKpis[1] || {
    name: analytics.kpis[1]?.name || 'Active Columns',
    formattedValue: analytics.kpis[1]?.formattedValue || `${columns.length} fields`,
  };
  const activePackLabel = packContext?.packName || 'Enterprise BI';

  const packPromptCards = useMemo(
    () => [
      {
        id: 'kpi-drivers',
        category: `${activePackLabel} · Driver Analysis`,
        title: `Explain ${primaryKpi.name} performance`,
        question: `What drove ${primaryKpi.name} (${primaryKpi.formattedValue}) and how does performance compare across top segments?`,
        livePreview: `${primaryKpi.name}: ${primaryKpi.formattedValue}`,
        icon: BarChart3,
      },
      {
        id: 'pack-sql',
        category: `${activePackLabel} · KPI & SQL Audit`,
        title: 'Summarize active pack KPIs & SQL',
        question: `Summarize the active ${activePackLabel} KPIs and recommend verification SQL queries.`,
        livePreview: `${availablePackKpis.length || analytics.kpis.length} verified KPIs active`,
        icon: Terminal,
      },
      {
        id: 'anomaly-risk',
        category: 'Statistical Diagnostics · Risk Scan',
        title: 'Detect anomalies & margin leaks',
        question: 'What are the biggest statistical risks or anomalies in this dataset?',
        livePreview:
          analytics.anomalies.length > 0
            ? `${analytics.anomalies.length} statistical alert(s) flagged`
            : `${secondaryKpi.name}: ${secondaryKpi.formattedValue}`,
        icon: AlertTriangle,
      },
      {
        id: 'exec-actions',
        category: 'Executive Briefing · Action Plan',
        title: 'Recommend management actions',
        question: 'What specific actions should management take next based on our verified KPIs?',
        livePreview: `${cleanRows.length.toLocaleString()} audited rows · ${columns.length} columns`,
        icon: Sparkles,
      },
    ],
    [activePackLabel, primaryKpi, secondaryKpi, availablePackKpis.length, analytics.kpis.length, analytics.anomalies.length, cleanRows.length, columns.length]
  );

  const defaultRecentAnswers: RecentAnswerEntry[] = useMemo(
    () => [
      {
        id: 'seed-1',
        question: `Headline ${activePackLabel} benchmark`,
        summary: `${primaryKpi.name} stands at ${primaryKpi.formattedValue} across ${cleanRows.length.toLocaleString()} validated records in ${project.name}.`,
        packName: activePackLabel,
        metricBadge: `${primaryKpi.name}: ${primaryKpi.formattedValue}`,
        timestamp: 'Verified Snapshot',
      },
      {
        id: 'seed-2',
        question: `Secondary KPI & variance check`,
        summary: `${secondaryKpi.name} is ${secondaryKpi.formattedValue}. ${
          analytics.anomalies.length > 0
            ? `Top diagnostic alert: ${analytics.anomalies[0].title}.`
            : 'No severe distribution anomalies detected in current slice.'
        }`,
        packName: activePackLabel,
        metricBadge: `${secondaryKpi.name}: ${secondaryKpi.formattedValue}`,
        timestamp: 'Deterministic Engine',
      },
    ],
    [activePackLabel, primaryKpi, secondaryKpi, cleanRows.length, project.name, analytics.anomalies]
  );

  const [storedRecentAnswers, setStoredRecentAnswers] = useState<RecentAnswerEntry[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_AI_ANSWERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 4);
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const displayedRecentAnswers = storedRecentAnswers.length > 0 ? storedRecentAnswers : defaultRecentAnswers;

  const recordRecentAnswer = (question: string, answerText: string) => {
    const cleanSummary = answerText
      .replace(/[#*_`>-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const entry: RecentAnswerEntry = {
      id: `ans-${Date.now()}`,
      question,
      summary: cleanSummary.length >= 160 ? `${cleanSummary}...` : cleanSummary,
      packName: activePackLabel,
      metricBadge: `${primaryKpi.name}: ${primaryKpi.formattedValue}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const next = [entry, ...storedRecentAnswers.filter(a => a.question !== question)].slice(0, 4);
    setStoredRecentAnswers(next);
    try {
      localStorage.setItem(RECENT_AI_ANSWERS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const handleSend = async (questionText?: string) => {
    const query = questionText || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const analyticalContext = {
        projectName: project.name,
        rowCount: cleanRows.length,
        columnCount: columns.length,
        packId: packContext?.packId || activePackId,
        packName: packContext?.packName,
        packKpis: packContext?.kpis || [],
        kpis: analytics.kpis,
        topCategories: Object.values(analytics.categoryPerformance)[0] || [],
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        recommendations: analytics.opportunities,
      };

      const res = await fetch('/api/ai/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, analyticalContext }),
      });

      const data = await res.json();
      const isAi = data.model === 'gemini-2.5-flash' && !data.isRuleBased;
      const responseText = data.text || 'Unable to interpret query.';
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString(),
        grounded: isAi,
        isRuleBased: Boolean(data.isRuleBased || !isAi),
        sourceMetrics: data.sourceMetrics || ['Verified Metric Engine'],
        packName: packContext?.packName,
      };

      setMessages(prev => [...prev, assistantMsg]);
      recordRecentAnswer(query, responseText);
    } catch (err: any) {
      const packKpiLine =
        packContext && packContext.kpis.length > 0
          ? `\n- **${packContext.packName} KPIs**: ${packContext.kpis
              .filter(k => k.status === 'available')
              .slice(0, 4)
              .map(k => `${k.name}: ${k.formattedValue}`)
              .join(', ')}`
          : '';
      const fallbackText = `### Offline Deterministic Analysis (Rule-Based Engine)\n\n*Server note: Cloud AI endpoint unavailable (${err?.message || 'Offline mode'}). Displaying computed dataset metrics:*\n\n- **Audited Dataset**: ${cleanRows.length.toLocaleString()} active transaction records\n- **Verified Core KPIs**: ${analytics.kpis.slice(0, 3).map(k => `${k.name}: ${k.formattedValue}`).join(', ')}${packKpiLine}\n- **Risk Status**: ${analytics.anomalies.length > 0 ? analytics.anomalies[0].title : 'Normal operational variation'}\n\n*Source: Deterministic rule-based summary calculated directly from in-memory engine without generative extrapolation.*`;
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString(),
        grounded: false,
        isRuleBased: true,
        packName: packContext?.packName,
      };
      setMessages(prev => [...prev, fallbackMsg]);
      recordRecentAnswer(query, fallbackText);
    } finally {
      setLoading(false);
    }
  };

  if (cleanRows.length === 0) {
    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        <PageHeader pageId="ai_insights" />
        <EmptyDatasetState
          title="Load a dataset to query Ask Your Data AI"
          description="Ask Your Data AI requires verified dataset metrics so every response cites real numbers without hallucination."
          onLoadSample={() => loadDemoDataset('sales')}
          onUploadFile={() => setCurrentTab('upload')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-4xl mx-auto">
      {/* Shared PageHeader (Design System v3) or Classic Header */}
      {flags.designSystemV3 ? (
        <PageHeader
          pageId="ai_insights"
          badge={
            <div className="flex flex-wrap items-center gap-2">
              {flags.analyticsPacks && packContext && (
                <div
                  data-testid="ai-pack-context-badge"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-elevated text-primary border border-subtle text-xs font-mono"
                >
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  <span>Pack: {packContext.packName}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-accent-soft text-accent border border-subtle text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5" /> Anti-Hallucination Active
              </div>
            </div>
          }
          primaryAction={{
            label: 'Summarize Active Pack',
            onClick: () => handleSend(packPromptCards[1].question),
            icon: <Sparkles className="w-3.5 h-3.5" />,
          }}
        />
      ) : (
        <div className="bg-card border border-subtle rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent font-mono">
              <Sparkles className="w-4 h-4" /> Grounded Analytical Reasoning
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary tracking-wide uppercase">
              ASK YOUR DATA AI
            </h1>
            <p className="text-xs text-secondary">
              Ask complex business questions. Responses strictly cite verified numbers from the semantic calculation engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {flags.analyticsPacks && packContext && (
              <div
                data-testid="ai-pack-context-badge"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated text-primary border border-subtle text-xs font-mono"
              >
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span>Pack: {packContext.packName}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-soft text-accent border border-subtle text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> Anti-Hallucination Active
            </div>
          </div>
        </div>
      )}

      {/* Pack-Aware Example Prompt Cards (2x2 Grid) — Phase 3.4 */}
      <section aria-label="Pack-aware example prompts" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-semibold text-secondary">
            Pack-Aware Example Prompts ({activePackLabel})
          </span>
          <span className="text-xs font-mono text-muted">
            Click any card to run grounded analysis
          </span>
        </div>

        <div
          data-testid="ai-example-prompt-cards"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {packPromptCards.map(card => {
            const IconComp = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                data-testid={`ai-prompt-card-${card.id}`}
                onClick={() => handleSend(card.question)}
                disabled={loading}
                className="p-4 rounded-2xl bg-card hover:bg-card-hover border border-subtle hover:border-strong transition-all text-left cursor-pointer group flex flex-col justify-between gap-2.5 shadow-xs"
              >
                <div className="space-y-1.5 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-accent font-semibold flex items-center gap-1.5">
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span>{card.category}</span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors shrink-0" />
                  </div>
                  <div className="font-heading text-sm font-bold text-primary">
                    {card.title}
                  </div>
                  <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
                    &ldquo;{card.question}&rdquo;
                  </p>
                </div>

                <div className="pt-2 border-t border-subtle flex items-center justify-between gap-2 w-full">
                  <span className="text-xs font-mono text-muted">Grounded Context</span>
                  <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded-md bg-elevated border border-subtle truncate max-w-[220px]">
                    {card.livePreview}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Verified Answers Strip — Phase 3.4 */}
      <section
        data-testid="ai-recent-answers"
        aria-label="Recent verified answers"
        className="rounded-2xl bg-card border border-subtle p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-primary">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>Recent Verified Answers &amp; Grounded Takeaways</span>
          </div>
          <span className="text-xs font-mono text-muted">
            {project.name} · {cleanRows.length.toLocaleString()} rows
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayedRecentAnswers.slice(0, 2).map(ans => (
            <div
              key={ans.id}
              data-testid="ai-recent-answer-card"
              className="p-3.5 rounded-xl bg-input border border-subtle space-y-1.5 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-primary truncate">
                    {ans.question}
                  </span>
                  <span className="text-xs font-mono text-accent shrink-0">
                    [{ans.packName}]
                  </span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  {ans.summary}
                </p>
              </div>
              <div className="pt-1.5 flex items-center justify-between gap-2 text-xs font-mono text-muted">
                <span>{ans.metricBadge}</span>
                <button
                  type="button"
                  onClick={() => handleSend(ans.question)}
                  className="text-accent hover:underline font-semibold cursor-pointer"
                >
                  Re-run query →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chat Thread */}
      <div className="bg-card border border-subtle rounded-3xl p-5 min-h-[320px] max-h-[520px] overflow-y-auto space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 text-sm leading-relaxed ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-accent-soft border border-subtle text-accent flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-4 rounded-2xl max-w-2xl space-y-2 ${
                msg.sender === 'user'
                  ? 'bg-accent text-on-accent font-medium'
                  : 'bg-elevated/60 text-primary border border-subtle'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{msg.text}</div>

              {msg.sender === 'assistant' && (
                <div className="pt-2 border-t border-subtle flex flex-wrap items-center justify-between gap-2 text-xs text-secondary font-mono">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span>
                      {msg.grounded
                        ? `AI-Generated · Grounded in ${project.name}`
                        : `Rule-Based Deterministic Engine · ${project.name}`}
                    </span>
                  </span>
                  {msg.packName && <span className="text-accent">[{msg.packName}]</span>}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-elevated text-secondary flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs font-mono text-accent p-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Querying verified semantic model &amp; formulating management explanation...</span>
          </div>
        )}
      </div>

      {/* Input box */}
      <div className="flex gap-2">
        <label htmlFor="ask-data-ai-input" className="sr-only">
          Ask a question about your dataset
        </label>
        <input
          id="ask-data-ai-input"
          type="text"
          placeholder="Ask anything about trends, pack KPIs, SQL queries, or recommendations..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-card text-sm text-primary px-4 py-3 rounded-2xl border border-subtle focus:outline-none focus:border-strong"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="min-h-[44px] px-6 py-3 rounded-2xl bg-accent text-on-accent font-semibold text-xs hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Ask</span>
        </button>
      </div>
    </div>
  );
};
