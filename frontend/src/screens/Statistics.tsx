import React, { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card } from '../components/ui/Card.tsx';
import { SkeletonPiece } from '../components/ui/SkeletonPiece.tsx';
import { statsApi } from '../api/client.ts';
import { useAppStore, useStatsStore } from '../store/index.ts';
import { CategoryStat, MonthlyStat, StatsSummary } from '../types/index.ts';

type Period = 'month' | 'quarter' | 'year';
type ChartTab = 'bar' | 'pie-expense' | 'pie-income';

const STATS_CACHE_KEY = 'stats_cache';
const STATS_CACHE_TTL_MS = 15 * 60 * 1000;

type StatsCacheData = { summary: StatsSummary; monthly: MonthlyStat[]; categoryStats: CategoryStat[]; period: Period; chartTab: ChartTab; cachedAt: number };

function readStatsCache(): StatsCacheData | null {
  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    const parsed: StatsCacheData = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > STATS_CACHE_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function writeStatsCache(data: Omit<StatsCacheData, 'cachedAt'>) {
  try { localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() })); } catch { /* ignore */ }
}

function formatYAxis(v: number): string {
  if (v === 0) return '0';
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

export function Statistics() {
  const { user } = useAppStore();
  const invalidatedAt = useStatsStore((s) => s.invalidatedAt);
  const [period, setPeriod] = useState<Period>('month');
  const [chartTab, setChartTab] = useState<ChartTab>('bar');
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const cacheRef = useRef(readStatsCache());
  const [loading, setLoading] = useState(!cacheRef.current);
  const [catLoading, setCatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = user?.currency || 'RUB';
  const fmt = (n: number) =>
    n.toLocaleString('ru', { style: 'currency', currency, maximumFractionDigits: 0 });

  const getDateRange = useCallback(() => {
    const now = new Date();
    let from: string;
    let to: string;
    if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const endExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      to = endExclusive.toISOString().slice(0, 10);
    } else if (period === 'quarter') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      from = d.toISOString().slice(0, 10);
      const endExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      to = endExclusive.toISOString().slice(0, 10);
    } else {
      from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      const endExclusive = new Date(now.getFullYear() + 1, 0, 1);
      to = endExclusive.toISOString().slice(0, 10);
    }
    return { from, to };
  }, [period]);

  // Hydrate from cache on mount (for page reload / WebView kill)
  const hasHydrated = useRef(false);
  useLayoutEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    const c = readStatsCache();
    if (c?.summary && c.monthly) {
      setSummary(c.summary);
      setMonthly(c.monthly);
      setCategoryStats(c.categoryStats ?? []);
      setPeriod(c.period);
      setChartTab(c.chartTab);
      setLoading(false);
    }
  }, []);

  // Load summary + monthly with retry (cold start Render ~50s)
  const loadBase = useCallback(async (background = false) => {
    if (!background) { setLoading(true); setError(null); }
    const range = getDateRange();
    const months = period === 'month' ? 1 : period === 'quarter' ? 3 : 12;
    const fetchWithRetry = async (retries = 2): Promise<void> => {
      try {
        const [sumRes, monRes] = await Promise.all([
          statsApi.summary(range),
          statsApi.monthly(months),
        ]);
        setSummary(sumRes.data);
        setMonthly(monRes.data);
        writeStatsCache({ summary: sumRes.data, monthly: monRes.data, categoryStats, period, chartTab });
      } catch (e) {
        const err = e as { response?: { status: number; data?: { error?: string } }; message?: string };
        if (retries > 0 && (!err.response || err.response?.status !== 401)) {
          await new Promise((r) => setTimeout(r, 3000));
          return fetchWithRetry(retries - 1);
        }
        const msg = err.response?.data?.error || err.message || 'Не удалось загрузить статистику';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchWithRetry();
  }, [period, getDateRange]);

  // Load category stats when period or chartTab changes (except 'bar' — it uses monthly data)
  const loadCategoryStats = useCallback(async () => {
    if (chartTab === 'bar') return;
    setCatLoading(true);
    try {
      const range = getDateRange();
      const catType = chartTab === 'pie-expense' ? 'expense' : 'income';
      const res = await statsApi.byCategory({ ...range, type: catType });
      setCategoryStats(res.data);
    } catch {
      setCategoryStats([]);
    } finally {
      setCatLoading(false);
    }
  }, [period, chartTab, getDateRange]);

  // Refetch when transactions change (real-time) or period changes (screens stay mounted)
  const isFirstFetch = useRef(true);
  useEffect(() => {
    const background = isFirstFetch.current && !!cacheRef.current;
    isFirstFetch.current = false;
    loadBase(background);
    if (chartTab !== 'bar') loadCategoryStats();
  }, [invalidatedAt, period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chartTab !== 'bar') loadCategoryStats();
  }, [chartTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const periods: { label: string; value: Period }[] = [
    { label: 'Месяц', value: 'month' },
    { label: 'Квартал', value: 'quarter' },
    { label: 'Год', value: 'year' },
  ];

  const chartTabs: { label: string; value: ChartTab }[] = [
    { label: 'По месяцам', value: 'bar' },
    { label: 'Расходы', value: 'pie-expense' },
    { label: 'Доходы', value: 'pie-income' },
  ];

  return (
    <div className="page" style={{ paddingLeft: 16, paddingRight: 16 }}>
      <div style={{ paddingTop: '20px', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>Статистика</h1>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 600,
                border: `1px solid ${period === p.value ? 'var(--border-accent)' : 'var(--border)'}`,
                background: period === p.value ? 'var(--accent-dim)' : 'var(--bg-surface)',
                color: period === p.value ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
              >
                <Card padding="md">
                  <SkeletonPiece width={40} height={10} borderRadius={6} delay={i * 0.1} style={{ marginBottom: 8 }} />
                  <SkeletonPiece width={70} height={20} borderRadius={8} delay={i * 0.1 + 0.05} />
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 24 }}
          >
            <Card padding="md" style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkeletonPiece width="60%" height={12} borderRadius={999} delay={0.3} style={{ marginBottom: 8 }} />
            </Card>
          </motion.div>
        </div>
      ) : error ? (
        <Card padding="lg" style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ color: 'var(--expense)', marginBottom: '12px' }}>{error}</p>
          <button
            onClick={() => loadBase()}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-pill)',
              background: '#ffffff',
              border: 'none',
              color: '#000000',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Повторить
          </button>
        </Card>
      ) : (
        <>
          {summary && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <SummaryCard label="Доходы" value={fmt(summary.income)} color="var(--income)" />
                <SummaryCard label="Расходы" value={fmt(summary.expense)} color="var(--expense)" />
                <SummaryCard
                  label="Баланс"
                  value={fmt(summary.balance)}
                  color={summary.balance >= 0 ? 'var(--income)' : 'var(--expense)'}
                />
              </div>
            </motion.div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {chartTabs.map((t) => (
              <button
                key={t.value}
                onClick={() => setChartTab(t.value)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: `1px solid ${chartTab === t.value ? 'var(--border-accent)' : 'var(--border)'}`,
                  background: chartTab === t.value ? 'var(--accent-dim)' : 'var(--bg-surface)',
                  color: chartTab === t.value ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={chartTab} style={{ marginBottom: '20px' }}>
            <Card padding="md">
              {chartTab === 'bar' ? (
                monthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthly} barGap={4}>
                      <XAxis
                        dataKey="month"
                        tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatYAxis}
                        width={36}
                      />
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.20)',
                          borderRadius: '999px',
                          color: '#ffffff',
                        }}
                        wrapperStyle={{ background: 'transparent', border: 'none' }}
                        formatter={(value: number) => [fmt(value), '']}
                      />
                      <Bar dataKey="income" fill="var(--income)" radius={[6, 6, 0, 0]} name="Доход" />
                      <Bar dataKey="expense" fill="#ef5350" radius={[6, 6, 0, 0]} name="Расход" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )
              ) : catLoading ? (
                <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <SkeletonPiece key={i} width={24} height={24} borderRadius={999} delay={i * 0.08} />
                    ))}
                  </div>
                  <SkeletonPiece width={100} height={12} borderRadius={999} delay={0.2} />
                </div>
              ) : categoryStats.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="total"
                        nameKey="name"
                      >
                        {categoryStats.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.20)',
                          borderRadius: '999px',
                          color: '#ffffff',
                        }}
                        wrapperStyle={{ background: 'transparent', border: 'none' }}
                        formatter={(value: number) => [fmt(value), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {categoryStats.slice(0, 6).map((c) => (
                      <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '13px' }}>
                            {c.icon} {c.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: c.color }}>
                          {fmt(c.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyChart />
              )}
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card padding="sm">
      <p style={{ fontSize: '11px', color: 'rgba(240,240,245,0.4)', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 700, color }}>{value}</p>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
      Нет данных за период
    </div>
  );
}
