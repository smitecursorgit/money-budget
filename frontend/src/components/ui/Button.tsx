import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

const variants = {
  primary: {
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
  },
  secondary: {
    background: 'rgba(255,255,255,0.07)',
    color: 'rgba(255,255,255,0.90)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.10) inset',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--accent)',
    border: 'none',
    boxShadow: 'none',
  },
  danger: {
    background: 'rgba(255,69,58,0.12)',
    color: '#ff453a',
    border: '1px solid rgba(255,69,58,0.22)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset',
  },
};

const sizes = {
  sm: { padding: '7px 14px', fontSize: '13px', borderRadius: 'var(--radius-pill)', height: '34px' },
  md: { padding: '11px 20px', fontSize: '15px', borderRadius: 'var(--radius-pill)', height: '46px' },
  lg: { padding: '15px 28px', fontSize: '16px', borderRadius: 'var(--radius-pill)', height: '54px' },
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  style: extraStyle,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      data-variant={variant}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={className}
      style={{
        ...variants[variant],
        ...sizes[size],
        ...extraStyle,
        width: fullWidth ? '100%' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity 0.2s',
        userSelect: 'none',
        backdropFilter: variant !== 'primary' ? 'blur(20px)' : undefined,
        WebkitBackdropFilter: variant !== 'primary' ? 'blur(20px)' : undefined,
      }}
    >
      {loading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'inline-block', fontSize: '16px' }}
        >
          ⟳
        </motion.span>
      ) : children}
    </motion.button>
  );
}
