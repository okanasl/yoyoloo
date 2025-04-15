

"use client"

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useDirectorCtx } from './director-ctx';
import { useItemsCtx } from './items-ctx';

type TimelineCtxType = {
    currentTimestamp: number;
    totalDuration: number;
    totalTimelineUXDuration: number;
    updateCurrentTimestamp: (val: number) => void;
    isPaused: boolean;
    setIsPaused: (paused: boolean) => void;
}
// Create the context
const TimelineCtxContext = createContext<TimelineCtxType>({
    currentTimestamp: 0,
    totalDuration: 60_000,
    totalTimelineUXDuration: 70_000,
    updateCurrentTimestamp: () => {},
    isPaused: true,
    setIsPaused: () => {},
});
// Create the provider component
export function TimelineCtxProvider({ children }: {children: ReactNode}) {
      const [isPaused, setIsPaused] = useState(true)
      const {items} = useItemsCtx();
      const {timeline} = useDirectorCtx();
      const [currentTimestamp, setCurrentTimestamp] = useState(0);
      const [totalDuration, setTotalDuration] = useState(60000);

      useEffect(() => {
        if (!timeline) {
            return;
        }
        const onTimestampUpdate = () => {
            setCurrentTimestamp(timeline.timestamp ?? 0);
            const totalDur = timeline.getTotalDuration(items);
            setTotalDuration(totalDur)
        }
        onTimestampUpdate();
        timeline.addEventListener('timelineUpdated', onTimestampUpdate)
        return () => {
            timeline.removeEventListener('timelineUpdated', ontimeupdate)
        }
      }, [items, timeline])

    const updateCurrentTimestamp = (val: number) => {
        timeline?.setTimestamp(val)
    }

    const totalTimelineUXDuration = totalDuration;

    // Value object that will be provided to consumers
    const value: TimelineCtxType = {
        isPaused,
        setIsPaused,
        currentTimestamp,
        totalDuration,
        totalTimelineUXDuration,
        updateCurrentTimestamp
    };

    return (
        <TimelineCtxContext.Provider value={value}>
            {children}
        </TimelineCtxContext.Provider>
    );
}

// Custom hook to use the TimelineCtx context
export function useTimelineCtx() {
    const context = useContext(TimelineCtxContext);
    if (context === undefined) {
        throw new Error('useTimelineCtx must be used within a TimelineCtxProvider');
    }
    return context;
}