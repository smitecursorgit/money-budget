import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from './store/index.ts';
import { BottomNav } from './components/ui/BottomNav.tsx';
import { AuthScreen } from './screens/AuthScreen.tsx';
import { Dashboard } from './screens/Dashboard.tsx';
import { Transactions } from './screens/Transactions.tsx';
import { Statistics } from './screens/Statistics.tsx';
import { Reminders } from './screens/Reminders.tsx';
import { Settings } from './screens/Settings.tsx';

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ flex: 1, minHeight: 0, position: 'relative' }}
    >
      {children}
    </motion.div>
  );
}

function AmbientBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Top-right green orb */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-20%',
          width: '75vw',
          height: '75vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(48,209,88,0.16) 0%, transparent 65%)',
        }}
      />
      {/* Bottom-left deep green orb */}
      <div
        style={{
          position: 'absolute',
          bottom: '-5%',
          left: '-25%',
          width: '65vw',
          height: '65vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(48,209,88,0.09) 0%, transparent 65%)',
        }}
      />
      {/* Center subtle green orb */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '30%',
          width: '40vw',
          height: '40vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,222,128,0.05) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

function AppShell() {
  return (
    <div className="app-container">
      <AmbientBackground />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
            <Route path="/transactions" element={<PageWrapper><Transactions /></PageWrapper>} />
            <Route path="/stats" element={<PageWrapper><Statistics /></PageWrapper>} />
            <Route path="/reminders" element={<PageWrapper><Reminders /></PageWrapper>} />
            <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  const { token, user } = useAppStore();
  const isAuthenticated = !!token && !!user;

  return (
    <BrowserRouter>
      {isAuthenticated ? <AppShell /> : <AuthScreen />}
    </BrowserRouter>
  );
}
