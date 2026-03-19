import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Plus, Bell, BellOff, Trash2, Calendar, Pencil } from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { SkeletonPiece } from '../components/ui/SkeletonPiece.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { remindersApi } from '../api/client.ts';
import { useAppStore } from '../store/index.ts';
import { Reminder } from '../types/index.ts';

const CACHE_KEY = 'reminders_cache';
const CACHE_TTL_MS = 15 * 60 * 1000;

function readRemindersCache(): Reminder[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: { reminders: Reminder[]; cachedAt: number } = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed.reminders ?? null;
  } catch { return null; }
}

function writeRemindersCache(reminders: Reminder[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ reminders, cachedAt: Date.now() })); } catch { /* ignore */ }
}

const RECURRENCE_LABELS: Record<string, string> = {
  once: 'Однократно',
  daily: 'Каждый день',
  weekly: 'Каждую неделю',
  monthly: 'Каждый месяц',
  yearly: 'Каждый год',
};

export function Reminders() {
  const { user } = useAppStore();
  const cacheRef = useRef(readRemindersCache());
  const [reminders, setReminders] = useState<Reminder[]>(() => cacheRef.current ?? []);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(!cacheRef.current);
  const [error, setError] = useState<string | null>(null);

  const currency = user?.currency || 'RUB';
  const fmt = (n: number) =>
    n.toLocaleString('ru', { style: 'currency', currency, maximumFractionDigits: 0 });

  const load = useCallback(async (background = false) => {
    if (!background) { setLoading(true); setError(null); }
    try {
      const { data } = await remindersApi.list();
      setReminders(data);
      writeRemindersCache(data);
    } catch {
      setError('Не удалось загрузить напоминания');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(!!cacheRef.current);
  }, [load, user?.currentBudgetId]);

  const handleToggle = async (r: Reminder) => {
    const updated = reminders.map((x) => (x.id === r.id ? { ...x, isActive: !x.isActive } : x));
    setReminders(updated);
    writeRemindersCache(updated);
    try {
      await remindersApi.update(r.id, { isActive: !r.isActive });
    } catch {
      const rollback = reminders.map((x) => (x.id === r.id ? { ...x, isActive: r.isActive } : x));
      setReminders(rollback);
      writeRemindersCache(rollback);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const updated = reminders.filter((r) => r.id !== id);
    try {
      await remindersApi.remove(id);
      setReminders(updated);
      writeRemindersCache(updated);
    } catch {
      setError('Не удалось удалить напоминание. Попробуйте ещё раз.');
    }
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
    if (days < 0) return '#ef5350';
    if (days <= 3) return '#ffa726';
    return 'var(--text-tertiary)';
  };

  return (
    <div className="page" style={{ paddingLeft: 16, paddingRight: 16 }}>
      <div style={{ paddingTop: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Платежи</h1>
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Добавить
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p className="section-title" style={{ padding: '0 4px', marginBottom: '4px' }}>Активные</p>
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
            >
              <Card padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <SkeletonPiece width={40} height={40} borderRadius={999} delay={i * 0.1} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <SkeletonPiece width="80%" height={14} borderRadius={999} delay={i * 0.1 + 0.05} />
                      <SkeletonPiece width={70} height={10} borderRadius={999} delay={i * 0.1 + 0.1} />
                    </div>
                  </div>
                  <SkeletonPiece width={50} height={14} borderRadius={999} delay={i * 0.1 + 0.03} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : error ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--expense)', marginBottom: '12px' }}>{error}</p>
          <Button variant="secondary" size="sm" onClick={load}>Повторить</Button>
        </Card>
      ) : reminders.length === 0 ? (
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
                {active.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                  >
                    <ReminderCard
                    key={r.id}
                    reminder={r}
                    fmt={fmt}
                    daysUntil={getDaysUntil(r.nextDate)}
                    urgencyColor={getUrgencyColor(r.nextDate)}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={setEditTarget}
                  />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p className="section-title" style={{ padding: '0 4px', marginBottom: '10px' }}>Отключённые</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {inactive.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                  >
                    <ReminderCard
                    key={r.id}
                    reminder={r}
                    fmt={fmt}
                    daysUntil={getDaysUntil(r.nextDate)}
                    urgencyColor="var(--text-tertiary)"
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={setEditTarget}
                  />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showForm && (
          <ReminderFormModal
            title="Новое напоминание"
            initial={{ title: '', amount: '', recurrence: 'monthly', nextDate: new Date().toISOString().slice(0, 10) }}
            onClose={() => setShowForm(false)}
            onSubmit={async (data) => {
              await remindersApi.create(data);
              await load();
            }}
          />
        )}
        {editTarget && (
          <ReminderFormModal
            title="Редактировать напоминание"
            initial={{
              title: editTarget.title,
              amount: editTarget.amount ? String(editTarget.amount) : '',
              recurrence: editTarget.recurrence,
              nextDate: new Date(editTarget.nextDate).toISOString().slice(0, 10),
            }}
            onClose={() => setEditTarget(null)}
            onSubmit={async (data) => {
              await remindersApi.update(editTarget.id, data);
              await load();
            }}
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
  onEdit,
}: {
  reminder: Reminder;
  fmt: (n: number) => string;
  daysUntil: string;
  urgencyColor: string;
  onToggle: (r: Reminder) => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (r: Reminder) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(r.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Card padding="md" style={{ opacity: r.isActive ? 1 : 0.55 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '999px',
              background: 'var(--bg-icon)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={18} color={r.isActive ? '#ffa726' : 'rgba(240,240,245,0.3)'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{r.title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: urgencyColor, fontWeight: 600 }}>{daysUntil}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {new Date(r.nextDate).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
              </span>
              <Badge>{RECURRENCE_LABELS[r.recurrence] || r.recurrence}</Badge>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          {r.amount && (
            <p style={{ fontWeight: 700, color: 'var(--expense)', fontSize: '15px' }}>
              {fmt(r.amount)}
            </p>
          )}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {confirmDelete ? (
              <>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  style={{ background: 'rgba(239,83,80,0.2)', color: '#ef5350', border: 'none', borderRadius: '999px', padding: '4px 8px', fontSize: '12px', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? '...' : 'Да'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '999px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Нет
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onEdit(r)}
                  style={{ padding: '5px', borderRadius: '999px', background: 'var(--bg-icon)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onToggle(r)}
                  style={{
                    padding: '5px',
                    borderRadius: '999px',
                    background: 'var(--bg-icon)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    color: r.isActive ? '#ffa726' : 'var(--text-tertiary)',
                  }}
                >
                  {r.isActive ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ padding: '5px', borderRadius: '999px', background: 'rgba(239,83,80,0.1)', border: 'none', cursor: 'pointer', color: '#ef5350' }}
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReminderFormModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: { title: string; amount: string; recurrence: string; nextDate: string };
  onClose: () => void;
  onSubmit: (data: { title: string; amount?: number; recurrence: string; nextDate: string }) => Promise<void>;
}) {
  const [reminderTitle, setReminderTitle] = useState(initial.title);
  const [amount, setAmount] = useState(initial.amount);
  const [recurrence, setRecurrence] = useState(initial.recurrence);
  const [nextDate, setNextDate] = useState(initial.nextDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragControls = useDragControls();

  const handleSubmit = async () => {
    if (!reminderTitle.trim()) {
      setError('Введите название напоминания');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        title: reminderTitle,
        amount: amount ? parseFloat(amount) : undefined,
        recurrence,
        nextDate,
      });
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', padding: '0 12px calc(12px + var(--nav-height) + var(--safe-bottom))', boxSizing: 'border-box' }}
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
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-panel)',
          overflow: 'hidden',
        }}
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          style={{ paddingTop: '10px', flexShrink: 0, cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: 36, height: 4, margin: '0 auto 12px', borderRadius: 2, background: 'var(--border)' }} />
        </div>
        <div style={{ padding: '20px 20px 12px', flexShrink: 0, borderBottom: '1px solid var(--divider)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '18px' }}>{title}</h3>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            padding: '16px 20px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
          }}
        >
          <input
            type="text"
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
            placeholder="Название (например: Аренда)"
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Сумма (необязательно)"
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          />
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          >
            {Object.entries(RECURRENCE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: error ? '12px' : '0', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          />
          {error && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--expense-bg)', border: '1px solid rgba(255,82,82,0.22)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--expense)' }}>
              {error}
            </div>
          )}
        </div>
        <div style={{ padding: '16px 20px 20px', flexShrink: 0, borderTop: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Отмена</Button>
            <Button variant="primary" size="md" onClick={handleSubmit} loading={loading} style={{ flex: 2 }}>Сохранить</Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
