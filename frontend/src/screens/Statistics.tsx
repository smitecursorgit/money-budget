import React, { useEffect, useState, useCallback } from 'react';
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
import { useLocation } from 'react-router-dom';
import { statsApi } from '../api/client.ts';
import { useAppStore, useStatsStore } from '../store/index.ts';
import { CategoryStat, MonthlyStat, StatsSummary } from '../types/index.ts';

type Period = 'month' | 'quarter' | 'year';
type ChartTab = 'bar' | 'pie-expense' | 'pie-income';

function formatYAxis(v: number): string {
  if (v === 0) return '0';
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

export function Statistics() {
  const { user } = useAppStore();
  const invalidatedAt = useStatsStore((s) => s.invalidatedAt);
  const location = useLocation();
  const [period, setPeriod] = useState<Period>('month');
  const [chartTab, setChartTab] = useState<ChartTab>('bar');
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Load summary + monthly with retry (cold start Render ~50s)
  const loadBase = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  // Refetch when transactions change (real-time), when navigating to stats, or when period changes
  useEffect(() => {
    loadBase();
    if (chartTab !== 'bar') loadCategoryStats();
  }, [invalidatedAt, location.pathname, period]); // eslint-disable-line react-hooks/exhaustive-deps

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
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                border: `1px solid ${period === p.value ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
                background: period === p.value ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
                color: period === p.value ? 'var(--accent-light)' : 'rgba(240,240,245,0.5)',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
          Загрузка...
        </div>
      ) : error ? (
        <Card padding="lg" style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ color: 'var(--expense)', marginBottom: '12px' }}>{error}</p>
          <button
            onClick={() => loadBase()}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(34,197,94,0.28)',
              color: 'var(--accent)',
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
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: `1px solid ${chartTab === t.value ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  background: chartTab === t.value ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
                  color: chartTab === t.value ? 'var(--accent-light)' : 'rgba(240,240,245,0.5)',
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
                        tick={{ fill: 'rgba(240,240,245,0.4)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(240,240,245,0.4)', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatYAxis}
                        width={36}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(8,8,8,0.98)',
                          border: '1px solid rgba(255,255,255,0.09)',
                          borderRadius: '12px',
                          color: '#f0f0f5',
                        }}
                        wrapperStyle={{ background: 'transparent', border: 'none' }}
                        formatter={(value: number) => [fmt(value), '']}
                      />
                      <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} name="Доход" />
                      <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} name="Расход" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )
              ) : catLoading ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  Загрузка...
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
                        contentStyle={{
                          background: 'rgba(8,8,8,0.98)',
                          border: '1px solid rgba(255,255,255,0.09)',
                          borderRadius: '12px',
                          color: '#f0f0f5',
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
