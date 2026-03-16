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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
}

function AppShell() {
  return (
    <div className="app-container">
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
