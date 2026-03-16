import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Plus, Pencil, Trash2, ChevronRight, Check } from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { categoriesApi, settingsApi, budgetsApi } from '../api/client.ts';
import { useAppStore } from '../store/index.ts';
import { Category, Budget } from '../types/index.ts';

const CURRENCIES = ['RUB', 'USD', 'EUR', 'GBP', 'KZT', 'UAH', 'BYN', 'TRY', 'AED', 'CNY', 'JPY'];
const TIMEZONES = [
  // Russia
  'Europe/Kaliningrad',
  'Europe/Moscow',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  // CIS
  'Europe/Minsk',
  'Europe/Kyiv',
  'Asia/Almaty',
  'Asia/Tashkent',
  'Asia/Baku',
  'Asia/Tbilisi',
  'Asia/Yerevan',
  // Europe
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Istanbul',
  // Asia & other
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'America/New_York',
  'America/Los_Angeles',
];
const EMOJI_LIST = ['💰', '🛒', '☕', '🚇', '🏠', '🍽️', '🎬', '💊', '🚬', '📱', '📦', '💼', '💻', '🎮', '🏋️', '✈️', '🎓', '💈'];
const COLORS = ['#6c63ff', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#f97316', '#8b5cf6', '#06b6d4'];

export function Settings() {
  const { user, setUser, categories, setCategories, budgets, setBudgets } = useAppStore();
  const [currency, setCurrency] = useState(user?.currency || 'RUB');
  const [timezone, setTimezone] = useState(user?.timezone || 'Europe/Moscow');
  const [periodStart, setPeriodStart] = useState(user?.periodStart || 1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [showAddBudget, setShowAddBudget] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await categoriesApi.list();
      setCategories(data);
    } catch {
      // Categories remain from store cache, not critical
    }
  }, [setCategories]);

  const loadBudgets = useCallback(async () => {
    try {
      const { data } = await budgetsApi.list();
      setBudgets(data);
    } catch { /* ignore */ }
  }, [setBudgets]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadBudgets(); }, [loadBudgets]);

  const saveSettings = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data } = await settingsApi.update({ currency, timezone, periodStart });
      setUser({ ...user!, ...data });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('Не удалось сохранить настройки. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeleteError(null);
    try {
      await categoriesApi.remove(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch {
      setDeleteError('Не удалось удалить категорию. Попробуйте ещё раз.');
    }
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className="page" style={{ paddingLeft: 16, paddingRight: 16 }}>
      <div style={{ paddingTop: '20px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Настройки</h1>
      </div>

      {/* Профили бюджета */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '20px' }}>
        <p className="section-title" style={{ padding: '0 4px', marginBottom: '10px' }}>Профили бюджета</p>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '10px', padding: '0 4px' }}>
          Создайте несколько бюджетов (например: личный, семейный) и переключайтесь между ними.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {budgets.map((b) => (
            <Card key={b.id} padding="sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>
                    {b.name}
                    {user?.currentBudgetId === b.id && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>• активен</span>
                    )}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Начальный баланс: {Number(b.initialBalance || 0).toLocaleString('ru')} ₽
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setEditBudget(b)}
                    style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'rgba(240,240,245,0.5)' }}
                  >
                    <Pencil size={14} />
                  </button>
                  {budgets.length > 1 && (
                    <button
                      onClick={async () => {
                        if (!confirm('Удалить профиль? Данные не восстановить.')) return;
                        try {
                          await budgetsApi.remove(b.id);
                          if (user?.currentBudgetId === b.id) {
                            const next = budgets.find((x) => x.id !== b.id);
                            if (next) await budgetsApi.select(next.id);
                            const { data } = await budgetsApi.list();
                            setBudgets(data);
                            setUser({ ...user!, currentBudgetId: next?.id });
                          }
                          loadBudgets();
                        } catch { setDeleteError('Не удалось удалить'); }
                      }}
                      style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {user?.currentBudgetId !== b.id && (
                    <button
                      onClick={async () => {
                        try {
                          await budgetsApi.select(b.id);
                          setUser({ ...user!, currentBudgetId: b.id });
                        } catch { /* ignore */ }
                      }}
                      style={{ padding: '6px 10px', background: 'var(--accent-dim)', border: '1px solid rgba(34,197,94,0.28)', borderRadius: '8px', cursor: 'pointer', color: 'var(--accent)', fontSize: '12px', fontWeight: 600 }}
                    >
                      Выбрать
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowAddBudget(true)} style={{ marginTop: 10 }}>
          <Plus size={16} /> Добавить профиль
        </Button>
      </motion.div>

      {/* General settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '20px' }}>
        <p className="section-title" style={{ padding: '0 4px', marginBottom: '10px' }}>Общие</p>
        <Card padding="md">
          <SettingRow label="Валюта">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '14px' }}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </SettingRow>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 0' }} />

          <SettingRow label="Часовой пояс">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px', maxWidth: '180px' }}
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
            </select>
          </SettingRow>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 0' }} />

          <SettingRow label="Начало периода">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: 'rgba(240,240,245,0.5)' }}>с</span>
              <input
                type="number"
                min={1}
                max={28}
                value={periodStart}
                onChange={(e) => setPeriodStart(parseInt(e.target.value) || 1)}
                style={{ width: '52px', padding: '6px', borderRadius: '8px', textAlign: 'center', fontSize: '14px' }}
              />
              <span style={{ fontSize: '14px', color: 'rgba(240,240,245,0.5)' }}>числа</span>
            </div>
          </SettingRow>
        </Card>

        <div style={{ marginTop: '12px' }}>
          {saveError && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '8px', textAlign: 'center' }}>{saveError}</p>
          )}
          {deleteError && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '8px', textAlign: 'center' }}>{deleteError}</p>
          )}
          <Button variant="primary" fullWidth size="md" onClick={saveSettings} loading={saving}>
            {saved ? <><Check size={16} /> Сохранено!</> : 'Сохранить настройки'}
          </Button>
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
          <p className="section-title" style={{ padding: 0, margin: 0 }}>Категории</p>
          <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(true)}>
            <Plus size={16} /> Добавить
          </Button>
        </div>

        {incomeCategories.length > 0 && (
          <>
            <p style={{ fontSize: '12px', color: 'var(--income)', fontWeight: 600, padding: '0 4px', marginBottom: '6px' }}>ДОХОДЫ</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {incomeCategories.map((c) => (
                <CategoryRow key={c.id} category={c} onEdit={setEditCategory} onDelete={handleDeleteCategory} />
              ))}
            </div>
          </>
        )}

        {expenseCategories.length > 0 && (
          <>
            <p style={{ fontSize: '12px', color: 'var(--expense)', fontWeight: 600, padding: '0 4px', marginBottom: '6px' }}>РАСХОДЫ</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {expenseCategories.map((c) => (
                <CategoryRow key={c.id} category={c} onEdit={setEditCategory} onDelete={handleDeleteCategory} />
              ))}
            </div>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {(editCategory || showAddCategory) && (
          <CategoryModal
            category={editCategory}
            onClose={() => { setEditCategory(null); setShowAddCategory(false); }}
            onSaved={() => { loadCategories(); setEditCategory(null); setShowAddCategory(false); }}
          />
        )}
        {(editBudget || showAddBudget) && (
          <BudgetModal
            budget={editBudget}
            onClose={() => { setEditBudget(null); setShowAddBudget(false); }}
            onSaved={() => { loadBudgets(); setEditBudget(null); setShowAddBudget(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BudgetModal({ budget, onClose, onSaved }: { budget: Budget | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(budget?.name || '');
  const [initialBalance, setInitialBalance] = useState(String(budget ? Number(budget.initialBalance) : 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragControls = useDragControls();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const bal = parseFloat(initialBalance.replace(/\s/g, '')) || 0;
      if (budget) {
        await budgetsApi.update(budget.id, { name, initialBalance: bal });
      } else {
        await budgetsApi.create({ name });
        const { data } = await budgetsApi.list();
        const created = data.find((b) => b.name === name);
        if (created && bal !== 0) await budgetsApi.update(created.id, { initialBalance: bal });
      }
      onSaved();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error || err.message || 'Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', padding: '0 12px calc(12px + var(--nav-height) + var(--safe-bottom))', boxSizing: 'border-box' }}
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
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(8,8,8,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 'var(--radius-panel)',
          overflow: 'hidden',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          style={{ paddingTop: '10px', flexShrink: 0, cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: 36, height: 4, margin: '0 auto 12px', borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
        </div>
        <div style={{ padding: '20px 20px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '18px' }}>{budget ? 'Редактировать' : 'Новый'} профиль</h3>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название (например: Личный, Семейный)"
            style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}
          />
          {budget && (
            <div>
              <p style={{ fontSize: '12px', color: 'rgba(240,240,245,0.4)', marginBottom: '6px' }}>Начальный баланс</p>
              <input
                type="text"
                inputMode="decimal"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}
              />
            </div>
          )}
          {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{error}</p>}
        </div>
        <div style={{ padding: '16px 20px 20px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Отмена</Button>
            <Button variant="primary" size="md" onClick={handleSubmit} loading={loading} style={{ flex: 2 }}>
              {budget ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '15px' }}>{label}</span>
      {children}
    </div>
  );
}

function CategoryRow({
  category: c,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card padding="sm">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              background: `${c.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            {c.icon}
          </div>
          <div>
            <p style={{ fontWeight: 500, fontSize: '14px' }}>{c.name}</p>
            {c.keywords.length > 0 && (
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                {c.keywords.slice(0, 3).join(', ')}{c.keywords.length > 3 ? '...' : ''}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {confirmDelete ? (
            <>
              <button
                onClick={() => onDelete(c.id)}
                style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                Удалить
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(240,240,245,0.5)', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }}
              >
                Нет
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(c)}
                style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'rgba(240,240,245,0.5)' }}
              >
                <Pencil size={14} />
              </button>
              {!c.isDefault && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#ef4444' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [type, setType] = useState<'income' | 'expense'>(category?.type || 'expense');
  const [icon, setIcon] = useState(category?.icon || '💰');
  const [color, setColor] = useState(category?.color || '#6c63ff');
  const [keywords, setKeywords] = useState(category?.keywords.join(', ') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragControls = useDragControls();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const kw = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    try {
      if (category) {
        await categoriesApi.update(category.id, { name, type, icon, color, keywords: kw });
      } else {
        await categoriesApi.create({ name, type, icon, color, keywords: kw });
      }
      onSaved();
    } catch {
      setError('Не удалось сохранить категорию. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', padding: '0 12px calc(12px + var(--nav-height) + var(--safe-bottom))', boxSizing: 'border-box' }}
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
          height: '85vh',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(8,8,8,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 'var(--radius-panel)',
          overflow: 'hidden',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          style={{ paddingTop: '10px', flexShrink: 0, cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: 36, height: 4, margin: '0 auto 12px', borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
        </div>
        <div style={{ padding: '20px 20px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '18px' }}>
            {category ? 'Редактировать' : 'Новая'} категория
          </h3>
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название"
            style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px' }}
          />

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
                {t === 'income' ? 'Доход' : 'Расход'}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(240,240,245,0.4)', marginBottom: '8px' }}>Иконка</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            {EMOJI_LIST.map((e) => (
              <button
                key={e}
                onClick={() => setIcon(e)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  fontSize: '20px',
                  border: `2px solid ${icon === e ? 'var(--accent)' : 'transparent'}`,
                  background: icon === e ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                }}
              >
                {e}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(240,240,245,0.4)', marginBottom: '8px' }}>Цвет</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: c,
                  border: `3px solid ${color === c ? '#fff' : 'transparent'}`,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Ключевые слова через запятую (зп, salary...)"
            style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: error ? '12px' : '0' }}
          />

          {error && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{error}</p>
          )}
        </div>
        <div style={{ padding: '16px 20px 20px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Отмена</Button>
            <Button variant="primary" size="md" onClick={handleSubmit} loading={loading} style={{ flex: 2 }}>
              {category ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
