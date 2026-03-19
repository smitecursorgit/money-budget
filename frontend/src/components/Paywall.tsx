import React, { useCallback, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { subscriptionApi } from '../api/client.ts';
import { useAppStore } from '../store/index.ts';
import { Button } from './ui/Button.tsx';

export function Paywall() {
  const { setUser, user } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPayment = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await subscriptionApi.createPayment();
      const url = data.confirmationUrl;
      if (!url) {
        setError('Не удалось получить ссылку на оплату');
        return;
      }
      try {
        WebApp.openLink(url);
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } }; message?: string };
      setError(ax.response?.data?.error || ax.message || 'Ошибка создания платежа');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!user) return;
    setError(null);
    setChecking(true);
    try {
      const { data } = await subscriptionApi.status();
      setUser({
        ...user,
        trialStart: data.trialStart,
        subscriptionEndsAt: data.subscriptionEndsAt,
        hasSubscriptionAccess: data.hasSubscriptionAccess,
      });
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } }; message?: string };
      setError(ax.response?.data?.error || ax.message || 'Не удалось проверить оплату');
    } finally {
      setChecking(false);
    }
  }, [setUser, user]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '32px 24px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse 90% 55% at 50% 0%, #1a1a1a 0%, #111111 40%, #0a0a0a 100%)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 320 }}>
        <h1
          style={{
            margin: 0,
            fontSize: '1.35rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.35,
          }}
        >
          Ваш пробный период закончился
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          Оформите подписку, чтобы снова вести бюджет, операции и напоминания.
        </p>
      </div>
      {error ? (
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#ef5350', maxWidth: 320 }}>{error}</p>
      ) : null}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Button variant="primary" fullWidth size="lg" loading={loading} onClick={() => void openPayment()}>
          Продлить доступ на месяц за 199₽
        </Button>
        <Button variant="ghost" fullWidth size="md" loading={checking} onClick={() => void refreshStatus()}>
          Я оплатил — проверить
        </Button>
      </div>
    </div>
  );
}
