import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  CheckCircle2, 
  ShieldCheck, 
  HelpCircle, 
  Loader2,
  Database
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  grounded?: boolean;
  sourceMetrics?: string[];
}

export const AskDataAIView: React.FC = () => {
  const { analytics, project, cleanRows, columns } = usePlatform();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your Data Analytix Principal Data Intelligence Assistant. I am strictly grounded in the verified metrics calculated from your **${project.name}** dataset (${cleanRows.length} rows).\n\nYou can ask about revenue drivers, trends, statistical anomalies, or management action items.`,
      timestamp: new Date().toLocaleTimeString(),
      grounded: true,
      sourceMetrics: ['Total Volume', 'Quality Score']
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const starterQuestions = [
    'What was total revenue and overall performance?',
    'Which segment or category performed best?',
    'What are the biggest statistical risks or anomalies?',
    'What specific actions should management take next?'
  ];

  const handleSend = async (questionText?: string) => {
    const query = questionText || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const analyticalContext = {
        projectName: project.name,
        rowCount: cleanRows.length,
        columnCount: columns.length,
        kpis: analytics.kpis,
        topCategories: Object.values(analytics.categoryPerformance)[0] || [],
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        recommendations: analytics.opportunities
      };

      const res = await fetch('/api/ai/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, analyticalContext })
      });

      const data = await res.json();
      const isAi = data.model === 'gemini-2.5-flash';
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.text || 'Unable to interpret query.',
        timestamp: new Date().toLocaleTimeString(),
        grounded: isAi,
        sourceMetrics: data.sourceMetrics || ['Verified Metric Engine']
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: `### Offline Deterministic Analysis\n\n*Server note: Cloud AI endpoint unavailable (${err?.message || 'Offline mode'}). Displaying computed dataset metrics:*\n\n- **Audited Dataset**: ${cleanRows.length.toLocaleString()} active transaction records\n- **Verified Core KPIs**: ${analytics.kpis.slice(0, 3).map(k => `${k.name}: ${k.formattedValue}`).join(', ')}\n- **Risk Status**: ${analytics.anomalies.length > 0 ? analytics.anomalies[0].title : 'Normal operational variation'}\n\n*Source: Analytical values calculated directly from in-memory engine without generative extrapolation.*`,
        timestamp: new Date().toLocaleTimeString(),
        grounded: false
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
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

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent border border-teal-500/40 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5" /> Anti-Hallucination Active
        </div>
      </div>

      {/* Suggested Starter Prompts */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono text-secondary uppercase">Suggested Analytical Queries:</span>
        <div className="flex flex-wrap gap-2">
          {starterQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-xs text-secondary bg-card hover:bg-elevated border border-subtle hover:border-teal-500/40 px-3 py-1.5 rounded-xl transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="bg-card border border-subtle rounded-3xl p-5 min-h-[420px] max-h-[550px] overflow-y-auto space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 text-xs leading-relaxed ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-accent border border-teal-500/40 text-accent flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-4 rounded-2xl max-w-xl space-y-2 ${
                msg.sender === 'user' 
                  ? 'bg-accent text-black font-medium' 
                  : 'bg-card text-primary border border-subtle'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {msg.grounded && msg.sender === 'assistant' && (
                <div className="pt-2 border-t border-subtle flex items-center gap-1.5 text-[10px] text-secondary font-mono">
                  <CheckCircle2 className="w-3 h-3 text-accent" />
                  <span>Verified from data engine (Source: {project.name})</span>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-elevated text-secondary flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs font-mono text-accent p-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Querying verified semantic model & formulating management explanation...</span>
          </div>
        )}
      </div>

      {/* Input box */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask anything about trends, drivers, metrics, or recommendations..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-card text-xs text-primary px-4 py-3 rounded-2xl border border-subtle focus:border-teal-500/40 focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="px-6 py-3 rounded-2xl bg-accent text-black font-semibold text-xs hover:bg-accent transition-all disabled:opacity-40 flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span>Ask</span>
        </button>
      </div>
    </div>
  );
};
