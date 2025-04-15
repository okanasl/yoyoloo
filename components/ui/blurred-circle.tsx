import React from 'react';
import { cn } from '@/lib/utils';

interface BlurredCircleProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay?: number;
  className?: string;
  animated?: boolean;
}

const BlurredCircle: React.FC<BlurredCircleProps> = ({
  size = 'md',
  color = 'bg-orange/30',
  top,
  left,
  right,
  bottom,
  delay = 0,
  className,
  animated = true
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-64 h-64',
    xl: 'w-96 h-96'
  };

  const positionStyles: React.CSSProperties = {
    top: top || 'auto',
    left: left || 'auto',
    right: right || 'auto',
    bottom: bottom || 'auto',
  };

  return (
    <div
      className={cn(
        'absolute rounded-full blur-3xl',
        sizeClasses[size],
        color,
        animated && 'animate-float',
        delay && `animation-delay-${delay}`,
        className
      )}
      style={positionStyles}
    />
  );
};

export {BlurredCircle};