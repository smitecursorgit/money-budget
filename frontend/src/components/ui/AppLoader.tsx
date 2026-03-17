import React from 'react';
import { motion } from 'framer-motion';

function dotVariants(delay: number) {
  return {
    initial: { scale: 0.6, opacity: 0.4 },
    animate: {
      scale: [0.6, 1.2, 0.6],
      opacity: [0.4, 1, 0.4],
      transition: {
        duration: 1.4,
        repeat: Infinity,
        ease: 'easeInOut' as const,
        delay,
      },
    },
  };
}

export function AppLoader() {
  return (
    <div
      className="app-loader"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse 100% 100% at 50% 50%, #0e1510 0%, #0c120e 25%, #0a0f0b 50%, #080c09 75%, #060907 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Animated ring */}
      <motion.div
        style={{
          position: 'relative',
          width: 80,
          height: 80,
          marginBottom: 24,
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.12)',
            borderTopColor: 'rgba(255,255,255,0.9)',
            borderRightColor: 'rgba(102,187,106,0.5)',
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: '50%',
            border: '1.5px solid transparent',
            borderTopColor: 'rgba(102,187,106,0.6)',
            borderLeftColor: 'rgba(255,255,255,0.2)',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 24,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(102,187,106,0.15) 0%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* Bouncing dots */}
      <motion.div
        initial="initial"
        animate="animate"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            variants={dotVariants(i * 0.15)}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 0 12px rgba(102,187,106,0.3)',
            }}
          />
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}
      >
        Загрузка
      </motion.p>
    </div>
  );
}
