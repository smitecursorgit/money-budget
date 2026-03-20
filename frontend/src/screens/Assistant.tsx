import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send } from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';

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
              Анализ финансов и советы
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
            Здесь появится чат с ИИ: можно будет задавать вопросы о тратах, доходах и планах — помощник подскажет,
            куда смотреть в статистике и что изменить в привычках.
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
              <motion.div
                key={q}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-panel)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  «{q}»
                </div>
              </motion.div>
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
              gap: '14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.5, margin: 0 }}>
              Подключим нейросеть чуть позже — здесь появится переписка с помощником.
            </p>

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
                readOnly
                placeholder="Напишите вопрос помощнику…"
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
                type="button"
                disabled
                aria-label="Отправить (скоро)"
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: '14px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'not-allowed',
                }}
              >
                <Send size={20} />
              </button>
            </div>

            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                textAlign: 'center',
                margin: 0,
                opacity: 0.9,
              }}
            >
              Скоро можно будет отправлять сообщения
            </p>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
