"use client"
import { Image, Video, Music } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { X } from "lucide-react"

interface MediaLibraryProps {
  onClose: () => void
}

export function MediaLibrary({ onClose }: MediaLibraryProps) {
  return (
    <div className="flex w-full flex-col border-r bg-background">
      <div className="flex h-16 items-center justify-between border-b px-4">
        <h2 className="text-lg font-semibold">Media Library</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="p-4">
        <Input placeholder="Search media..." className="mb-4" />
        
        <div className="space-y-4">
          {/* Videos Section */}
          <div>
            <h3 className="text-md font-semibold mb-2">Videos</h3>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <MediaItem key={`video-${i}`} type="video" index={i} />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          
          {/* Images Section */}
          <div>
            <h3 className="text-md font-semibold mb-2">Images</h3>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <MediaItem key={`image-${i}`} type="image" index={i} />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
          
          {/* Audio Section */}
          <div>
            <h3 className="text-md font-semibold mb-2">Sounds</h3>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <MediaItem key={`audio-${i}`} type="audio" index={i} />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MediaItemProps {
  type: "video" | "image" | "audio"
  index: number
}

function MediaItem({ type, index }: MediaItemProps) {
  const renderIcon = () => {
    switch (type) {
      case "video": return <Video className="size-6 text-muted-foreground" />;
      case "image": return <Image className="size-6 text-muted-foreground" />;
      case "audio": return <Music className="size-6 text-muted-foreground" />;
    }
  }

  return (
    <div className="group relative min-w-[100px] aspect-video cursor-pointer rounded-md bg-muted/50 transition-all hover:bg-muted flex-shrink-0">
      <div className="absolute inset-0 flex items-center justify-center">
        {renderIcon()}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        {`${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`}
      </div>
    </div>
  )
}