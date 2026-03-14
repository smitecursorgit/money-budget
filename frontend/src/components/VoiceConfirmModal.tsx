import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Edit3, TrendingUp, TrendingDown } from 'lucide-react';
import { ParsedEntry, Category } from '../types/index.ts';
import { Button } from './ui/Button.tsx';

interface VoiceConfirmModalProps {
  transcription: string;
  parsed: ParsedEntry;
  categories: Category[];
  onConfirm: (entry: ParsedEntry) => Promise<void>;
  onClose: () => void;
}

export function VoiceConfirmModal({
  transcription,
  parsed,
  categories,
  onConfirm,
  onClose,
}: VoiceConfirmModalProps) {
  const [editing, setEditing] = useState(false);
  const [entry, setEntry] = useState<ParsedEntry>({ ...parsed });
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isReminder = entry.type === 'reminder';
  const isIncome = entry.type === 'income';

  const handleConfirm = async () => {
    setSaveError(null);
    setLoading(true);
    try {
      await onConfirm(entry);
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; fieldErrors?: Record<string, string[]> } } };
      const serverMsg = axiosErr?.response?.data?.error;
      const fieldErrors = axiosErr?.response?.data?.fieldErrors;
      if (fieldErrors?.amount) {
        setSaveError('Укажите сумму — она не может быть нулевой');
      } else {
        setSaveError(serverMsg || 'Не удалось сохранить. Попробуйте ещё раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  const matchedCategory = categories.find(
    (c) => c.name.toLowerCase() === entry.category?.toLowerCase()
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '0 12px 20px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            background: 'rgba(20, 20, 30, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '20px',
            backdropFilter: 'blur(40px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isIncome ? (
                <TrendingUp size={20} color="var(--income)" />
              ) : (
                <TrendingDown size={20} color={isReminder ? '#f59e0b' : 'var(--expense)'} />
              )}
              <span style={{ fontWeight: 700, fontSize: '16px' }}>
                {isReminder ? 'Напоминание' : isIncome ? 'Доход' : 'Расход'}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', padding: '4px', color: 'rgba(240,240,245,0.5)' }}
            >
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '16px',
            }}
          >
            <p style={{ fontSize: '12px', color: 'rgba(240,240,245,0.4)', marginBottom: '4px' }}>
              Распознано
            </p>
            <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'rgba(240,240,245,0.8)' }}>
              «{transcription}»
            </p>
          </div>

          {!editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {entry.amount && (
                <Row label="Сумма">
                  <span style={{ fontSize: '22px', fontWeight: 700, color: isIncome ? 'var(--income)' : 'var(--expense)' }}>
                    {isIncome ? '+' : '-'}{entry.amount.toLocaleString('ru')} ₽
                  </span>
                </Row>
              )}
              {entry.category && (
                <Row label="Категория">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {matchedCategory?.icon && <span style={{ fontSize: '18px' }}>{matchedCategory.icon}</span>}
                    <span style={{ fontWeight: 600 }}>{entry.category}</span>
                  </span>
                </Row>
              )}
              {entry.date && (
                <Row label="Дата">
                  {new Date(entry.date).toLocaleDateString('ru', { day: 'numeric', month: 'long' })}
                </Row>
              )}
              {entry.reminderTitle && <Row label="Напоминание">{entry.reminderTitle}</Row>}
              {entry.reminderRecurrence && (
                <Row label="Повтор">{recurrenceLabel(entry.reminderRecurrence)}</Row>
              )}
            </div>
          ) : (
            <EditForm entry={entry} categories={categories} onChange={setEntry} />
          )}

          {saveError && (
            <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', fontSize: '13px', color: '#f87171' }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setEditing(!editing)}
              style={{ flex: 1 }}
            >
              <Edit3 size={16} />
              {editing ? 'Готово' : 'Изменить'}
            </Button>
            <Button variant="primary" size="md" onClick={handleConfirm} loading={loading} style={{ flex: 2 }}>
              <CheckCircle size={16} />
              Сохранить
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: 'rgba(240,240,245,0.45)' }}>{label}</span>
      <span style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{children}</span>
    </div>
  );
}

function EditForm({
  entry,
  categories,
  onChange,
}: {
  entry: ParsedEntry;
  categories: Category[];
  onChange: (e: ParsedEntry) => void;
}) {
  const filteredCategories = categories.filter((c) => c.type === entry.type || entry.type === 'reminder');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
      <div>
        <label style={{ fontSize: '12px', color: 'rgba(240,240,245,0.45)', marginBottom: '4px', display: 'block' }}>
          Тип
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onChange({ ...entry, type: t })}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: `1px solid ${entry.type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'rgba(255,255,255,0.08)'}`,
                background: entry.type === t
                  ? t === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'
                  : 'rgba(255,255,255,0.04)',
                color: entry.type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'rgba(240,240,245,0.5)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t === 'income' ? 'Доход' : 'Расход'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: '12px', color: 'rgba(240,240,245,0.45)', marginBottom: '4px', display: 'block' }}>
          Сумма
        </label>
        <input
          type="number"
          value={entry.amount || ''}
          onChange={(e) => onChange({ ...entry, amount: parseFloat(e.target.value) || undefined })}
          placeholder="0"
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px' }}
        />
      </div>

      <div>
        <label style={{ fontSize: '12px', color: 'rgba(240,240,245,0.45)', marginBottom: '4px', display: 'block' }}>
          Категория
        </label>
        <select
          value={entry.category || ''}
          onChange={(e) => onChange({ ...entry, category: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px' }}
        >
          <option value="">Без категории</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: '12px', color: 'rgba(240,240,245,0.45)', marginBottom: '4px', display: 'block' }}>
          Дата
        </label>
        <input
          type="date"
          value={entry.date || new Date().toISOString().slice(0, 10)}
          onChange={(e) => onChange({ ...entry, date: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px' }}
        />
      </div>

      <div>
        <label style={{ fontSize: '12px', color: 'rgba(240,240,245,0.45)', marginBottom: '4px', display: 'block' }}>
          Заметка
        </label>
        <input
          type="text"
          value={entry.note || ''}
          onChange={(e) => onChange({ ...entry, note: e.target.value })}
          placeholder="Необязательно"
          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px' }}
        />
      </div>
    </div>
  );
}

function recurrenceLabel(r: string) {
  const map: Record<string, string> = {
    once: 'Однократно',
    daily: 'Каждый день',
    weekly: 'Каждую неделю',
    monthly: 'Каждый месяц',
    yearly: 'Каждый год',
  };
  return map[r] || r;
}
