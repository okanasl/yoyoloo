"use client"

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { redirect, useRouter } from 'next/navigation';
import { useProjects } from '@/modules/projects/ctx/projects-ctx';
import { Button } from './button';
import { generateProjectName } from '@/modules/projects/utils';
import { createClient } from '@/utils/supabase/client';

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
  const supabase = createClient();

  const router = useRouter();

  const {createProject} = useProjects();

  const onClickLaunch = () => {
    supabase.auth.getSession().then((sess) => {
      console.log({sess})
      if (!sess.data.session) {
        router.push(`/auth/login`)
        return;
      }
      createProject({
          name: generateProjectName(),
          userId: sess.data?.session?.user.id as string,
          state: {
              items: []
          },
          messages: [],
      }).then((resp) => {
          router.push(`/studio/${resp.id}`)
      })
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