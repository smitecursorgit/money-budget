import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Sparkles,
  Bell,
  Settings,
  Mic,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
};

const steps: { icon: typeof LayoutDashboard; title: string; text: string }[] = [
  {
    icon: LayoutDashboard,
    title: 'Главная',
    text: 'Сводка по балансу, последние операции и напоминания. Кнопка с микрофоном — голосом можно добавить доход или расход.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Операции',
    text: 'Полный список транзакций: фильтры, категории, редактирование и ручное добавление записей.',
  },
  {
    icon: BarChart3,
    title: 'Статистика',
    text: 'Графики и цифры: куда уходят деньги и как меняется картина за период.',
  },
  {
    icon: Sparkles,
    title: 'Ассистент',
    text: 'Задавайте вопросы про бюджет и траты — подсказки на основе ваших данных.',
  },
  {
    icon: Bell,
    title: 'Напоминания',
    text: 'Платежи и события, о которых не стоит забывать.',
  },
  {
    icon: Settings,
    title: 'Настройки',
    text: 'Категории, бюджеты, профиль и параметры приложения.',
  },
];

type WelcomeScreenProps = {
  onContinue: () => void;
};

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <div
      style={{
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(ellipse 90% 55% at 50% 0%, #1a1a1a 0%, #111111 40%, #0a0a0a 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        className="page-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: 'calc(20px + env(safe-area-inset-top, 0px)) var(--page-x) 24px',
        }}
      >
        <motion.div {...fadeUp}>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: '8px',
            }}
          >
            Добро пожаловать
          </p>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              color: 'var(--text-primary)',
              marginBottom: '10px',
            }}
          >
            Как устроено приложение
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.55, marginBottom: '22px' }}>
            Нижняя панель переключает разделы. Данные сохраняются в вашем аккаунте — с телефона можно вести бюджет в
            пару касаний или голосом. Все функции доступны бесплатно.
          </p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + i * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
              >
                <Card padding="md" style={{ border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        flexShrink: 0,
                        width: '42px',
                        height: '42px',
                        borderRadius: '14px',
                        background: 'var(--bg-icon)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <Icon size={20} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
                          {step.title}
                        </span>
                        {step.title === 'Главная' && (
                          <Mic size={14} color="rgba(255,255,255,0.35)" strokeWidth={2} aria-hidden />
                        )}
                      </div>
                      <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>{step.text}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '12px var(--page-x) calc(16px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(to top, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.88) 55%, transparent 100%)',
          borderTop: '1px solid var(--divider)',
        }}
      >
        <Button variant="primary" size="lg" fullWidth onClick={onContinue}>
          Понятно, начать
        </Button>
      </div>
    </div>
  );
}
