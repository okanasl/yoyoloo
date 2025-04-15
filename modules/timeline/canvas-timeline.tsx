import React, { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react'; // Added useLayoutEffect
import { Item } from "@/modules/vengin/item/item";
import { useDirectorCtx } from '@/modules/scene/ctx/director-ctx';
import { useTimelineCtx } from '@/modules/scene/ctx/timeline-ctx';
import { useItemsCtx } from '@/modules/scene/ctx/items-ctx';
import { ChevronRight, Download, Pause, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatTime } from './utils';
import { Button } from '@/components/ui/button';
import { AnimatedClapperboard } from '@/components/ui/clapperboard-loading';

// Consts
const DEFAULT_ZOOM_LEVELS_MS = [1_000, 5_000, 10_000, 30_000, 60_000, 300_000, 900_000];
const RULER_HEIGHT = 25;
const ROW_HEIGHT = 40;
const ITEM_HEIGHT = 30;
const RESIZE_HANDLE_WIDTH = 6;
const INDICATOR_HANDLE_SIZE = 10;

interface CanvasTimelineProps {
  initialHeight?: number;
  zoom_levels?: number[];
}

const hslToRgba = (hslString: string, alpha = 1): string => {
    const match = hslString.match(/(\d+(\.\d+)?)\s+(\d+(\.\d+)?)%\s+(\d+(\.\d+)?)%/);
    if (!match) return `rgba(0,0,0,${alpha})`;

    const h = parseFloat(match[1]);
    const s = parseFloat(match[3]) / 100;
    const l = parseFloat(match[5]) / 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h / 360 + 1 / 3);
        g = hue2rgb(p, q, h / 360);
        b = hue2rgb(p, q, h / 360 - 1 / 3);
    }

    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
};


