
import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  animated?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, animated = true }) => {
  return (
    <div className={cn("flex items-center", className)}>
      <div className="relative">
        <div className={cn(
          "font-bold text-3xl",
          animated && "opacity-0 animate-fade-in animation-delay-100"
        )}>
          <span className="text-black/30">YO</span>
          <span className='text-gradient'>YOLO</span>
          <span className="relative">
            O
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full opacity-0 animate-pulse-soft animation-delay-500" />
          </span>
        </div>
      </div>
    </div>
  );
};

export {Logo};