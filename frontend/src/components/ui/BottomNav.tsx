import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, BarChart3, Bell, Settings } from 'lucide-react';

const tabs = [
  { path: '/', icon: LayoutDashboard, label: 'Главная' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Операции' },
  { path: '/stats', icon: BarChart3, label: 'Статистика' },
  { path: '/reminders', icon: Bell, label: 'Платежи' },
  { path: '/settings', icon: Settings, label: 'Настройки' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 'calc(12px + var(--safe-bottom))',
        left: '14px',
        right: '14px',
        height: '64px',
        background: 'rgba(8, 8, 8, 0.55)',
        backdropFilter: 'blur(64px) saturate(180%)',
        WebkitBackdropFilter: 'blur(64px) saturate(180%)',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 -16px 48px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.09) inset',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        zIndex: 100,
      }}
    >
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            type="button"
            className="nav-tab-btn"
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              height: '48px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '24px',
              position: 'relative',
            }}
          >
            {active && (
              <motion.div
                layoutId="nav-pill"
                style={{
                  position: 'absolute',
                  inset: '2px 4px',
                  borderRadius: '22px',
                  background: 'var(--accent-dim)',
                  border: '1px solid rgba(34,197,94,0.28)',
                  boxShadow: '0 0 16px var(--accent-glow), 0 1px 0 rgba(255,255,255,0.06) inset',
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <motion.div
              animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <Icon
                size={20}
                color={active ? 'var(--accent)' : 'rgba(255,255,255,0.28)'}
                strokeWidth={active ? 2.2 : 1.8}
              />
            </motion.div>
            <span
              style={{
                fontSize: '9px',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent)' : 'rgba(255,255,255,0.25)',
                letterSpacing: '0.02em',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
