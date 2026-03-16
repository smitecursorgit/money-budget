import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'income' | 'expense' | 'custom';
}

export function Badge({ children, color, variant }: BadgeProps) {
  let bg = 'rgba(255,255,255,0.08)';
  let textColor = 'rgba(240,240,245,0.7)';

  if (variant === 'income') { bg = 'rgba(34,197,94,0.15)'; textColor = '#22c55e'; }
  if (variant === 'expense') { bg = 'rgba(239,68,68,0.15)'; textColor = '#ef4444'; }
  if (color) { bg = `${color}22`; textColor = color; }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        background: bg,
        color: textColor,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
