import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { ComputedAnalytics, SalesStarModel } from '../types/sales';
import { buildAssistantDatasetContext } from '../utils/assistantContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  error?: boolean;
}

interface AssistantPageProps {
  model: SalesStarModel;
  analytics: ComputedAnalytics;
  filterSummary: string;
}

const STARTER_PROMPTS = [
  'Which stores are underperforming and why?',
  'Compare total sales, orders, and AOV across 2024, 2025, and 2026',
  'How are discounts impacting net sales and units per order?',
  'Who are the top 5 salespeople by net sales and what are their discount rates?',
  'Compare In-Store vs Online sales and payment methods',
  'Which products generate the highest and lowest net sales?',
];

function renderFormattedLine(line: string, key: string): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <span key={key}>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-semibold text-[#1B2233]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={idx}
              className="px-1 py-0.5 rounded bg-[#F5F7FB] border border-[#E3E7EF] font-mono text-[11px] text-[#22308F]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
}

const AssistantMessageBody: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown table detection
    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|/.test(lines[i + 1])
    ) {
      const parseRow = (rowStr: string) =>
        rowStr
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseRow(trimmed);
      i += 2; // skip header & separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }

      blocks.push(
        <div key={`tbl-${i}`} className="overflow-x-auto my-2 rounded-lg border border-[#E3E7EF]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F5F7FB] border-b border-[#E3E7EF] text-[#5B6475]">
                {headers.map((h, hi) => (
                  <th key={hi} className="py-1.5 px-2.5 font-semibold whitespace-nowrap">
                    {renderFormattedLine(h, `th-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F6]">
              {rows.map((r, ri) => (
                <tr key={ri} className="hover:bg-[#FAFBFD]">
                  {headers.map((_, ci) => (
                    <td key={ci} className="py-1.5 px-2.5 text-[#1B2233] tabular-nums">
                      {renderFormattedLine(r[ci] ?? '', `td-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (/^#{1,4}\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^#{1,4}\s+/, '');
      blocks.push(
        <h4 key={`h-${i}`} className="text-xs sm:text-sm font-semibold text-[#22308F] pt-1">
          {renderFormattedLine(headingText, `ht-${i}`)}
        </h4>
      );
      i++;
      continue;
    }

    // Bullet lists
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1">
          {items.map((item, li) => (
            <li key={li} className="leading-relaxed">
              {renderFormattedLine(item, `li-${i}-${li}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1">
          {items.map((item, li) => (
            <li key={li} className="leading-relaxed">
              {renderFormattedLine(item, `oli-${i}-${li}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {renderFormattedLine(trimmed, `pt-${i}`)}
      </p>
    );
    i++;
  }

  return <div className="space-y-2 text-xs sm:text-sm text-[#1B2233]">{blocks}</div>;
};

export const AssistantPage: React.FC<AssistantPageProps> = ({
  model,
  analytics,
  filterSummary,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const sendQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text: question,
    };

    const historyForApi = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);
    setLastFailedQuestion(null);

    try {
      const datasetContext = buildAssistantDatasetContext(
        model,
        analytics,
        filterSummary,
        question
      );

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: historyForApi,
          datasetContext,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        answer?: string;
        error?: string;
      };

      if (!res.ok || !data.answer) {
        const errText =
          data.error || `Request failed with HTTP ${res.status}. Please try again.`;
        setLastFailedQuestion(question);
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            text: errText,
            error: true,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          text: data.answer!,
        },
      ]);
    } catch {
      setLastFailedQuestion(question);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: 'Network error contacting the AI Assistance endpoint. Check that the server is running and try again.',
          error: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion(input);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <section className="card-surface p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF1FB] text-[#22308F] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#22308F]">AI Assistance</h2>
            <p className="text-xs sm:text-sm text-[#5B6475] mt-0.5">
              Ask questions about <span className="font-medium text-[#1B2233]">{model.sheetName}</span>{' '}
              ({analytics.matchingCount.toLocaleString()} of {model.totalCount.toLocaleString()}{' '}
              transactions matching · {filterSummary}).
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setLastFailedQuestion(null);
            }}
            className="h-8 px-3 rounded-lg border border-[#E3E7EF] bg-white text-xs font-medium text-[#5B6475] hover:text-[#1B2233] hover:bg-[#F5F7FB] inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear chat</span>
          </button>
        )}
      </section>

      {/* Main Conversation Card */}
      <section className="card-surface flex flex-col min-h-[480px] max-h-[68vh]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center py-6 space-y-5">
              <div className="max-w-lg space-y-1.5">
                <p className="text-sm font-semibold text-[#1B2233]">
                  Ask anything about Metro Superstore sales, stores, discounts, or salespeople
                </p>
                <p className="text-xs text-[#5B6475]">
                  Responses are grounded directly in your active filters and the {model.totalCount.toLocaleString()} loaded transactions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl text-left">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendQuestion(prompt)}
                    disabled={isSending}
                    className="p-3 rounded-xl border border-[#E3E7EF] bg-[#FAFBFD] hover:bg-[#EEF1FB] hover:border-[#C5D0F0] text-xs font-medium text-[#1B2233] transition-colors text-left cursor-pointer disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      m.error
                        ? 'bg-[#FEF2F2] text-[#C8372D]'
                        : 'bg-[#EEF1FB] text-[#22308F]'
                    }`}
                  >
                    {m.error ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-[#22308F] text-white text-xs sm:text-sm'
                      : m.error
                        ? 'bg-[#FEF2F2] border border-[#F2C6C3] text-[#C8372D] text-xs sm:text-sm'
                        : 'bg-[#F5F7FB] border border-[#E3E7EF]'
                  }`}
                >
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  ) : m.error ? (
                    <div className="space-y-2">
                      <p className="font-medium">{m.text}</p>
                      {lastFailedQuestion && (
                        <button
                          type="button"
                          onClick={() => void sendQuestion(lastFailedQuestion)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8372D] hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <AssistantMessageBody text={m.text} />
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-[#22308F] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isSending && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF1FB] text-[#22308F] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-xl px-4 py-3 bg-[#F5F7FB] border border-[#E3E7EF] text-xs text-[#5B6475] animate-pulse">
                Analyzing dataset and generating response…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-3 sm:p-4 border-t border-[#E3E7EF] bg-white rounded-b-[14px]"
        >
          <div className="flex items-end gap-2">
            <label htmlFor="ai-assistant-input" className="sr-only">
              Ask a question about the Metro Superstore dataset
            </label>
            <textarea
              id="ai-assistant-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the dataset (e.g., Compare Ottawa vs Toronto in 2025, or look up MS-001762)…"
              disabled={isSending}
              className="flex-1 resize-none rounded-lg border border-[#E3E7EF] bg-[#F5F7FB] px-3 py-2 text-xs sm:text-sm text-[#1B2233] placeholder-[#5B6475] focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="h-10 px-4 rounded-lg bg-[#22308F] text-white text-xs sm:text-sm font-medium hover:bg-[#1a256f] disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
