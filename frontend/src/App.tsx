import React, { useEffect, useState } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useAppStore } from './store/index.ts';
import { healthApi } from './api/client.ts';
import { BottomNav } from './components/ui/BottomNav.tsx';
import { AuthScreen } from './screens/AuthScreen.tsx';
import { Dashboard } from './screens/Dashboard.tsx';
import { Transactions } from './screens/Transactions.tsx';
import { Statistics } from './screens/Statistics.tsx';
import { Reminders } from './screens/Reminders.tsx';
import { Settings } from './screens/Settings.tsx';

const TAB_PATHS = ['/', '/transactions', '/stats', '/reminders', '/settings'] as const;

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const canonicalPath = TAB_PATHS.includes(path as (typeof TAB_PATHS)[number]) ? path : '/';

  useEffect(() => {
    if (path !== canonicalPath) navigate(canonicalPath, { replace: true });
  }, [path, canonicalPath, navigate]);
  const [mountedPaths, setMountedPaths] = useState<readonly string[]>(() => [canonicalPath]);

  useEffect(() => {
    if (!mountedPaths.includes(canonicalPath)) {
      setMountedPaths((prev) => [...prev, canonicalPath]);
    }
  }, [canonicalPath, mountedPaths]);

  const isActive = (p: string) => p === canonicalPath;

  return (
    <div className="app-container">
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          {mountedPaths.includes('/') && (
            <div
              style={{
                display: isActive('/') ? 'block' : 'none',
                height: '100%',
                overflow: 'auto',
              }}
            >
              <Dashboard />
            </div>
          )}
          {mountedPaths.includes('/transactions') && (
            <div
              style={{
                display: isActive('/transactions') ? 'block' : 'none',
                height: '100%',
                overflow: 'auto',
              }}
            >
              <Transactions />
            </div>
          )}
          {mountedPaths.includes('/stats') && (
            <div
              style={{
                display: isActive('/stats') ? 'block' : 'none',
                height: '100%',
                overflow: 'auto',
              }}
            >
              <Statistics />
            </div>
          )}
          {mountedPaths.includes('/reminders') && (
            <div
              style={{
                display: isActive('/reminders') ? 'block' : 'none',
                height: '100%',
                overflow: 'auto',
              }}
            >
              <Reminders />
            </div>
          )}
          {mountedPaths.includes('/settings') && (
            <div
              style={{
                display: isActive('/settings') ? 'block' : 'none',
                height: '100%',
                overflow: 'auto',
              }}
            >
              <Settings />
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

const TG_HEADER_BG = '#0a0f0b'; // тёмный зеленовато-серый, как фон приложения

export default function App() {
  const { token, user } = useAppStore();
  const isAuthenticated = !!token && !!user;

  // Окрашиваем верхнюю панель Telegram Mini App в цвет фона приложения
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.setHeaderColor(TG_HEADER_BG);
      WebApp.setBackgroundColor(TG_HEADER_BG);
    } catch {
      // Обычный браузер — игнорируем ошибки Telegram SDK
    }
  }, []);

  // Pre-warm backend (Render free tier sleeps, first request can take ~50s)
  useEffect(() => {
    if (isAuthenticated) {
      healthApi.ping().catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      {isAuthenticated ? <AppShell /> : <AuthScreen />}
    </BrowserRouter>
  );
}
