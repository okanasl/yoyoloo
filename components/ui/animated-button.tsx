"use client"

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useProjects } from '@/modules/projects/ctx/projects-ctx';
import { Button } from './button';
import { generateProjectName } from '@/modules/projects/utils';

interface AnimatedButtonProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
  children, 
  className,
  delay = 0
}) => {
  const [isHovering, setIsHovering] = useState(false);

  const router = useRouter();

  const {createProject} = useProjects();

  const onClickLaunch = () => {
    createProject({
        name: generateProjectName(),
        state: {
            items: []
        },
        messages: [],
    }).then((resp) => {
        router.push(`/studio/${resp.id}`)
    })
  }

  return (
    <Button
        size="lg"
        onClick={onClickLaunch}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "relative px-8 py-3 rounded-full font-medium transition-all duration-300",
        "opacity-0 translate-y-4",
        `animate-slide-up animation-delay-${delay}`,
        "bg-indigo-500 text-white shadow-lg hover:shadow-xl",
        "overflow-hidden",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
      <div 
        className={cn(
          "absolute inset-0 bg-orange-dark transition-all duration-500 ease-out",
          isHovering ? "opacity-100" : "opacity-0"
        )} 
      />
      <div className="absolute -inset-1 rounded-full opacity-0 hover:opacity-20 bg-orange-light blur transition-all duration-300" />
    </Button>
  );
};

export {AnimatedButton};