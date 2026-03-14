import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import WebApp from '@twa-dev/sdk';
import { authApi, categoriesApi } from '../api/client.ts';
import { useAppStore } from '../store/index.ts';

export function AuthScreen() {
  const { setToken, setUser, setCategories } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authenticate = async () => {
      try {
        // WebApp methods only work inside Telegram — wrap safely
        try {
          WebApp.ready();
          WebApp.expand();
          WebApp.setHeaderColor('#0a0a0f');
          WebApp.setBackgroundColor('#0a0a0f');
        } catch {
          // Running in a regular browser — ignore Telegram SDK errors
        }

        const initData = WebApp.initData || 'dev';

        const { data } = await authApi.login(initData);
        setToken(data.token);
        setUser(data.user);

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
  }, [setToken, setUser, setCategories]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '20px',
        background: 'var(--bg-primary)',
      }}
    >
      {loading ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '3px solid rgba(108,99,255,0.2)',
              borderTopColor: '#6c63ff',
            }}
          />
          <p style={{ color: 'rgba(240,240,245,0.5)', fontSize: '14px' }}>Загрузка...</p>
        </motion.div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
          <p style={{ color: 'var(--expense)', fontWeight: 600 }}>{error}</p>
        </motion.div>
      ) : null}
    </div>
  );
}