export const CanvasTimeline: React.FC<CanvasTimelineProps> = ({
  initialHeight = 250,
  zoom_levels = DEFAULT_ZOOM_LEVELS_MS
}) => {
  const [isMuxing, setIsMuxing] = useState(false);
  const { items, setItems, syncItems } = useItemsCtx();
  const { director } = useDirectorCtx();
  const {
    currentTimestamp,
    totalDuration,
    updateCurrentTimestamp,
    isPaused,
  } = useTimelineCtx();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState(3);
  const [draggedItem, setDraggedItem] = useState<{ item: Item; offsetX: number; offsetY: number; initialStartTime: number; initialZIndex: number; } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [resizingItem, setResizingItem] = useState<{ item: Item; side: 'left' | 'right'; initialStartTime: number; initialEndTime: number; } | null>(null);
  const [isDraggingIndicator, setIsDraggingIndicator] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [startScrollOffset, setStartScrollOffset] = useState(0);
  // Initialize canvasWidth to 0 to avoid initial overflow
  const [canvasWidth, setCanvasWidth] = useState(0);

  const [themeColors, setThemeColors] = useState({
    primary: 'rgba(96, 165, 250, 1)',
    secondary: 'rgba(251, 146, 60, 1)',
    accent: 'rgba(250, 204, 21, 1)',
    muted: 'rgba(107, 114, 128, 1)',
    background: 'rgba(255, 255, 255, 1)',
    foreground: 'rgba(0, 0, 0, 1)',
    mutedForeground: 'rgba(102, 102, 102, 1)',
    border: 'rgba(229, 231, 235, 1)',
    primaryForeground: 'rgba(255, 255, 255, 1)',
    secondaryForeground: 'rgba(0, 0, 0, 1)',
    accentForeground: 'rgba(0, 0, 0, 1)',
    mutedForegroundRgb: '102, 102, 102',
    borderRgb: '229, 231, 235',
    primaryRgb: '96, 165, 250'
  });

  // Fetch theme colors (unchanged)
  useEffect(() => {
    // ... theme color fetching logic ...
    const container = containerRef.current;
    if (container) {
        const styles = getComputedStyle(container);
        const getVar = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

        const primaryHsl = getVar('--primary', '210 80% 55%');
        const secondaryHsl = getVar('--secondary', '180 50% 45%');
        const accentHsl = getVar('--accent', '270 60% 60%');
        const mutedHsl = getVar('--muted', '220 15% 94%');
        const foregroundHsl = getVar('--foreground', '220 15% 20%');
        const mutedForegroundHsl = getVar('--muted-foreground', '220 10% 45%');
        const borderHsl = getVar('--border', '220 15% 88%');
        const primaryForegroundHsl = getVar('--primary-foreground', '0 0% 100%');
        const secondaryForegroundHsl = getVar('--secondary-foreground', '0 0% 0%');
        const accentForegroundHsl = getVar('--accent-foreground', '0 0% 0%');

        setThemeColors({
            primary: hslToRgba(primaryHsl),
            secondary: hslToRgba(secondaryHsl),
            accent: hslToRgba(accentHsl),
            muted: hslToRgba(mutedHsl, 0.8),
            background: hslToRgba(getVar('--background', '0 0% 100%')),
            foreground: hslToRgba(foregroundHsl),
            mutedForeground: hslToRgba(mutedForegroundHsl),
            border: hslToRgba(borderHsl),
            primaryForeground: hslToRgba(primaryForegroundHsl),
            secondaryForeground: hslToRgba(secondaryForegroundHsl),
            accentForeground: hslToRgba(accentForegroundHsl),
            mutedForegroundRgb: hslToRgba(mutedForegroundHsl).match(/\(([^)]+)\)/)?.[1].split(',').slice(0, 3).join(',') || '102, 102, 102',
            borderRgb: hslToRgba(borderHsl).match(/\(([^)]+)\)/)?.[1].split(',').slice(0, 3).join(',') || '229, 231, 235',
            primaryRgb: hslToRgba(primaryHsl).match(/\(([^)]+)\)/)?.[1].split(',').slice(0, 3).join(',') || '96, 165, 250',
        });
      }
  }, []);

  useEffect(() => {
    const onMuxStarted = () => {
      setIsMuxing(true);
    }
    const onMuxComplete = () => {
      setIsMuxing(false);
    }
    director?.addEventListener('muxStarted', onMuxStarted)
    director?.addEventListener('muxCompleted', onMuxComplete)

    return () => {
      director?.removeEventListener('muxStarted', onMuxStarted);
      director?.removeEventListener('muxCompleted', onMuxComplete);
    }
  }, [director])


  // Update canvas width on resize - Use useLayoutEffect for initial measurement
  useLayoutEffect(() => {
    const handleResize = () => {
      // Use the canvas container's width for accuracy
      if (canvasContainerRef.current) {
          // Use floor to prevent potential subpixel issues causing scroll
        setCanvasWidth(Math.floor(canvasContainerRef.current.offsetWidth));
      }
    };

    // Call immediately to set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array is correct here


  const currentZoomScale = zoom_levels[zoomLevel];

  // Prevent division by zero if canvasWidth is 0 initially
  const convertCanvasXToTime = (x: number) => {
      if (canvasWidth <= 0) return scrollOffset; // Return start of visible area if width is invalid
      return scrollOffset + (x * (currentZoomScale / canvasWidth));
  };

  const convertTimeToCanvasX = (time: number) => {
      if (canvasWidth <= 0) return 0; // Return 0 if width is invalid
      return ((time - scrollOffset) / currentZoomScale) * canvasWidth;
  };

  // --- Color Logic (unchanged) ---
  const getItemColor = (type: Item["type"]) => {
    switch (type) {
      case 'VIDEO': return themeColors.primary;
      case 'AUDIO': return themeColors.secondary;
      case 'IMAGE': return themeColors.accent;
      case 'TEXT':  return themeColors.muted;
      default:      return themeColors.muted;
    }
  };
  const getItemTextColor = (type: Item["type"]) => {
     switch (type) {
      case 'VIDEO': return themeColors.primaryForeground;
      case 'AUDIO': return themeColors.secondaryForeground;
      case 'IMAGE': return themeColors.accentForeground;
      case 'TEXT':  return themeColors.foreground;
      default:      return themeColors.foreground;
    }
  }

  // --- Drawing Logic ---
  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    // Only draw if canvas exists and width is determined
    if (!ctx || !canvas || canvasWidth <= 0) return;

    // Get DPI for sharp rendering (optional but recommended)
    const dpr = window.devicePixelRatio || 1;
    // Adjust canvas drawing buffer size for DPI
    // Check if size needs update to avoid redundant resizing
    if (canvas.width !== canvasWidth * dpr || canvas.height !== initialHeight * dpr) {
        canvas.width = canvasWidth * dpr;
        canvas.height = initialHeight * dpr;
        // Scale the context to match the CSS size
        ctx.scale(dpr, dpr);
    }
    // Set CSS size explicitly - this should match the container
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${initialHeight}px`;


    // Clear canvas (using the CSS dimensions)
    ctx.clearRect(0, 0, canvasWidth, initialHeight);

    // --- Draw Ruler ---
    ctx.fillStyle = `rgba(${themeColors.borderRgb}, 0.2)`;
    ctx.fillRect(0, 0, canvasWidth, RULER_HEIGHT); // Use canvasWidth
    ctx.strokeStyle = `rgba(${themeColors.borderRgb}, 0.5)`;
    ctx.fillStyle = themeColors.mutedForeground;
    ctx.font = '10px Arial';
    ctx.lineWidth = 1;

    const majorTickInterval = currentZoomScale / 5;
    const minorTicksPerMajor = 5;
    const minTickSpacingPx = 5; // Minimum pixels between any two ticks
    const intervalTime = majorTickInterval / minorTicksPerMajor;
    const intervalPx = convertTimeToCanvasX(scrollOffset + intervalTime) - convertTimeToCanvasX(scrollOffset);

    // Calculate the time for the first visible tick
    const firstVisibleTimeRaw = convertCanvasXToTime(0);
    const firstTickTime = Math.ceil(firstVisibleTimeRaw / intervalTime) * intervalTime;


    // Adjust tick density based on zoom - Don't draw if too dense
    if (intervalPx >= minTickSpacingPx) {
        // Iterate over time instead of pixels for consistency
        for (let time = firstTickTime; ; time += intervalTime) {
            const x = convertTimeToCanvasX(time);
            if (x > canvasWidth) break; // Stop if tick goes beyond canvas width
            if (x < 0) continue; // Skip ticks left of the visible area

            // Check for exact floating point match for major ticks
            const isMajorTick = Math.abs((time % majorTickInterval)) < intervalTime / 2 || Math.abs((time % majorTickInterval) - majorTickInterval) < intervalTime / 2;

            ctx.beginPath();
            ctx.moveTo(x, isMajorTick ? RULER_HEIGHT - 10 : RULER_HEIGHT - 5);
            // Draw grid lines down the timeline area
            ctx.lineTo(x, initialHeight); // Draw line down to the bottom
            ctx.globalAlpha = isMajorTick ? 0.3 : 0.15;
            ctx.strokeStyle = themeColors.border;
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Draw time labels for major ticks only if there's enough space
            if (isMajorTick) {
                const timeLabel = formatTime(time / 1000);
                const textWidth = ctx.measureText(timeLabel).width;
                // Check if this label overlaps significantly with the previous one
                // This check needs refinement - requires knowing the position of the *previous* label
                // For now, just draw it if it's a major tick
                 ctx.fillStyle = themeColors.mutedForeground;
                 ctx.fillText(timeLabel, x + 3, 15);
            }
        }
    } else {
        // Optional: Draw only major ticks if minor ones are too dense
        const majorIntervalPx = convertTimeToCanvasX(scrollOffset + majorTickInterval) - convertTimeToCanvasX(scrollOffset);
        const firstMajorTickTime = Math.ceil(firstVisibleTimeRaw / majorTickInterval) * majorTickInterval;
        if (majorIntervalPx > 10) { // Ensure major ticks have *some* spacing
            for (let time = firstMajorTickTime; ; time += majorTickInterval) {
                 const x = convertTimeToCanvasX(time);
                 if (x > canvasWidth) break;
                 if (x < 0) continue;

                 ctx.beginPath();
                 ctx.moveTo(x, RULER_HEIGHT - 10);
                 ctx.lineTo(x, initialHeight);
                 ctx.globalAlpha = 0.3;
                 ctx.strokeStyle = themeColors.border;
                 ctx.stroke();
                 ctx.globalAlpha = 1.0;

                 const timeLabel = formatTime(time / 1000);
                 ctx.fillStyle = themeColors.mutedForeground;
                 ctx.fillText(timeLabel, x + 3, 15);
            }
        }
    }


    // --- Draw Items ---
    items.forEach(item => {
        const itemLeft = convertTimeToCanvasX(item.start_timestamp);
        const itemRight = convertTimeToCanvasX(item.end_timestamp);
        const itemWidth = Math.max(1, itemRight - itemLeft);
        const itemTop = RULER_HEIGHT + (item.zIndex * ROW_HEIGHT) + (ROW_HEIGHT - ITEM_HEIGHT) / 2;

        // Culling: Only draw items that are at least partially visible
        if (itemRight < 0 || itemLeft > canvasWidth) {
            return;
        }

        const baseColor = getItemColor(item.type);
        const textColor = getItemTextColor(item.type);
        const isHovered = hoveredItem?.id === item.id;
        const isDragged = draggedItem?.item.id === item.id;
        const isResizing = resizingItem?.item.id === item.id;

        ctx.globalAlpha = isDragged ? 0.7 : 1.0;

        // Item Background (clamp drawing within canvas bounds)
        ctx.fillStyle = baseColor;
        ctx.fillRect(
            Math.max(0, itemLeft), // Clamp left edge
            itemTop,
            itemWidth - (itemLeft < 0 ? -itemLeft : 0) - (itemRight > canvasWidth ? itemRight - canvasWidth : 0), // Adjust width if clamped
            ITEM_HEIGHT
        );

        // Item Border
        ctx.lineWidth = (isHovered || isResizing) ? 2 : 1;
        ctx.strokeStyle = (isHovered || isResizing) ? themeColors.primary : `rgba(${themeColors.borderRgb}, 0.5)`;
        // Draw stroke only on the visible part
         ctx.strokeRect(
             Math.max(0, itemLeft),
             itemTop,
             itemWidth - (itemLeft < 0 ? -itemLeft : 0) - (itemRight > canvasWidth ? itemRight - canvasWidth : 0),
             ITEM_HEIGHT
         );
        ctx.lineWidth = 1;

        // Resize Handles (only draw if item is sufficiently visible)
        if ((isHovered || isResizing) && itemWidth > RESIZE_HANDLE_WIDTH * 2) {
            ctx.fillStyle = themeColors.primary;
            const handleY = itemTop + ITEM_HEIGHT / 2 - 5; // Center vertically
            // Draw left handle only if visible
            if (itemLeft >= 0 && itemLeft <= canvasWidth) {
                ctx.fillRect(itemLeft - RESIZE_HANDLE_WIDTH / 2, handleY , RESIZE_HANDLE_WIDTH / 2 , 10);
            }
             // Draw right handle only if visible
            if (itemRight >= 0 && itemRight <= canvasWidth) {
                 ctx.fillRect(itemLeft + itemWidth - RESIZE_HANDLE_WIDTH/2 , handleY , RESIZE_HANDLE_WIDTH / 2, 10);
            }
        }

        // Item Name (clip text - ensure clipping region is within canvas bounds)
        ctx.fillStyle = textColor;
        ctx.font = '11px Arial';
        ctx.save();
        // Define clipping rect based on *visible* part of the item
        const clipX = Math.max(itemLeft + 5, 0); // Start clipping after padding, but not before canvas edge
        const clipWidth = Math.min(itemLeft + itemWidth - 10, canvasWidth) - clipX; // End clipping before padding, but not after canvas edge

        if (clipWidth > 0) { // Only clip and draw text if there's a visible area
            ctx.beginPath(); // Use beginPath for clipping rectangle
            ctx.rect(clipX, itemTop, clipWidth, ITEM_HEIGHT);
            ctx.clip();
            ctx.fillText(
                item.name,
                itemLeft + 8, // Text still positioned relative to original itemLeft
                itemTop + ITEM_HEIGHT / 2 + 4
            );
            ctx.restore();
        }


        ctx.globalAlpha = 1.0;
    });

    // --- Draw Current Time Indicator ---
    const indicatorX = convertTimeToCanvasX(currentTimestamp);
    if (indicatorX >= 0 && indicatorX <= canvasWidth) { // Draw only if visible
        ctx.strokeStyle = themeColors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(indicatorX, 0);
        ctx.lineTo(indicatorX, initialHeight); // Use component height
        ctx.stroke();
        ctx.lineWidth = 1;

        // Draw indicator handle
        ctx.fillStyle = themeColors.primary;
        ctx.beginPath();
        ctx.moveTo(indicatorX, 0); // Top center of handle base
        // Triangle pointing down slightly into the ruler area
        ctx.lineTo(indicatorX - INDICATOR_HANDLE_SIZE / 2, RULER_HEIGHT - INDICATOR_HANDLE_SIZE );
        ctx.lineTo(indicatorX + INDICATOR_HANDLE_SIZE / 2, RULER_HEIGHT - INDICATOR_HANDLE_SIZE );
        ctx.closePath();
        ctx.fill();

         // Optional: Add a small circle on top for better visibility/grabbing
        ctx.beginPath();
        ctx.arc(indicatorX, RULER_HEIGHT - INDICATOR_HANDLE_SIZE - 2 , 3, 0, Math.PI * 2); // Small circle above triangle
        ctx.fill();
    }

  }, [items, currentTimestamp, currentZoomScale, scrollOffset, hoveredItem, draggedItem, resizingItem, canvasWidth, totalDuration, themeColors, initialHeight /* Added initialHeight */]);

  // --- Effect for Drawing ---
  useEffect(() => {
    // Draw whenever relevant state changes
    drawTimeline();
  }, [drawTimeline]); // drawTimeline includes all its own dependencies

  // --- Event Handlers ---

    const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || e.button !== 0) return; // Only handle left clicks

    const { x, y } = getMousePos(e);

    e.stopPropagation(); // Prevent interference from parent elements

    // Check for indicator handle click
    const indicatorX = convertTimeToCanvasX(currentTimestamp);
    const handleTopY = RULER_HEIGHT - INDICATOR_HANDLE_SIZE - 5; // A bit above the handle for easier grab
    const handleBottomY = RULER_HEIGHT; // Bottom of the ruler
    const handleLeftX = indicatorX - INDICATOR_HANDLE_SIZE; // Wider grab area
    const handleRightX = indicatorX + INDICATOR_HANDLE_SIZE;

    const isOnIndicatorHandle =
      x >= handleLeftX && x <= handleRightX &&
      y >= handleTopY && y <= handleBottomY;

    if (isOnIndicatorHandle) {
      director?.pause();
      setIsDraggingIndicator(true);
      canvas.style.cursor = 'ew-resize';
      // Temporarily pause playback when scrubbing
      if (!isPaused) director?.pause();
      return;
    }

    // Check for horizontal scroll dragging (on ruler, excluding indicator handle)
    if (y <= RULER_HEIGHT) {
      setIsDraggingScroll(true);
      setScrollStartX(e.clientX); // Use clientX for movement delta calculation
      setStartScrollOffset(scrollOffset);
      canvas.style.cursor = 'grabbing';
      return;
    }

    // Check for item interaction (reverse order to prioritize items visually on top)
    let interactionFound = false;
    const sortedItems = [...items].sort((a, b) => b.zIndex - a.zIndex); // Items with higher zIndex checked first

    for (const item of sortedItems) {
      const itemLeft = convertTimeToCanvasX(item.start_timestamp);
      const itemRight = convertTimeToCanvasX(item.end_timestamp);
      const itemTop = RULER_HEIGHT + (item.zIndex * ROW_HEIGHT) + (ROW_HEIGHT - ITEM_HEIGHT) / 2;
      const itemBottom = itemTop + ITEM_HEIGHT;

      // Define handle areas slightly larger than visual handles
      const leftHandleLeft = itemLeft - RESIZE_HANDLE_WIDTH;
      const leftHandleRight = itemLeft + RESIZE_HANDLE_WIDTH;
      const rightHandleLeft = itemRight - RESIZE_HANDLE_WIDTH;
      const rightHandleRight = itemRight + RESIZE_HANDLE_WIDTH;

      const isYInItemRow = y >= itemTop && y <= itemBottom;

      if (!isYInItemRow) continue; // Skip if mouse is not in the item's row

      const isOnLeftHandle = x >= leftHandleLeft && x <= leftHandleRight;
      const isOnRightHandle = x >= rightHandleLeft && x <= rightHandleRight;

        // Prioritize resize handles
      if (isOnLeftHandle) {
        director?.pause();
        setResizingItem({ item, side: 'left', initialStartTime: item.start_timestamp, initialEndTime: item.end_timestamp });
        canvas.style.cursor = 'ew-resize';
        interactionFound = true;
        break; // Stop checking once interaction is found
      } else if (isOnRightHandle) {
        director?.pause();
        setResizingItem({ item, side: 'right', initialStartTime: item.start_timestamp, initialEndTime: item.end_timestamp });
        canvas.style.cursor = 'ew-resize';
        interactionFound = true;
        break;
      } else if (x >= itemLeft && x <= itemRight) { // Check for drag only if not on handles
        director?.pause();
        setDraggedItem({
          item: item,
          offsetX: x - itemLeft,
          offsetY: y - itemTop, // Store Y offset within the item rectangle
          initialStartTime: item.start_timestamp,
          initialZIndex: item.zIndex
        });
        canvas.style.cursor = 'grabbing';
        interactionFound = true;
        break;
       }
    }

    // If no item interaction, handle click on timeline background
    if (!interactionFound) {
      const newTime = convertCanvasXToTime(x);
      // Only update timestamp if clicking below the ruler
      if (y > RULER_HEIGHT) {
          if (!isPaused) director?.pause(); // Pause when clicking timeline background
          updateCurrentTimestamp(Math.max(0, Math.min(totalDuration || 0, newTime)));
      }
      // Keep default cursor unless grabbing ruler
       canvas.style.cursor = y <= RULER_HEIGHT ? 'grab' : 'default';
    }
  };

    const handleMouseMove = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getMousePos(e);

        // --- Dragging/Resizing Logic (Handles cursor internally) ---
        if (isDraggingScroll) {
            const scrollDeltaX = e.clientX - scrollStartX;
            // Convert pixel delta to time delta based on current zoom
            const timeDelta = scrollDeltaX * (currentZoomScale / canvasWidth);
            const newScrollOffset = startScrollOffset - timeDelta; // Subtract because dragging right moves time left

            // Clamp scroll offset: 0 to (totalDuration - visibleDuration)
            const visibleDuration = currentZoomScale;
            const maxScroll = Math.max(0, (totalDuration || 0) - visibleDuration); // Allow scrolling up to the point where the end is visible
            const clampedScrollOffset = Math.max(0, Math.min(newScrollOffset, maxScroll));

            setScrollOffset(clampedScrollOffset);
            canvas.style.cursor = 'grabbing'; // Keep grabbing cursor
            return; // Prioritize scrolling
        }

        if (isDraggingIndicator) {
            const newTime = convertCanvasXToTime(x);
            updateCurrentTimestamp(Math.max(0, Math.min(totalDuration || 0, newTime)));
            canvas.style.cursor = 'ew-resize'; // Keep resize cursor
            return; // Prioritize indicator dragging
        }

        if (resizingItem) {
            const newTime = Math.max(0, convertCanvasXToTime(x));
            let updated = false;
            const updatedItems = items.map(item => {
                if (item.id === resizingItem.item.id) {
                    let newStart = item.start_timestamp;
                    let newEnd = item.end_timestamp;
                    const minDuration = 10; // Minimum item duration in ms

                    if (resizingItem.side === 'left') {
                        newStart = Math.min(newTime, resizingItem.initialEndTime - minDuration); // Prevent crossing end time
                    } else { // side === 'right'
                        newEnd = Math.max(newTime, resizingItem.initialStartTime + minDuration); // Prevent crossing start time
                    }

                    // Only update if times actually changed
                    if (newStart !== item.start_timestamp || newEnd !== item.end_timestamp) {
                        updated = true;
                        return { ...item, start_timestamp: newStart, end_timestamp: newEnd };
                    }
                }
                return item;
            });
            if (updated) {
                 setItems(updatedItems); // Update local state for immediate feedback
            }
            canvas.style.cursor = 'ew-resize'; // Keep resize cursor
            return; // Prioritize resizing
        }

        if (draggedItem) {
            const duration = draggedItem.item.end_timestamp - draggedItem.item.start_timestamp;
            let newStartTime = convertCanvasXToTime(x - draggedItem.offsetX);
            newStartTime = Math.max(0, newStartTime); // Clamp start time >= 0

            // Calculate new zIndex based on vertical position relative to row centers
             const relativeY = y - RULER_HEIGHT; // Y position below the ruler
             // Calculate the target row index, clamping between 0 and a reasonable max (e.g., 20)
             const targetRowIndex = Math.floor(relativeY / ROW_HEIGHT);
             const newZIndex = Math.max(0, Math.min(targetRowIndex, 20)); // Clamp zIndex


            let updated = false;
            const updatedItems = items.map(item => {
                if (item.id === draggedItem.item.id) {
                   const potentialNewStart = newStartTime;
                   const potentialNewEnd = newStartTime + duration;
                   const potentialNewZ = newZIndex;

                   // Only update if position or zIndex changed
                   if(item.start_timestamp !== potentialNewStart || item.zIndex !== potentialNewZ) {
                       updated = true;
                        return {
                          ...item,
                          start_timestamp: potentialNewStart,
                          end_timestamp: potentialNewEnd,
                          zIndex: potentialNewZ
                        };
                   }
                }
                return item;
            });

            if(updated) {
                setItems(updatedItems); // Update local state
            }
            canvas.style.cursor = 'grabbing'; // Keep grabbing cursor
             return; // Prioritize dragging
        }


        // --- Hover Logic (Only if not dragging/resizing) ---
        let currentHoveredItem: Item | null = null;
        let cursorType = 'default'; // Default cursor

        // Check indicator handle hover
        const indicatorX = convertTimeToCanvasX(currentTimestamp);
        const handleTopY = RULER_HEIGHT - INDICATOR_HANDLE_SIZE - 5;
        const handleBottomY = RULER_HEIGHT;
        const handleLeftX = indicatorX - INDICATOR_HANDLE_SIZE;
        const handleRightX = indicatorX + INDICATOR_HANDLE_SIZE;
        const isOnIndicatorHandle = x >= handleLeftX && x <= handleRightX && y >= handleTopY && y <= handleBottomY;

        if (isOnIndicatorHandle) {
            cursorType = 'ew-resize';
        } else if (y <= RULER_HEIGHT) {
            cursorType = 'grab'; // Hovering over ruler area (for scrolling)
        } else {
            // Check item hover (reverse sorted order)
            const sortedItems = [...items].sort((a, b) => b.zIndex - a.zIndex);
            let hoverInteractionFound = false;
            for (const item of sortedItems) {
                const itemLeft = convertTimeToCanvasX(item.start_timestamp);
                const itemRight = convertTimeToCanvasX(item.end_timestamp);
                const itemTop = RULER_HEIGHT + (item.zIndex * ROW_HEIGHT) + (ROW_HEIGHT - ITEM_HEIGHT) / 2;
                const itemBottom = itemTop + ITEM_HEIGHT;

                const leftHandleLeft = itemLeft - RESIZE_HANDLE_WIDTH;
                const leftHandleRight = itemLeft + RESIZE_HANDLE_WIDTH;
                const rightHandleLeft = itemRight - RESIZE_HANDLE_WIDTH;
                const rightHandleRight = itemRight + RESIZE_HANDLE_WIDTH;

                const isYInItemRow = y >= itemTop && y <= itemBottom;

                if (!isYInItemRow) continue;

                 const isOnLeftHandle = x >= leftHandleLeft && x <= leftHandleRight;
                 const isOnRightHandle = x >= rightHandleLeft && x <= rightHandleRight;

                 if (isOnLeftHandle || isOnRightHandle) {
                     cursorType = 'ew-resize';
                     currentHoveredItem = item; // Hover item when on handles too
                     hoverInteractionFound = true;
                     break;
                 } else if (x >= itemLeft && x <= itemRight) {
                     cursorType = 'grab'; // Hovering over item body (for dragging)
                     currentHoveredItem = item;
                     hoverInteractionFound = true;
                     break;
                 }
            }
             if (!hoverInteractionFound) {
                 cursorType = 'default'; // No item interaction found below ruler
             }
        }

        // Update cursor and hovered item state if changed
        if (canvas.style.cursor !== cursorType) {
            canvas.style.cursor = cursorType;
        }
        if (hoveredItem?.id !== currentHoveredItem?.id) {
            setHoveredItem(currentHoveredItem);
        }
    };


  const handleMouseUp = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (canvas && !isDraggingScroll && !isDraggingIndicator && !draggedItem && !resizingItem) {
        // Reset cursor only if we weren't performing an action that sets its own cursor on mouse move
         // Determine appropriate default cursor based on final position
        const { y } = getMousePos(e);
        canvas.style.cursor = y <= RULER_HEIGHT ? 'grab' : 'default';
    } else if (canvas) {
        // Ensure cursor resets after drag/resize/scroll ends
        canvas.style.cursor = 'default'; // Or recalculate appropriate hover cursor if needed
    }


    if (draggedItem || resizingItem) {
      // Sync changes with the director/backend
      syncItems();
    }

    // Clear dragging/resizing states
    setDraggedItem(null);
    setResizingItem(null);
    setIsDraggingIndicator(false);
    setIsDraggingScroll(false);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
         if (draggedItem || resizingItem || isDraggingIndicator || isDraggingScroll) {
             handleMouseUp(e);
         }
          // Clear hover when mouse leaves the component area
         setHoveredItem(null);
         const canvas = canvasRef.current;
         if (canvas) {
             canvas.style.cursor = 'default';
         }
  };

  const handleMouseWheel = (e: React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth <= 0) return;

    const { x } = getMousePos(e as unknown as React.MouseEvent);
    const timeAtCursor = convertCanvasXToTime(x);

    if (e.ctrlKey || e.metaKey) { // Zoom
      const zoomDirection = e.deltaY < 0 ? 'in' : 'out';
      const oldZoomScale = currentZoomScale;
      const newZoomLevelIndex = zoomDirection === 'in'
        ? Math.min(zoomLevel + 1, zoom_levels.length - 1)
        : Math.max(zoomLevel - 1, 0);

      if (newZoomLevelIndex !== zoomLevel) {
        const newZoomScale = zoom_levels[newZoomLevelIndex];
        setZoomLevel(newZoomLevelIndex);

        // Adjust scroll offset to keep the time under the cursor stable
        const newScrollOffset = timeAtCursor - (x * (newZoomScale / canvasWidth));
        const visibleDuration = newZoomScale;
        const maxScroll = Math.max(0, (totalDuration || 0) - visibleDuration);
        setScrollOffset(Math.max(0, Math.min(maxScroll, newScrollOffset)));
      }
    } else {
        const scrollAmountPixels = e.deltaY !== 0 ? e.deltaY : e.deltaX; 
        const scrollAmountTime = (scrollAmountPixels * 0.5) * (currentZoomScale / canvasWidth);

        const newScrollOffset = scrollOffset + scrollAmountTime;
        const visibleDuration = currentZoomScale;
        const maxScroll = Math.max(0, (totalDuration || 0) - visibleDuration);
        const clampedScrollOffset = Math.max(0, Math.min(maxScroll, newScrollOffset));
        setScrollOffset(clampedScrollOffset);
    }
  };

   const handleZoom = (direction: 'in' | 'out') => {
       const canvas = canvasRef.current;
       if (!canvas || canvasWidth <= 0) return;
       const x = canvasWidth / 2;
       const timeAtCenter = convertCanvasXToTime(x);

       const newZoomLevelIndex = direction === 'in'
           ? Math.min(zoomLevel + 1, zoom_levels.length - 1)
           : Math.max(zoomLevel - 1, 0);

       if (newZoomLevelIndex !== zoomLevel) {
           const newZoomScale = zoom_levels[newZoomLevelIndex];
           setZoomLevel(newZoomLevelIndex);

           // Adjust scroll offset to keep center stable
           const newScrollOffset = timeAtCenter - (x * (newZoomScale / canvasWidth));
           const visibleDuration = newZoomScale;
           const maxScroll = Math.max(0, (totalDuration || 0) - visibleDuration);
           setScrollOffset(Math.max(0, Math.min(maxScroll, newScrollOffset)));
       }
   };

  const handlePlayPause = () => {
    director?.togglePlay();
  };

  const handleDownload = () => {
      director?.download();
  }


  // --- Render ---
  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-background text-foreground select-none w-full"
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="flex items-center py-1 px-2 border-b border-border gap-2 justify-between flex-shrink-0"> 

        <div className="flex items-center gap-1">
          <Button size="xs" variant="ghost" onClick={() => handleZoom('out')} aria-label="Zoom out" disabled={zoomLevel === 0}>
            <ZoomOut className='size-4' />
          </Button>
          <span className='text-xs tabular-nums w-16 text-center px-1 border border-transparent hover:border-border rounded'>
             {`${(currentZoomScale / 1000).toFixed(1)}s`}
          </span>
          <Button size="xs" variant="ghost" onClick={() => handleZoom('in')} aria-label="Zoom in" disabled={zoomLevel === zoom_levels.length - 1}>
            <ZoomIn className='size-4' />
          </Button>
        </div>

        <div className='flex items-center gap-2'>
            <Button size="xs" variant="ghost" onClick={handlePlayPause} aria-label={isPaused ? "Play" : "Pause"}>
                {isPaused ? <ChevronRight className='size-5'/> : <Pause className='size-4'/>}
            </Button>
            <div className='text-xs font-mono tabular-nums whitespace-nowrap'>
                {formatTime(currentTimestamp / 1000)} / {formatTime((totalDuration || 0) / 1000)}
            </div>
        </div>

        <Button disabled={isMuxing} size="sm" variant="ghost" onClick={handleDownload} className='gap-1'>
          {!isMuxing && <><Download className='size-4'/> Download</>}
          {isMuxing && <><AnimatedClapperboard className='size-4'/> Rendering</>}
        </Button>
        
      </div>

      <div
        ref={canvasContainerRef}
        className="relative overflow-hidden w-full cursor-default"
        style={{ height: `${initialHeight}px` }}
        onWheel={handleMouseWheel}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          className="block absolute top-0 left-0"
        />
        {canvasWidth <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Loading Timeline...
            </div>
        )}
      </div>
    </div>
  );
};