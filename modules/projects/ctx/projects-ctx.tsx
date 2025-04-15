'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Project } from '@/app/generated/prisma';


interface ProjectsContextType {
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  createProject: (data: Omit<Project, 'id'>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

// Create context
const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

// API functions
async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects');
  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }
  return response.json();
}

async function createProject(data: Omit<Project, 'id'>): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create project');
  }
  return response.json();
}

async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects?id=${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete project');
  }
}

// Provider component
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        isLoading,
        error: error as Error | null,
        createProject: createMutation.mutateAsync,
        deleteProject: deleteMutation.mutateAsync,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

// Custom hook for using the context
export function useProjects() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}
