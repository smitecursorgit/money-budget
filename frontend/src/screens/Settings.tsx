import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ChevronRight, Check } from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { categoriesApi, settingsApi } from '../api/client.ts';
import { useAppStore } from '../store/index.ts';
import { Category } from '../types/index.ts';

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
  'Asia/Tashkent',
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
  const { user, setUser, categories, setCategories } = useAppStore();
  const [currency, setCurrency] = useState(user?.currency || 'RUB');
  const [timezone, setTimezone] = useState(user?.timezone || 'Europe/Moscow');
  const [periodStart, setPeriodStart] = useState(user?.periodStart || 1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const loadCategories = useCallback(async () => {
    const { data } = await categoriesApi.list();
    setCategories(data);
  }, [setCategories]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data } = await settingsApi.update({ currency, timezone, periodStart });
      setUser({ ...user!, ...data });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    await categoriesApi.remove(id);
    setCategories(categories.filter((c) => c.id !== id));
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className="page" style={{ padding: '0 16px' }}>
      <div style={{ paddingTop: '20px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Настройки</h1>
      </div>

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
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
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
      </AnimatePresence>
    </div>
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

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const kw = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    try {
      if (category) {
        await categoriesApi.update(category.id, { name, type, icon, color, keywords: kw });
      } else {
        await categoriesApi.create({ name, type, icon, color, keywords: kw });
      }
      onSaved();
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
        style={{ width: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '20px', backdropFilter: 'blur(40px)' }}
      >
        <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>
          {category ? 'Редактировать' : 'Новая'} категория
        </h3>

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
                background: icon === e ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.05)',
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
          style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Отмена</Button>
          <Button variant="primary" size="md" onClick={handleSubmit} loading={loading} style={{ flex: 2 }}>
            {category ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
