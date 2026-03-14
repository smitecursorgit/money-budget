import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Bell, BellOff, Trash2, Calendar } from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { remindersApi } from '../api/client.ts';
import { useAppStore } from '../store/index.ts';
import { Reminder } from '../types/index.ts';

const RECURRENCE_LABELS: Record<string, string> = {
  once: 'Однократно',
  daily: 'Каждый день',
  weekly: 'Каждую неделю',
  monthly: 'Каждый месяц',
  yearly: 'Каждый год',
};

export function Reminders() {
  const { user } = useAppStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const currency = user?.currency || 'RUB';
  const fmt = (n: number) =>
    n.toLocaleString('ru', { style: 'currency', currency, maximumFractionDigits: 0 });

  const load = useCallback(async () => {
    const { data } = await remindersApi.list();
    setReminders(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (r: Reminder) => {
    await remindersApi.update(r.id, { isActive: !r.isActive });
    setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, isActive: !x.isActive } : x)));
  };

  const handleDelete = async (id: string) => {
    await remindersApi.remove(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const active = reminders.filter((r) => r.isActive);
  const inactive = reminders.filter((r) => !r.isActive);

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Просрочено';
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Завтра';
    return `Через ${days} дн.`;
  };

  const getUrgencyColor = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return '#ef4444';
    if (days <= 3) return '#f59e0b';
    return 'var(--text-tertiary)';
  };

  return (
    <div className="page" style={{ padding: '0 16px' }}>
      <div style={{ paddingTop: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Платежи</h1>
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Добавить
          </Button>
        </div>
      </div>

      {reminders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card padding="lg" style={{ textAlign: 'center' }}>
            <Calendar size={32} color="rgba(240,240,245,0.15)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 500 }}>
              Нет напоминаний
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '4px' }}>
              Добавь регулярные платежи, чтобы не забыть
            </p>
          </Card>
        </motion.div>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p className="section-title" style={{ padding: '0 4px', marginBottom: '10px' }}>Активные</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {active.map((r) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    fmt={fmt}
                    daysUntil={getDaysUntil(r.nextDate)}
                    urgencyColor={getUrgencyColor(r.nextDate)}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p className="section-title" style={{ padding: '0 4px', marginBottom: '10px' }}>Отключённые</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {inactive.map((r) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    fmt={fmt}
                    daysUntil={getDaysUntil(r.nextDate)}
                    urgencyColor="var(--text-tertiary)"
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showForm && (
          <AddReminderModal
            onClose={() => setShowForm(false)}
            onSaved={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReminderCard({
  reminder: r,
  fmt,
  daysUntil,
  urgencyColor,
  onToggle,
  onDelete,
}: {
  reminder: Reminder;
  fmt: (n: number) => string;
  daysUntil: string;
  urgencyColor: string;
  onToggle: (r: Reminder) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card padding="md" style={{ opacity: r.isActive ? 1 : 0.55 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: r.isActive ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={18} color={r.isActive ? '#f59e0b' : 'rgba(240,240,245,0.3)'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{r.title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: urgencyColor, fontWeight: 600 }}>{daysUntil}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {new Date(r.nextDate).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
              </span>
              <Badge>{RECURRENCE_LABELS[r.recurrence]}</Badge>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          {r.amount && (
            <p style={{ fontWeight: 700, color: 'var(--expense)', fontSize: '15px' }}>
              {fmt(r.amount)}
            </p>
          )}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => onToggle(r)}
              style={{
                padding: '5px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: 'pointer',
                color: r.isActive ? '#f59e0b' : 'rgba(240,240,245,0.3)',
              }}
            >
              {r.isActive ? <Bell size={14} /> : <BellOff size={14} />}
            </button>
            <button
              onClick={() => onDelete(r.id)}
              style={{ padding: '5px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#ef4444' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AddReminderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [recurrence, setRecurrence] = useState('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await remindersApi.create({
        title,
        amount: amount ? parseFloat(amount) : undefined,
        recurrence,
        nextDate,
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
        <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>Новое напоминание</h3>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название (например: Аренда)"
          style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px' }}
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Сумма (необязательно)"
          style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px' }}
        />
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px' }}
        >
          {Object.entries(RECURRENCE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input
          type="date"
          value={nextDate}
          onChange={(e) => setNextDate(e.target.value)}
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
