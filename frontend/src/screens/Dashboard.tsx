import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card.tsx';
import { VoiceButton } from '../components/VoiceButton.tsx';
import { VoiceConfirmModal } from '../components/VoiceConfirmModal.tsx';
import { statsApi, transactionsApi, remindersApi } from '../api/client.ts';
import { useAppStore, useTransactionStore } from '../store/index.ts';
import { ParsedEntry, StatsSummary, Reminder, Transaction } from '../types/index.ts';
import { saveVoiceEntry } from '../utils/saveVoiceEntry.ts';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 260, damping: 24 },
};

export function Dashboard() {
  const { user, categories } = useAppStore();
  const { setTransactions } = useTransactionStore();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [voiceResult, setVoiceResult] = useState<{ transcription: string; parsed: ParsedEntry } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [summaryRes, txRes, remRes] = await Promise.all([
        statsApi.summary(),
        transactionsApi.list({ limit: 5 }),
        remindersApi.upcoming(7),
      ]);
      setSummary(summaryRes.data);
      setRecentTransactions(txRes.data.transactions);
      setTransactions(txRes.data.transactions, txRes.data.total);
      setUpcomingReminders(remRes.data.slice(0, 3));
    } catch {
      setError('Ошибка загрузки данных');
    }
  }, [setTransactions]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleVoiceConfirm = async (entry: ParsedEntry) => {
    await saveVoiceEntry(entry, categories);
    await loadData();
  };

  const currency = user?.currency || 'RUB';
  const fmt = (n: number) =>
    n.toLocaleString('ru', { style: 'currency', currency, maximumFractionDigits: 0 });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return 'Доброй ночи';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <div className="page" style={{ padding: '0 16px' }}>
      <motion.div {...fadeUp} style={{ paddingTop: '20px', paddingBottom: '8px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{greeting()}</p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginTop: '2px' }}>
          {user?.firstName || 'Привет!'}
        </h1>
      </motion.div>

      {error && (
        <motion.div {...fadeUp} style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', marginBottom: '12px', fontSize: '13px', color: 'var(--expense)' }}>
          {error}
        </motion.div>
      )}

      {/* Balance card */}
      <motion.div {...fadeUp} transition={{ delay: 0.05, ...fadeUp.transition }} style={{ marginBottom: '12px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(108,99,255,0.25), rgba(167,139,250,0.12))',
            border: '1px solid rgba(108,99,255,0.3)',
            borderRadius: '24px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'rgba(108,99,255,0.12)',
              filter: 'blur(30px)',
            }}
          />
          <p style={{ fontSize: '13px', color: 'rgba(240,240,245,0.5)', marginBottom: '8px' }}>
            Баланс за период
          </p>
          <p style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
            {summary ? fmt(summary.balance) : '—'}
          </p>
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <TrendingUp size={14} color="var(--income)" />
                <span style={{ fontSize: '12px', color: 'rgba(240,240,245,0.5)' }}>Доходы</span>
              </div>
              <p style={{ fontWeight: 700, color: 'var(--income)', fontSize: '16px' }}>
                {summary ? fmt(summary.income) : '—'}
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <TrendingDown size={14} color="var(--expense)" />
                <span style={{ fontSize: '12px', color: 'rgba(240,240,245,0.5)' }}>Расходы</span>
              </div>
              <p style={{ fontWeight: 700, color: 'var(--expense)', fontSize: '16px' }}>
                {summary ? fmt(summary.expense) : '—'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Voice button */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.1, ...fadeUp.transition }}
        style={{ marginBottom: '20px' }}
      >
        <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
            Голосовой ввод
          </p>
          <VoiceButton
            onResult={(t, p) => setVoiceResult({ transcription: t, parsed: p })}
            onError={(msg) => setError(msg)}
          />
        </Card>
      </motion.div>

      {/* Upcoming reminders */}
      {upcomingReminders.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.15, ...fadeUp.transition }} style={{ marginBottom: '20px' }}>
          <p className="section-title" style={{ padding: '0 4px' }}>Ближайшие платежи</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingReminders.map((r) => (
              <Card key={r.id} padding="md" onClick={() => navigate('/reminders')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        background: 'rgba(245,158,11,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      🔔
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>{r.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {new Date(r.nextDate).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  {r.amount && (
                    <p style={{ fontWeight: 700, color: 'var(--expense)' }}>
                      {fmt(r.amount)}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent transactions */}
      <motion.div {...fadeUp} transition={{ delay: 0.2, ...fadeUp.transition }} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
          <p className="section-title" style={{ padding: 0, margin: 0 }}>Последние операции</p>
          <button
            onClick={() => navigate('/transactions')}
            style={{ background: 'none', color: 'var(--accent-light)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '2px' }}
          >
            Все <ChevronRight size={14} />
          </button>
        </div>
        {recentTransactions.length === 0 ? (
          <Card padding="lg" style={{ textAlign: 'center' }}>
            <Wallet size={28} color="rgba(240,240,245,0.2)" style={{ margin: '0 auto 8px' }} />
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
              Ещё нет операций. Попробуй голосовой ввод!
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentTransactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} fmt={fmt} />
            ))}
          </div>
        )}
      </motion.div>

      {voiceResult && (
        <VoiceConfirmModal
          transcription={voiceResult.transcription}
          parsed={voiceResult.parsed}
          categories={categories}
          onConfirm={handleVoiceConfirm}
          onClose={() => setVoiceResult(null)}
        />
      )}
    </div>
  );
}

function TransactionRow({ transaction: t, fmt }: { transaction: Transaction; fmt: (n: number) => string }) {
  const icon = t.category?.icon || '📦';
  const color = t.category?.color || '#71717a';

  return (
    <Card padding="md">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '11px',
              background: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div>
            <p style={{ fontWeight: 500, fontSize: '14px' }}>
              {t.category?.name || t.note || 'Без категории'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {new Date(t.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        <p
          style={{
            fontWeight: 700,
            fontSize: '15px',
            color: t.type === 'income' ? 'var(--income)' : 'var(--expense)',
          }}
        >
          {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount))}
        </p>
      </div>
    </Card>
  );
}
