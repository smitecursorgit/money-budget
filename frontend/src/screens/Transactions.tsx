import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, Mic, Pencil } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
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

const PAGE_SIZE = 50;

export function Transactions() {
  const location = useLocation();
  const { user, categories } = useAppStore();
  const { transactions, total, setTransactions, removeTransaction } = useTransactionStore();
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [voiceResult, setVoiceResult] = useState<{ transcription: string; parsed: ParsedEntry[] } | null>(null);
  const [showAddForm, setShowAddForm] = useState((location.state as { openAdd?: boolean })?.openAdd === true);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const currency = user?.currency || 'RUB';
  const fmt = (n: number) =>
    n.toLocaleString('ru', { style: 'currency', currency, maximumFractionDigits: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    try {
      const params: Record<string, string | number> = { limit: PAGE_SIZE, offset: 0 };
      if (filterType) params['type'] = filterType;
      const { data } = await transactionsApi.list(params);
      setTransactions(data.transactions, data.total);
    } catch {
      // Silent — user sees stale data rather than a blank crash
    } finally {
      setLoading(false);
    }
  }, [filterType, setTransactions]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const nextOffset = offset + PAGE_SIZE;
    try {
      const params: Record<string, string | number> = { limit: PAGE_SIZE, offset: nextOffset };
      if (filterType) params['type'] = filterType;
      const { data } = await transactionsApi.list(params);
      setTransactions([...transactions, ...data.transactions], data.total);
      setOffset(nextOffset);
    } finally {
      setLoadingMore(false);
    }
  }, [offset, filterType, transactions, setTransactions]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    removeTransaction(id);
    try {
      await transactionsApi.remove(id);
    } catch {
      await load();
    }
  };

  const handleVoiceConfirm = async (entries: ParsedEntry[]) => {
    for (const entry of entries) {
      await saveVoiceEntry(entry, categories);
    }
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
                onError={(msg) => alert(msg)}
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
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  fmt={fmt}
                  onDelete={handleDelete}
                  onEdit={setEditTarget}
                />
              ))}
            </div>
          </motion.div>
        ))
      )}

      {transactions.length > 0 && transactions.length < total && !search && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0 24px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Показано {transactions.length} из {total}
          </p>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '10px 28px',
              borderRadius: '14px',
              border: '1px solid rgba(108,99,255,0.3)',
              background: 'rgba(108,99,255,0.15)',
              color: 'var(--accent-light)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loadingMore ? 'default' : 'pointer',
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
          </button>
        </div>
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

      {editTarget && (
        <EditTransactionModal
          transaction={editTarget}
          categories={categories}
          onClose={() => setEditTarget(null)}
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
  onEdit,
}: {
  transaction: Transaction;
  fmt: (n: number) => string;
  onDelete: (id: string) => Promise<void>;
  onEdit: (t: Transaction) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(t.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

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
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? '...' : 'Да'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(240,240,245,0.5)', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                Нет
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => onEdit(t)}
                style={{ background: 'none', color: 'rgba(240,240,245,0.25)', border: 'none', padding: '4px', cursor: 'pointer' }}
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ background: 'none', color: 'rgba(240,240,245,0.2)', border: 'none', padding: '4px', cursor: 'pointer' }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function TransactionFormModal({
  title,
  initial,
  categories,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: { type: 'expense' | 'income'; amount: string; categoryId: string; date: string; note: string };
  categories: Category[];
  onClose: () => void;
  onSubmit: (data: { type: 'expense' | 'income'; amount: number; categoryId?: string; date: string; note?: string }) => Promise<void>;
}) {
  const [type, setType] = useState<'expense' | 'income'>(initial.type);
  const [amount, setAmount] = useState(initial.amount);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [date, setDate] = useState(initial.date);
  const [note, setNote] = useState(initial.note);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = categories.filter((c) => c.type === type);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Укажите сумму больше нуля');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ amount: parseFloat(amount), type, categoryId: categoryId || undefined, date, note: note || undefined });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Не удалось сохранить. Попробуйте ещё раз.');
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
        <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>{title}</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setCategoryId(''); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: `1px solid ${type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'rgba(255,255,255,0.08)'}`,
                background: type === t ? (t === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.04)',
                color: type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'rgba(240,240,245,0.5)',
                fontWeight: 600, fontSize: '14px', cursor: 'pointer',
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
          style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: error ? '8px' : '16px' }}
        />
        {error && (
          <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', fontSize: '13px', color: '#f87171' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Отмена</Button>
          <Button variant="primary" size="md" onClick={handleSubmit} loading={loading} style={{ flex: 2 }}>Сохранить</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddTransactionModal({ categories, onClose, onSaved }: { categories: Category[]; onClose: () => void; onSaved: () => void }) {
  return (
    <TransactionFormModal
      title="Новая операция"
      initial={{ type: 'expense', amount: '', categoryId: '', date: new Date().toISOString().slice(0, 10), note: '' }}
      categories={categories}
      onClose={onClose}
      onSubmit={async (data) => {
        await transactionsApi.create(data);
        onSaved();
      }}
    />
  );
}

function EditTransactionModal({ transaction: t, categories, onClose, onSaved }: { transaction: Transaction; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  return (
    <TransactionFormModal
      title="Редактировать операцию"
      initial={{
        type: t.type as 'expense' | 'income',
        amount: String(t.amount),
        categoryId: t.categoryId || '',
        date: new Date(t.date).toISOString().slice(0, 10),
        note: t.note || '',
      }}
      categories={categories}
      onClose={onClose}
      onSubmit={async (data) => {
        await transactionsApi.update(t.id, data);
        onSaved();
      }}
    />
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
