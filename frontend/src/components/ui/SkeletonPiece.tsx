import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonPieceProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  delay?: number;
  style?: React.CSSProperties;
}

export function SkeletonPiece({
  width = '100%',
  height = 12,
  borderRadius = 999,
  delay = 0,
  style = {},
}: SkeletonPieceProps) {
  return (
    <motion.div
      style={{
        width,
        height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        background: 'rgba(255,255,255,0.08)',
        flexShrink: 0,
        ...style,
      }}
      animate={{ opacity: [0.35, 0.65, 0.35] }}
      transition={{
        duration: 1.4,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  );
}
