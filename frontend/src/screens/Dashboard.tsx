import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, ChevronRight, RefreshCw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card.tsx';
import { VoiceButton } from '../components/VoiceButton.tsx';
import { VoiceConfirmModal } from '../components/VoiceConfirmModal.tsx';
import { statsApi, transactionsApi, remindersApi } from '../api/client.ts';
import { useAppStore, useTransactionStore } from '../store/index.ts';
import { ParsedEntry, StatsSummary, Reminder, Transaction } from '../types/index.ts';
import { saveVoiceEntry } from '../utils/saveVoiceEntry.ts';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
};

const CACHE_KEY = 'dashboard_cache';
const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheData = { summary: StatsSummary; transactions: Transaction[]; reminders: Reminder[]; cachedAt: number };

function readCache(): { summary: StatsSummary; transactions: Transaction[]; reminders: Reminder[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheData = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(data: { summary: StatsSummary; transactions: Transaction[]; reminders: Reminder[] }) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() })); } catch { /* ignore */ }
}

export function Dashboard() {
  const { user, categories } = useAppStore();
  const { setTransactions } = useTransactionStore();
  const navigate = useNavigate();

  const cachedRef = useRef(readCache());
  const [summary, setSummary] = useState<StatsSummary | null>(cachedRef.current?.summary ?? null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(cachedRef.current?.transactions ?? []);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>(cachedRef.current?.reminders ?? []);
  const [voiceResult, setVoiceResult] = useState<{ transcription: string; parsed: ParsedEntry[] } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const showError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 5000);
  }, []);

  const fetchData = useCallback(async () => {
    const [summaryRes, txRes, remRes] = await Promise.all([
      statsApi.summary(),
      transactionsApi.list({ limit: 20 }),
      remindersApi.upcoming(30),
    ]);
    const newSummary: StatsSummary = summaryRes.data;
    const newTransactions: Transaction[] = txRes.data.transactions;
    const newReminders: Reminder[] = remRes.data.slice(0, 3);

    setSummary(newSummary);
    setRecentTransactions(newTransactions);
    setTransactions(newTransactions, txRes.data.total);
    setUpcomingReminders(newReminders);

    const prevCache = readCache();
    const safeTransactions =
      newTransactions.length > 0 || txRes.data.total === 0
        ? newTransactions
        : (prevCache?.transactions ?? []);
    writeCache({ summary: newSummary, transactions: safeTransactions, reminders: newReminders });
    if (safeTransactions !== newTransactions) setRecentTransactions(safeTransactions);
  }, [setTransactions]);

  const loadData = useCallback(async (isManual = false) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (isManual) {
      setRefreshing(true);
      setLoadError(false);
      retryCountRef.current = 0;
    }
    try {
      await fetchData();
      setLoadError(false);
      retryCountRef.current = 0;
    } catch {
      if (retryCountRef.current < 2) {
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(() => loadData(), 5000);
      } else {
        if (!readCache()) setLoadError(true);
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    loadData();
    return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); };
  }, [loadData]);

  const handleVoiceConfirm = async (entries: ParsedEntry[]) => {
    await Promise.allSettled(entries.map((entry) => saveVoiceEntry(entry, categories)));
    fetchData().catch(() => {});
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

      {/* ── Header ── */}
      <motion.div {...fadeUp} style={{ paddingTop: '24px', paddingBottom: '4px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500 }}>{greeting()}</p>
        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '2px' }}>
          {user?.firstName || 'Привет!'}
        </h1>
      </motion.div>

      {/* ── Error toast ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error-banner"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'rgba(255,69,58,0.10)',
              border: '1px solid rgba(255,69,58,0.20)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--expense)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Network error ── */}
      {loadError && (
        <motion.div
          {...fadeUp}
          style={{
            marginTop: '12px',
            padding: '14px 16px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Не удалось загрузить данные</span>
          <button
            onClick={() => loadData(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(34,197,94,0.28)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 12px',
              color: 'var(--accent)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} />
            Обновить
          </button>
        </motion.div>
      )}

      {/* ── Balance hero card ── */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.04, ...fadeUp.transition }}
        style={{ marginTop: '18px', marginBottom: '14px' }}
      >
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.05) 50%, rgba(0,0,0,0) 100%)',
            border: '1px solid rgba(34,197,94,0.20)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.10) inset, 0 12px 40px rgba(0,0,0,0.35)',
          }}
        >
          {/* Subtle glow blob inside the card */}
          <div
            style={{
              position: 'absolute',
              top: -50,
              right: -30,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(34,197,94,0.16) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {refreshing && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', top: 16, right: 16, width: 14, height: 14, display: 'flex' }}
            >
              <RefreshCw size={14} color="rgba(255,255,255,0.35)" />
            </motion.div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: '6px' }}>
              Баланс
            </p>
            <p style={{
              fontSize: '52px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#fff',
              lineHeight: 1.1,
            }}>
              {summary ? fmt(summary.balance) : '—'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '18px' }}>
            <div style={{
              flex: 1,
              background: 'rgba(34,197,94,0.10)',
              border: '1px solid rgba(34,197,94,0.18)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <TrendingUp size={13} color="var(--income)" />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Доходы</span>
              </div>
              <p style={{ fontWeight: 700, color: 'var(--income)', fontSize: '16px', letterSpacing: '-0.01em' }}>
                {summary ? fmt(summary.income) : '—'}
              </p>
            </div>
            <div style={{
              flex: 1,
              background: 'rgba(255,69,58,0.08)',
              border: '1px solid rgba(255,69,58,0.16)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <TrendingDown size={13} color="var(--expense)" />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Расходы</span>
              </div>
              <p style={{ fontWeight: 700, color: 'var(--expense)', fontSize: '16px', letterSpacing: '-0.01em' }}>
                {summary ? fmt(summary.expense) : '—'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Voice input ── */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.09, ...fadeUp.transition }}
        style={{ marginBottom: '14px' }}
      >
        <Card
          padding="lg"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            paddingTop: '22px',
            paddingBottom: '22px',
          }}
        >
          <VoiceButton
            onResult={(t, p) => { setError(null); setVoiceResult({ transcription: t, parsed: p }); }}
            onError={(msg) => showError(msg)}
          />
        </Card>
      </motion.div>

      {/* ── Upcoming reminders ── */}
      <AnimatePresence>
        {upcomingReminders.length > 0 && (
          <motion.div
            {...fadeUp}
            transition={{ delay: 0.13, ...fadeUp.transition }}
            style={{ marginBottom: '14px' }}
          >
            <p className="section-title" style={{ padding: '0 4px' }}>Ближайшие платежи</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingReminders.map((r) => (
                <Card key={r.id} padding="md" onClick={() => navigate('/reminders')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(245,158,11,0.14)',
                          border: '1px solid rgba(245,158,11,0.20)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          flexShrink: 0,
                        }}
                      >
                        🔔
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '14px' }}>{r.title}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                          {new Date(r.nextDate).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    {r.amount && (
                      <p style={{ fontWeight: 700, color: 'var(--expense)', fontSize: '15px' }}>
                        {fmt(r.amount)}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Recent transactions ── */}
      <motion.div
        {...fadeUp}
        transition={{ delay: 0.17, ...fadeUp.transition }}
        style={{ marginBottom: '20px' }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          padding: '0 4px',
        }}>
          <p className="section-title" style={{ padding: 0, margin: 0 }}>Последние операции</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/transactions', { state: { openAdd: true } })}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'var(--accent-dim)',
                border: '1px solid rgba(34,197,94,0.28)',
                borderRadius: 'var(--radius-pill)',
                padding: '5px 12px',
                color: 'var(--accent)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Plus size={12} /> Добавить
            </button>
            <button
              onClick={() => navigate('/transactions')}
              style={{
                background: 'none',
                color: 'var(--text-tertiary)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                padding: '5px 4px',
              }}
            >
              Все <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <Card padding="lg" style={{ textAlign: 'center', paddingTop: '28px', paddingBottom: '28px' }}>
            <p style={{ fontSize: '28px', marginBottom: '10px' }}>💸</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', lineHeight: 1.5 }}>
              Ещё нет операций.{'\n'}Попробуй голосовой ввод!
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: `${color}1a`,
              border: `1px solid ${color}28`,
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
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
              {new Date(t.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        <p
          style={{
            fontWeight: 700,
            fontSize: '15px',
            letterSpacing: '-0.01em',
            color: t.type === 'income' ? 'var(--income)' : 'var(--expense)',
          }}
        >
          {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount))}
        </p>
      </div>
    </Card>
  );
}
