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
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(var(--nav-height) + var(--safe-bottom))',
        paddingBottom: 'var(--safe-bottom)',
        background: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: '8px',
        zIndex: 100,
      }}
    >
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              position: 'relative',
            }}
          >
            <motion.div
              animate={{ scale: active ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ position: 'relative' }}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  style={{
                    position: 'absolute',
                    inset: '-6px',
                    borderRadius: '12px',
                    background: 'rgba(108, 99, 255, 0.2)',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                color={active ? '#a78bfa' : 'rgba(240,240,245,0.35)'}
                strokeWidth={active ? 2.2 : 1.8}
                style={{ position: 'relative', zIndex: 1 }}
              />
            </motion.div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: active ? 600 : 400,
                color: active ? '#a78bfa' : 'rgba(240,240,245,0.35)',
                letterSpacing: '0.01em',
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
