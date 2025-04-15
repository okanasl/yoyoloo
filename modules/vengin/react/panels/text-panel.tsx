"use client"
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface TextPanelProps {
  onClose: () => void
}

export function TextPanel({ onClose }: TextPanelProps) {
  return (
    <div className="flex w-full flex-col border-r bg-background">
      <div className="flex h-16 items-center justify-between border-b px-4">
        <h2 className="text-lg font-semibold">Text</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="p-4">
        <Tabs defaultValue="templates">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          <TabsContent value="templates" className="mt-4">
            <ScrollArea>
              <div className="space-y-3">
                {["Title", "Subtitle", "Caption", "Lower Third", "Quote", "Credits", "Meme", "Bold"].map((template, i) => (
                  <div key={i} className="cursor-pointer rounded-md border bg-background p-3 hover:bg-muted/50">
                    <div className="text-sm font-medium">{template}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Click to add to timeline</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="custom" className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium">Text Content</label>
                <Input placeholder="Enter your text..." />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">Font Style</label>
                <ToggleGroup type="multiple" className="justify-start">
                  <ToggleGroupItem value="bold" aria-label="Toggle bold">
                    <Bold className="size-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="italic" aria-label="Toggle italic">
                    <Italic className="size-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="underline" aria-label="Toggle underline">
                    <Underline className="size-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium">Alignment</label>
                <ToggleGroup type="single" className="justify-start">
                  <ToggleGroupItem value="left" aria-label="Align left">
                    <AlignLeft className="size-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="center" aria-label="Align center">
                    <AlignCenter className="size-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="right" aria-label="Align right">
                    <AlignRight className="size-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <Separator />
              <Button className="w-full">Add to Timeline</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

