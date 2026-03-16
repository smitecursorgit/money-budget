import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WebApp from '@twa-dev/sdk';
import { authApi, categoriesApi } from '../api/client.ts';
import { useAppStore } from '../store/index.ts';

export function AuthScreen() {
  const { setToken, setUser, setCategories, setBudgets } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const authenticate = async () => {
      setError(null);
      setLoading(true);
      try {
        try {
          WebApp.ready();
          WebApp.expand();
          WebApp.setHeaderColor('#000000');
          WebApp.setBackgroundColor('#000000');
        } catch {
          // Running in a regular browser — ignore Telegram SDK errors
        }

        const initData = WebApp.initData || 'dev';
        const { data } = await authApi.login(initData);
        setToken(data.token);
        setUser(data.user);
        if (data.budgets) setBudgets(data.budgets);

        const catRes = await categoriesApi.list();
        setCategories(catRes.data);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string; detail?: string }; status?: number } };
        const serverMsg = axiosErr?.response?.data?.error;
        const serverDetail = axiosErr?.response?.data?.detail;
        const status = axiosErr?.response?.status;
        const msg = serverMsg
          ? `${serverMsg}${serverDetail ? ': ' + serverDetail : ''}`
          : 'Ошибка авторизации. Попробуйте снова.';
        console.error('Auth error', status, msg, err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    authenticate();
  }, [setToken, setUser, setCategories, setBudgets, retryKey]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '32px',
        background: 'var(--bg-primary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          >
            {/* Spinner ring */}
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2.5px solid rgba(34,197,94,0.2)',
                  borderTopColor: '#22c55e',
                }}
              />
              <div style={{
                position: 'absolute',
                inset: '10px',
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.08)',
                backdropFilter: 'blur(10px)',
              }} />
            </div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: 500 }}>
              Загрузка...
            </p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(255,69,58,0.12)',
              border: '1px solid rgba(255,69,58,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}>
              ⚠️
            </div>
            <p style={{
              color: 'var(--expense)',
              fontWeight: 600,
              fontSize: '15px',
              maxWidth: '240px',
              lineHeight: 1.5,
            }}>
              {error}
            </p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              style={{
                padding: '12px 28px',
                borderRadius: 'var(--radius-pill)',
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
              }}
            >
              Попробовать снова
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
