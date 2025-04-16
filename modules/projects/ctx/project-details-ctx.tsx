
    'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Project } from '@/app/generated/prisma';



async function updateProject(data: Project): Promise<Project> {
    const {id, ...rest} = data;
    const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rest),
    });
    if (!response.ok) {
        throw new Error('Failed to update project');
    }
    return response.json();
}

async function getProject(id: string): Promise<Project> {
    const response = await fetch(`/api/projects/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch project');
    }
    return response.json();
}

interface ProjectDetailsContextType {
  project: Project | undefined;
  isLoading: boolean;
  updateProject: (data: Project) => Promise<Project>;
  error: Error | null;
}

// Create context
const ProjectDetailsContext = createContext<ProjectDetailsContextType | undefined>(undefined);


// Provider component
export function ProjectDetailsProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    const {projectId} = useParams<{projectId: string}>();

    const {data: project, isLoading, error} = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => getProject(projectId),
        enabled: !!projectId,
    });

    const updateMutation = useMutation({
        mutationFn: updateProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        },
    });

  return (
    <ProjectDetailsContext.Provider
      value={{
        project,
        isLoading,
        updateProject: updateMutation.mutateAsync,
        error: error as Error | null,
    }}
    >
    {children}
    </ProjectDetailsContext.Provider>
  );
}

// Custom hook for using the context
export function useProjectDetails() {
  const context = useContext(ProjectDetailsContext);
  if (context === undefined) {
    throw new Error('useProjectDetails must be used within a ProjectDetailsProvider');
  }
  return context;
}
