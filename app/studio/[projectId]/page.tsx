"use client";

import { useParams } from "next/navigation";
import { DirectorCtxProvider, useDirectorCtx } from "@/modules/scene/ctx/director-ctx";
import { ItemLayerRenderer } from "@/modules/scene/item-layer-renderer";
import { useEffect, useState } from "react";
import { SceneContainer } from "@/modules/vengin/react/scene-container";
import { SceneCanvas } from "@/modules/vengin/react/scene-canvas";
import { TimelineCtxProvider } from "@/modules/scene/ctx/timeline-ctx";
import { ItemsCtxProvider, useItemsCtx } from "@/modules/scene/ctx/items-ctx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { VideoEditorSidebar } from "@/components/app-sidebar";
import { CanvasTimeline } from "@/modules/timeline/canvas-timeline";
import { SelectionContextProvider } from "@/modules/vengin/react/selection-ctx";
import { SidePanel } from "@/modules/vengin/react/panels/side-panel";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ProjectsSelector } from "@/modules/projects/components/projects-list";
import { ChatSessionProvider } from "@/app/chat/chat-session-ctx";
import { ProjectDetailsProvider, useProjectDetails } from "@/modules/projects/ctx/project-details-ctx";
import { AnimatedClapperboard } from "@/components/ui/clapperboard-loading";
import { Item } from "@/modules/vengin/item/item";
import { CredentialsProvider } from "@/app/chat/keys-ctx";


function StudioPageImpl() {
  const {items, setItems} = useItemsCtx();
  const {canvasEl, containerEl, director} = useDirectorCtx();
  const {project} = useProjectDetails();
  const [assetsLoaded, setAssetsLoaded] = useState(true);

  useEffect(() => {
      if (!director) {
          return;
      }
      director.updateItems(items)
      director.renderBasedOnTimeline();
  }, [director, items])

  useEffect(() => {
    if (!director) {
      return;
    }
    const handleLoadingStart = () => setAssetsLoaded(false);
    const handleAssetsLoaded = () => setAssetsLoaded(true);

    director.loadManager.addEventListener('loadingStarted', handleLoadingStart);
    director.loadManager.addEventListener('allAssetsLoaded', handleAssetsLoaded);

    // Cleanup listeners on component unmount or director change
    return () => {
      director.loadManager.removeEventListener('loadingStarted', handleLoadingStart);
      director.loadManager.removeEventListener('allAssetsLoaded', handleAssetsLoaded);
    };
  }, [director]); // Dependency only on director

  console.log({assetsLoaded})

  useEffect(() => {
    if (project?.state && typeof project.state === 'object' && 'items' in project.state) {
        setItems((project.state as { items: Item[] }).items);
    }
  }, [project, setItems]);


  return (
  <SidebarProvider open={false}>
    <VideoEditorSidebar>
      <SidePanel />
    </VideoEditorSidebar>
    <SidebarInset>
      <div className="flex h-16 items-center border-b px-4">
        <ProjectsSelector />
      </div>
      <div className="relative flex-1 bg-muted/20 h-full flex flex-col pb-2 overflow-hidden">

        {!assetsLoaded &&
          <div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center space-x-3 bg-background text-foreground p-4 rounded-lg shadow-xl">
                <AnimatedClapperboard width="3em" height="3em"/>
                <span className="text-sm font-medium">Loading assets...</span>
            </div>
          </div>}

        {/* Main content area */}
        <div className="flex flex-col bg-muted rounded-none shadow-lg grow overflow-hidden">
          <SceneContainer>
            {(canvasEl && containerEl) &&
              <ItemLayerRenderer className="absolute w-full h-full" />
            }
            <SceneCanvas />
          </SceneContainer>
        </div>

        <div className="mx-2 mt-4 rounded-xs border bg-background shadow-md flex-shrink-0">
          <CanvasTimeline />
        </div>

      </div>
    </SidebarInset>
  </SidebarProvider>)
}

export default function StudioPage(){
  const [queryClient] = useState(() => new QueryClient())
  const {projectId} = useParams<{projectId: string}>();
  if (!projectId) {
    return <div className="flex items-center justify-center h-screen">Project ID not found.</div>
  }
  return (
      <QueryClientProvider client={queryClient}>
        <ProjectDetailsProvider>
          <CredentialsProvider>
            <ChatSessionProvider projectId={projectId}>
                  <ItemsCtxProvider>
                      <SelectionContextProvider>
                          <DirectorCtxProvider>
                              <TimelineCtxProvider>
                                  <StudioPageImpl />
                              </TimelineCtxProvider>
                          </DirectorCtxProvider>
                      </SelectionContextProvider>
                  </ItemsCtxProvider>
            </ChatSessionProvider>
          </CredentialsProvider>
        </ProjectDetailsProvider>
      </QueryClientProvider>)
}