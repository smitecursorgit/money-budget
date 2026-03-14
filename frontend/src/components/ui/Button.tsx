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
    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    background: 'rgba(255,255,255,0.06)',
    color: '#f0f0f5',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  ghost: {
    background: 'transparent',
    color: '#a78bfa',
    border: 'none',
  },
  danger: {
    background: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.25)',
  },
};

const sizes = {
  sm: { padding: '8px 14px', fontSize: '13px', borderRadius: '10px', height: '36px' },
  md: { padding: '12px 20px', fontSize: '15px', borderRadius: '14px', height: '46px' },
  lg: { padding: '16px 28px', fontSize: '16px', borderRadius: '16px', height: '54px' },
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
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={className}
      style={{
        ...variants[variant],
        ...sizes[size],
        ...extraStyle,
        width: fullWidth ? '100%' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.2s',
        userSelect: 'none',
      }}
    >
      {loading ? <span className="spin">⟳</span> : children}
    </motion.button>
  );
}
