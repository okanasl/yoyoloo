"use client"

import { Director } from '@/modules/vengin/director/director';
import { Item } from '@/modules/vengin/item/item';
import { Timeline } from '@/modules/vengin/timeline/timeline';
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from 'react';
import { useItemsCtx } from './items-ctx';
import { VisualConfig } from '@/modules/vengin/director/types';

type DirectorCtxType = {
    director: Director | undefined;
    timeline: Timeline | undefined;
    canvasEl?: HTMLCanvasElement | null;
    setCanvasEl: Dispatch<SetStateAction<HTMLCanvasElement | null>>;
    containerEl?: HTMLDivElement | null;
    setContainerEl: Dispatch<SetStateAction<HTMLDivElement | null>>;
    currentTimestampItems: Item[];
    scale: number;
}
// Create the context
const DirectorCtxContext = createContext<DirectorCtxType>({
    director: undefined,
    timeline: undefined,
    canvasEl: null,
    setCanvasEl: () => {},
    containerEl: null,
    setContainerEl: () => {},
    currentTimestampItems: [],
    scale: 1,
});

// Create the provider component
export function DirectorCtxProvider({ children }: {children: ReactNode}) {
    const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
    const [director, setDirector] = useState<Director | undefined>()
    const [timeline, setTimeline] = useState<Timeline | undefined>()
    const {items} = useItemsCtx();
    const [currentTimestampItems, setCurrentTimestampItems] = useState<Item[]>([]);
    const [visualConfig, setVisualConfig] = useState<VisualConfig>({
        FPS: 30,
        aspectRatio: {
            width: 16,
            height: 9,
        },
        resolution: {
            width: 1024,
            height: 576,
        }
    })

    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (!containerEl) {
            return;
        }
        if (canvasEl != null && director == null) {
            const tml = new Timeline();
            const director = new Director(canvasEl, containerEl, tml, visualConfig);
            setTimeline(tml)
            setDirector(director);
        }
    }, [director, canvasEl, containerEl, visualConfig])


    
      useEffect(() => {
        if (!timeline || !items) {
          return;
        }
        const onTimelineOrItemsChange = () => {
          const filteredBasedOnTimeline = timeline.getItemsToBeRenderedNow(items);
          setCurrentTimestampItems(filteredBasedOnTimeline);
        };
        onTimelineOrItemsChange();
        timeline.addEventListener('timelineUpdated', onTimelineOrItemsChange)
        return () => {
          if (onTimelineOrItemsChange) {
            timeline.removeEventListener('timelineUpdated', onTimelineOrItemsChange)
          }
        }
      }, [items, timeline])

      useEffect(() => {
        if (!director || !containerEl || !canvasEl) {
            return;
        }
        const { aspectRatio, resolution } = visualConfig;
        const scaleObserver = new ResizeObserver(() => {
            const containerHeight = containerEl.offsetHeight;
            let width = Math.min(containerEl.offsetWidth - 100, resolution.width);
            let height = width * aspectRatio.height / aspectRatio.width;
            if (height >= containerHeight - 100) {
                height = Math.min(containerEl.offsetHeight - 100, resolution.height);
                width = height * aspectRatio.width / aspectRatio.height;
            }
            const renderScale = width / resolution.width;
            setScale(renderScale);
        })

        scaleObserver.observe(director.containerEl);

        return () => {
            if (scaleObserver) {
                scaleObserver.disconnect();
            }
        }
      }, [director, visualConfig, containerEl, canvasEl])


      useEffect(() => {
        if (!director) {
            return
        }
        director.setScale(scale);
      }, [scale, director])

    // Value object that will be provided to consumers
    const value: DirectorCtxType = {
        scale,
        director,
        timeline,
        canvasEl,
        setCanvasEl,
        containerEl,
        setContainerEl,
        currentTimestampItems,
    };

    return (
        <DirectorCtxContext.Provider value={value}>
            {children}
        </DirectorCtxContext.Provider>
    );
}

// Custom hook to use the DirectorCtx context
export function useDirectorCtx() {
    const context = useContext(DirectorCtxContext);
    if (context === undefined) {
        throw new Error('useDirectorCtx must be used within a DirectorCtxProvider');
    }
    return context;
}