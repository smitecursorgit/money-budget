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
  Legend,
} from 'recharts';
import { Card } from '../components/ui/Card.tsx';
import { statsApi } from '../api/client.ts';
import { useAppStore } from '../store/index.ts';
import { CategoryStat, MonthlyStat, StatsSummary } from '../types/index.ts';

type Period = 'month' | 'quarter' | 'year';
type ChartTab = 'bar' | 'pie-expense' | 'pie-income';

export function Statistics() {
  const { user } = useAppStore();
  const [period, setPeriod] = useState<Period>('month');
  const [chartTab, setChartTab] = useState<ChartTab>('bar');
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);

  const currency = user?.currency || 'RUB';
  const fmt = (n: number) =>
    n.toLocaleString('ru', { style: 'currency', currency, maximumFractionDigits: 0 });

  const getDateRange = useCallback(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    let from: string;
    if (period === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      from = d.toISOString().slice(0, 10);
    } else if (period === 'quarter') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      from = d.toISOString().slice(0, 10);
    } else {
      const d = new Date(now.getFullYear(), 0, 1);
      from = d.toISOString().slice(0, 10);
    }
    return { from, to };
  }, [period]);

  const load = useCallback(async () => {
    const range = getDateRange();
    const months = period === 'month' ? 1 : period === 'quarter' ? 3 : 12;
    const [sumRes, monRes, catExpRes, catIncRes] = await Promise.all([
      statsApi.summary(range),
      statsApi.monthly(months),
      statsApi.byCategory({ ...range, type: 'expense' }),
      statsApi.byCategory({ ...range, type: 'income' }),
    ]);
    setSummary(sumRes.data);
    setMonthly(monRes.data);
    setCategoryStats(chartTab === 'pie-expense' ? catExpRes.data : catIncRes.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, chartTab, getDateRange]);

  useEffect(() => { load(); }, [load]);

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
    <div className="page" style={{ padding: '0 16px' }}>
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
                border: `1px solid ${period === p.value ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                background: period === p.value ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
                color: period === p.value ? 'var(--accent-light)' : 'rgba(240,240,245,0.5)',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

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
              border: `1px solid ${chartTab === t.value ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
              background: chartTab === t.value ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
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
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(20,20,30,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#f0f0f5',
                    }}
                    formatter={(value: number) => [fmt(value), '']}
                  />
                  <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} name="Доход" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} name="Расход" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )
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
                      background: 'rgba(20,20,30,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#f0f0f5',
                    }}
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
