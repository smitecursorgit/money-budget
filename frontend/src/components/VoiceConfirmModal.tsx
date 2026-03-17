import React, { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, CheckCircle, Trash2, Pencil, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { ParsedEntry, Category } from '../types/index.ts';
import { Button } from './ui/Button.tsx';
import { useAppStore } from '../store/index.ts';

interface VoiceConfirmModalProps {
  transcription: string;
  parsed: ParsedEntry[];
  categories: Category[];
  onConfirm: (entries: ParsedEntry[]) => Promise<void>;
  onClose: () => void;
}

export function VoiceConfirmModal({
  transcription,
  parsed,
  categories,
  onConfirm,
  onClose,
}: VoiceConfirmModalProps) {
  const { user } = useAppStore();
  const currency = user?.currency || 'RUB';
  const fmt = (n: number) =>
    n.toLocaleString('ru', { style: 'currency', currency, maximumFractionDigits: 0 });

  const [entries, setEntries] = useState<ParsedEntry[]>(parsed.map((e) => ({ ...e })));
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragControls = useDragControls();

  const updateEntry = (index: number, updated: ParsedEntry) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? updated : e)));
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    const invalid = entries.find((e) => e.type !== 'reminder' && (!e.amount || e.amount <= 0));
    if (invalid) {
      setError('У одной из операций не указана сумма');
      return;
    }
    if (entries.length === 0) {
      onClose();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onConfirm(entries);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ?? (err as { message?: string })?.message;
      setError(msg || 'Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          zIndex: 200, display: 'flex', alignItems: 'flex-end', padding: '0 12px calc(12px + var(--nav-height) + var(--safe-bottom))', boxSizing: 'border-box',
        }}
        onClick={onClose}
      >
        <motion.div
          drag="y"
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
            if (info.offset.y > 80 || info.velocity.y > 300) onClose();
          }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            background: 'rgba(22, 22, 22, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'var(--radius-panel)',
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.50), 0 2px 0 rgba(255,255,255,0.04) inset',
          }}
        >
          {/* Header — drag handle */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            style={{ paddingTop: '10px', flexShrink: 0, cursor: 'grab', touchAction: 'none' }}
          >
            <div style={{ width: 36, height: 4, margin: '0 auto 12px', borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
          </div>
          <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>
                  {entries.length > 1 ? `${entries.length} операции` : 'Операция'}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(240,240,245,0.4)' }}>Распознано</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', padding: '4px', color: 'rgba(240,240,245,0.4)', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'rgba(240,240,245,0.7)', background: 'rgba(255,255,255,0.04)', borderRadius: '999px', padding: '8px 12px' }}>
              «{transcription}»
            </p>
          </div>

          {/* Entries list — minHeight: 0 + overflow scroll required for iOS flex scroll */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'scroll',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              padding: '12px 20px',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
            }}
          >
            {entries.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px 0', fontSize: '14px' }}>
                Все операции удалены
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {entries.map((entry, i) => (
                  <div key={i}>
                    {editIndex === i ? (
                      <EntryEditCard
                        entry={entry}
                        categories={categories}
                        fmt={fmt}
                        onSave={(updated) => { updateEntry(i, updated); setEditIndex(null); }}
                        onCancel={() => setEditIndex(null)}
                      />
                    ) : (
                      <EntryViewCard
                        entry={entry}
                        categories={categories}
                        fmt={fmt}
                        onEdit={() => setEditIndex(i)}
                        onDelete={() => removeEntry(i)}
                        showDelete={entries.length > 1}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {error && (
              <div style={{ marginBottom: '10px', padding: '10px 12px', background: 'rgba(239,83,80,0.12)', border: '1px solid rgba(239,83,80,0.25)', borderRadius: '999px', fontSize: '13px', color: '#ef5350' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>
                Отмена
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirm}
                loading={loading}
                style={{
                  flex: 2,
                  background: 'var(--income)',
                  color: '#1a2e1b',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(102,187,106,0.35)',
                }}
              >
                <CheckCircle size={16} />
                {entries.length > 1 ? `Сохранить все (${entries.length})` : 'Сохранить'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Read-only entry card ─── */
function EntryViewCard({
  entry,
  categories,
  fmt,
  onEdit,
  onDelete,
  showDelete,
}: {
  entry: ParsedEntry;
  categories: Category[];
  fmt: (n: number) => string;
  onEdit: () => void;
  onDelete: () => void;
  showDelete: boolean;
}) {
  const isIncome = entry.type === 'income';
  const isReminder = entry.type === 'reminder';

  const matchedCat = categories.find((c) => c.name.toLowerCase() === entry.category?.toLowerCase());

  const typeColor = isReminder ? '#ffa726' : isIncome ? 'var(--income)' : 'var(--expense)';
  const TypeIcon = isIncome ? TrendingUp : isReminder ? Bell : TrendingDown;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '999px', padding: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '999px', flexShrink: 0,
            background: `${typeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TypeIcon size={16} color={typeColor} />
          </div>
          <div style={{ minWidth: 0 }}>
            {entry.amount ? (
              <p style={{ fontWeight: 700, fontSize: '17px', color: typeColor }}>
                {isIncome ? '+' : isReminder ? '' : '-'}{fmt(entry.amount)}
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: 'rgba(239,83,80,0.8)', fontWeight: 600 }}>Сумма не указана</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
              {entry.category && (
                <span style={{ fontSize: '12px', color: 'rgba(240,240,245,0.6)' }}>
                  {matchedCat?.icon} {entry.category}
                </span>
              )}
              {entry.note && (
                <span style={{ fontSize: '11px', color: 'rgba(240,240,245,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                  {entry.note}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
          <button
            onClick={onEdit}
            style={{ padding: '6px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '999px', cursor: 'pointer', color: 'rgba(240,240,245,0.5)' }}
          >
            <Pencil size={14} />
          </button>
          {showDelete && (
            <button
              onClick={onDelete}
              style={{ padding: '6px', background: 'rgba(239,83,80,0.1)', border: 'none', borderRadius: '999px', cursor: 'pointer', color: '#ef5350' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Inline edit card ─── */
function EntryEditCard({
  entry,
  categories,
  fmt: _fmt,
  onSave,
  onCancel,
}: {
  entry: ParsedEntry;
  categories: Category[];
  fmt: (n: number) => string;
  onSave: (updated: ParsedEntry) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<'expense' | 'income'>(
    entry.type === 'reminder' ? 'expense' : entry.type
  );
  const [amount, setAmount] = useState(entry.amount ? String(entry.amount) : '');
  const [category, setCategory] = useState(entry.category || '');
  const [date, setDate] = useState(entry.date || new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(entry.note || '');

  const filteredCats = categories.filter((c) => c.type === type);

  const handleSave = () => {
    onSave({
      ...entry,
      type,
      amount: parseFloat(amount) || undefined,
      category: category || undefined,
      date,
      note: note || undefined,
    });
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px', padding: '14px',
    }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setCategory(''); }}
            style={{
              flex: 1, padding: '7px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'rgba(255,255,255,0.08)'}`,
              background: type === t ? (t === 'income' ? 'rgba(255,255,255,0.15)' : 'rgba(239,83,80,0.15)') : 'rgba(255,255,255,0.04)',
              color: type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'rgba(240,240,245,0.4)',
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
        style={{ width: '100%', padding: '9px 12px', borderRadius: '999px', marginBottom: '8px', fontSize: '15px', fontWeight: 700 }}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ width: '100%', padding: '9px 12px', borderRadius: '999px', marginBottom: '8px' }}
      >
        <option value="">Без категории</option>
        {filteredCats.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
      </select>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ width: '100%', padding: '9px 12px', borderRadius: '999px', marginBottom: '8px' }}
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Заметка"
        style={{ width: '100%', padding: '9px 12px', borderRadius: '999px', marginBottom: '10px' }}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '9px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(240,240,245,0.6)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          style={{ flex: 2, padding: '9px', borderRadius: '999px', background: 'var(--accent-dim)', border: '1px solid rgba(255,255,255,0.4)', color: 'var(--accent-light)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
        >
          Готово
        </button>
      </div>
    </div>
  );
}

function recurrenceLabel(r: string) {
  const map: Record<string, string> = {
    once: 'Однократно', daily: 'Каждый день',
    weekly: 'Каждую неделю', monthly: 'Каждый месяц', yearly: 'Каждый год',
  };
  return map[r] || r;
}
// Keep export for potential external use
export { recurrenceLabel };
