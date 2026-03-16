import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, BarChart3, Bell, Settings } from 'lucide-react';

const tabs = [
  { path: '/', icon: LayoutDashboard },
  { path: '/transactions', icon: ArrowLeftRight },
  { path: '/stats', icon: BarChart3 },
  { path: '/reminders', icon: Bell },
  { path: '/settings', icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 'calc(8px + var(--safe-bottom))',
        left: '12px',
        right: '12px',
        zIndex: 100,
        background: 'rgba(28, 28, 28, 0.65)',
        backdropFilter: 'blur(16px) saturate(130%)',
        WebkitBackdropFilter: 'blur(16px) saturate(130%)',
        borderRadius: '28px',
        padding: '6px',
        display: 'flex',
        gap: '6px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {tabs.map(({ path, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            type="button"
            className="nav-tab-btn"
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '22px',
              position: 'relative',
              background: 'transparent',
            }}
          >
            {active && (
              <motion.div
                layoutId="nav-active"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '22px',
                  background: 'rgba(255,255,255,0.12)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Icon
                size={22}
                color={active ? '#ffffff' : 'rgba(255,255,255,0.28)'}
                strokeWidth={active ? 2.2 : 1.6}
              />
            </div>
          </button>
        );
      })}
    </nav>
  );
}
