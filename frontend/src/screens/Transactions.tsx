import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, Mic } from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { VoiceButton } from '../components/VoiceButton.tsx';
import { VoiceConfirmModal } from '../components/VoiceConfirmModal.tsx';
import { transactionsApi } from '../api/client.ts';
import { useAppStore, useTransactionStore } from '../store/index.ts';
import { Category, Transaction, ParsedEntry } from '../types/index.ts';
import { saveVoiceEntry } from '../utils/saveVoiceEntry.ts';

const FILTER_TYPES = [
  { label: 'Все', value: '' },
  { label: 'Расходы', value: 'expense' },
  { label: 'Доходы', value: 'income' },
];

export function Transactions() {
  const { user, categories } = useAppStore();
  const { transactions, total, setTransactions, removeTransaction } = useTransactionStore();
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [voiceResult, setVoiceResult] = useState<{ transcription: string; parsed: ParsedEntry } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const currency = user?.currency || 'RUB';
  const fmt = (n: number) =>
    n.toLocaleString('ru', { style: 'currency', currency, maximumFractionDigits: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType) params['type'] = filterType;
      const { data } = await transactionsApi.list(params);
      setTransactions(data.transactions, data.total);
    } finally {
      setLoading(false);
    }
  }, [filterType, setTransactions]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await transactionsApi.remove(id);
    removeTransaction(id);
  };

  const handleVoiceConfirm = async (entry: ParsedEntry) => {
    await saveVoiceEntry(entry, categories);
    await load();
  };

  const filtered = transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.category?.name.toLowerCase().includes(q) ||
      t.note?.toLowerCase().includes(q) ||
      String(t.amount).includes(q)
    );
  });

  const grouped = groupByDate(filtered);

  return (
    <div className="page" style={{ padding: '0 16px' }}>
      <div style={{ paddingTop: '20px', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Операции</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowVoice(!showVoice)}>
              <Mic size={16} />
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus size={16} /> Добавить
            </Button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '12px',
          }}
        >
          <Search size={16} color="rgba(240,240,245,0.3)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск операций..."
            style={{ background: 'none', border: 'none', flex: 1, color: 'var(--text-primary)', fontSize: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {FILTER_TYPES.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                border: `1px solid ${filterType === f.value ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                background: filterType === f.value ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
                color: filterType === f.value ? 'var(--accent-light)' : 'rgba(240,240,245,0.5)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showVoice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: '16px' }}
          >
            <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <VoiceButton
                onResult={(t, p) => { setVoiceResult({ transcription: t, parsed: p }); setShowVoice(false); }}
                onError={() => {}}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
          Загрузка...
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card padding="lg" style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: 'var(--text-tertiary)' }}>Нет операций</p>
          </Card>
        </motion.div>
      ) : (
        Object.entries(grouped).map(([date, txs]) => (
          <motion.div key={date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '16px 4px 8px',
              }}
            >
              {date}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {txs.map((t) => (
                <TransactionItem key={t.id} transaction={t} fmt={fmt} onDelete={handleDelete} />
              ))}
            </div>
          </motion.div>
        ))
      )}

      {voiceResult && (
        <VoiceConfirmModal
          transcription={voiceResult.transcription}
          parsed={voiceResult.parsed}
          categories={categories}
          onConfirm={handleVoiceConfirm}
          onClose={() => setVoiceResult(null)}
        />
      )}

      {showAddForm && (
        <AddTransactionModal
          categories={categories}
          onClose={() => setShowAddForm(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function TransactionItem({
  transaction: t,
  fmt,
  onDelete,
}: {
  transaction: Transaction;
  fmt: (n: number) => string;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card padding="md">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '11px',
              background: `${t.category?.color || '#71717a'}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            {t.category?.icon || '📦'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 500, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.category?.name || 'Без категории'}
            </p>
            {t.note && (
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.note}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <p style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
            {t.type === 'income' ? '+' : '-'}{fmt(Number(t.amount))}
          </p>
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onDelete(t.id)}
                style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                Да
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(240,240,245,0.5)', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                Нет
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ background: 'none', color: 'rgba(240,240,245,0.2)', border: 'none', padding: '4px', cursor: 'pointer' }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function AddTransactionModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = categories.filter((c) => c.type === type);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    try {
      await transactionsApi.create({
        amount: parseFloat(amount),
        type,
        categoryId: categoryId || undefined,
        date,
        note: note || undefined,
      });
      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', padding: '0 12px 20px' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '20px', backdropFilter: 'blur(40px)' }}
      >
        <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Новая операция</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: `1px solid ${type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'rgba(255,255,255,0.08)'}`,
                background: type === t ? (t === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.04)',
                color: type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'rgba(240,240,245,0.5)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {t === 'income' ? '↑ Доход' : '↓ Расход'}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Сумма"
          style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px', fontSize: '18px', fontWeight: 700 }}
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px' }}
        >
          <option value="">Без категории</option>
          {filtered.map((cat) => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px' }}
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Заметка (необязательно)"
          style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Отмена</Button>
          <Button variant="primary" size="md" onClick={handleSubmit} loading={loading} style={{ flex: 2 }}>Сохранить</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
  const result: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Сегодня';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Вчера';
    else label = d.toLocaleDateString('ru', { day: 'numeric', month: 'long' });

    if (!result[label]) result[label] = [];
    result[label].push(t);
  }
  return result;
}
