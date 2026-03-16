import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  onClick?: () => void;
}

const paddingMap = {
  none: '0',
  sm: '12px',
  md: '16px',
  lg: '20px',
};

export function Card({ children, className = '', padding = 'md', onClick, style, ...rest }: CardProps) {
  return (
    <motion.div
      className={`glass-card ${className}`}
      style={{ padding: paddingMap[padding], ...style }}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
