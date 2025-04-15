"use client"

import * as React from "react"

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AnimatedClapperboard } from "../ui/clapperboard-loading"

export function VideoEditorSidebar({children}: {children?: React.ReactNode}) {

  return (
    <div className="flex h-screen">
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="p-0 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
            <AnimatedClapperboard
              className="w-8 h-8 cursor-pointer"
              isAnimated={false}
            />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarRail />
      </Sidebar>

      {children}
    </div>
  )
}

