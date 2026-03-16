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
    background: '#ffffff',
    color: '#000000',
    border: 'none',
    boxShadow: '0 4px 20px rgba(255,255,255,0.12)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.07)',
    color: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
  },
  ghost: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.70)',
    border: 'none',
    boxShadow: 'none',
  },
  danger: {
    background: 'rgba(239,83,80,0.12)',
    color: '#ef5350',
    border: '1px solid rgba(239,83,80,0.20)',
    boxShadow: 'none',
  },
};

const sizes = {
  sm: { padding: '8px 16px', fontSize: '13px', borderRadius: '999px', height: '36px' },
  md: { padding: '13px 24px', fontSize: '15px', borderRadius: '999px', height: '50px' },
  lg: { padding: '16px 30px', fontSize: '16px', borderRadius: '999px', height: '56px' },
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
        fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        letterSpacing: '-0.01em',
        userSelect: 'none',
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
