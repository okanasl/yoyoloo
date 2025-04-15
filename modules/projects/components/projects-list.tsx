"use client"; // Since we're using hooks, this needs to be a client component

import { useProjects } from "../ctx/projects-ctx";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Adjust the import path based on your setup
import { Button } from "@/components/ui/button"; // Assuming you have a Button component from shadcn/ui
import { Plus } from "lucide-react"; // Import Plus icon from lucide-react
import { generateProjectName } from "../utils";
import { useProjectDetails } from "../ctx/project-details-ctx";
import { ScrollArea } from "@/components/ui/scroll-area";


function ProjectsSelector() {
  const { projects, isLoading, error, createProject } = useProjects();
  const {project} = useProjectDetails();
  const router = useRouter();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleSelect = (projectId: string) => {
    router.push(`/studio/${projectId}`); // Redirect to /projectId
  };

  const handleCreateProject = async () => {
    try {
      const newProject = await createProject({
        name: generateProjectName(),
        state: {
          items: []
        },
        messages: [],
      });
      router.push(`/studio/${newProject.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };
  console.log({projects})
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            {projects.find((p) => p.id === project?.id)?.name || "Select Project"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]">
          <DropdownMenuLabel>Projects</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="max-h-[300px] overflow-auto">
          {projects
            .filter((prj) => prj.id !== project?.id) // Exclude current project
            .map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleSelect(project.id)}
              >
                {project.name}
              </DropdownMenuItem>
            ))}
            </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="icon"
        variant="outline"
        onClick={handleCreateProject}
        title="Create New Project"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export { ProjectsSelector };