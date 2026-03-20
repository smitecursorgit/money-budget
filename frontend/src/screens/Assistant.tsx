import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send } from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { assistantApi, type ChatMessage } from '../api/client.ts';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
};

const EXAMPLE_QUESTIONS = [
  'Что сделать, чтобы тратить меньше?',
  'Куда я больше всего трачу денег?',
  'Как увеличить бюджет?',
  'Стоит ли мне откладывать больше?',
];

export function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading) return;

      const userMsg: ChatMessage = { role: 'user', content: text };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput('');
      setError(null);
      setLoading(true);

      try {
        const { data } = await assistantApi.chat(next);
        setMessages([...next, { role: 'assistant', content: data.reply }]);
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { error?: string } }; message?: string };
        setError(ax.response?.data?.error || ax.message || 'Не удалось получить ответ');
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  return (
    <div
      className="page-scroll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      <motion.div {...fadeUp} style={{ paddingTop: '24px', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(102,187,106,0.22) 0%, rgba(255,255,255,0.08) 100%)',
              border: '1px solid rgba(102,187,106,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={24} color="var(--income)" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>Помощник</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Анализ финансов и советы (Groq / Llama)
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ delay: 0.05, ...fadeUp.transition }}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <Card padding="lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '14px' }}>
            Спросите о бюджете, тратах и привычках — ответит языковая модель. Конкретные суммы из приложения в чат не
            подставляются: для точных цифр смотрите статистику и операции.
          </p>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '10px',
            }}
          >
            Примеры вопросов
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {EXAMPLE_QUESTIONS.map((q, i) => (
              <motion.button
                key={q}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
                onClick={() => void send(q)}
                disabled={loading}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-panel)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                  textAlign: 'left',
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                «{q}»
              </motion.button>
            ))}
          </div>
        </Card>

        <p className="section-title" style={{ padding: '0 4px', marginTop: '8px' }}>
          Чат
        </p>

        <motion.div
          {...fadeUp}
          transition={{ delay: 0.1, ...fadeUp.transition }}
          style={{ marginTop: '2px' }}
        >
          <Card
            padding="lg"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <div
              ref={scrollRef}
              style={{
                maxHeight: 'min(48vh, 380px)',
                minHeight: messages.length ? 120 : 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                paddingRight: 4,
              }}
            >
              {messages.length === 0 && !loading && (
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>
                  Напишите сообщение ниже или нажмите пример выше.
                </p>
              )}
              {messages.map((m, idx) => (
                <div
                  key={`${idx}-${m.role}-${m.content.slice(0, 24)}`}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '92%',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    background:
                      m.role === 'user'
                        ? 'rgba(102, 187, 106, 0.18)'
                        : 'var(--bg-surface)',
                    border:
                      m.role === 'user'
                        ? '1px solid rgba(102, 187, 106, 0.28)'
                        : '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                    padding: '6px 0',
                  }}
                >
                  Печатает…
                </div>
              )}
            </div>

            {error ? (
              <p style={{ fontSize: '12px', color: '#ef5350', margin: 0 }}>{error}</p>
            ) : null}

            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                void send(input);
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'calc(var(--radius-panel) - 4px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите вопрос помощнику…"
                  disabled={loading}
                  autoComplete="off"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Отправить"
                  style={{
                    flexShrink: 0,
                    width: 44,
                    height: 44,
                    borderRadius: '14px',
                    border: 'none',
                    background:
                      loading || !input.trim()
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(102, 187, 106, 0.35)',
                    color: loading || !input.trim() ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send size={20} />
                </button>
              </div>
            </form>

            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                textAlign: 'center',
                margin: 0,
                opacity: 0.85,
                lineHeight: 1.4,
              }}
            >
              Ответы носят справочный характер, не являются финансовой или юридической рекомендацией.
            </p>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
