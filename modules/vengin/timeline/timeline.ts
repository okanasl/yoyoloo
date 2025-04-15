import { Item } from "../item/item";

class Timeline extends EventTarget {
    /**
     * Timestamp as milliseconds
     */
    timestamp = 0;
    isPaused = true; // Start paused by default
    private animationFrameId: number | null = null;
    private playbackRate = 1; // Default speed (1x)

    constructor() {
        super();
    }

    /**
     * Set the timestamp manually and dispatch update event
     */
    setTimestamp(value: number) {
        this.timestamp = Math.max(0, value); // Prevent negative timestamps
        this.dispatchEvent(new CustomEvent("timelineUpdated"));
    }

    /**
     * Start or update the timeline animation loop
     * @param FPS Frames per second (default: 60 for smoother animation)
     * @param speed Playback speed multiplier (e.g., 0.5 for half speed, 2 for double speed)
     */
    tick(FPS: number = 30, speed: number = this.playbackRate) {
        this.playbackRate = speed;
        const frameInterval = 1000 / FPS; // e.g., 16.67ms for 60 FPS
        let lastFrameTime = performance.now();

        const animationStep = (currentTime: number) => {
            if (this.isPaused) {
                return;
            }

            const elapsed = currentTime - lastFrameTime;

            if (elapsed >= frameInterval) {
                // Adjust timestamp increment based on playback speed
                const timeIncrement = frameInterval * this.playbackRate;
                this.timestamp += timeIncrement;
                lastFrameTime = currentTime - (elapsed % frameInterval);
                this.setTimestamp(this.timestamp);
            }

            this.animationFrameId = requestAnimationFrame(animationStep);
        };

        // Only start if not already running
        if (this.animationFrameId === null) {
            this.animationFrameId = requestAnimationFrame(animationStep);
        }
    }

    /**
     * Pause the timeline
     */
    pause() {
        this.isPaused = true;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.dispatchEvent(new Event("paused"));
    }

    /**
     * Play or resume the timeline
     * @param speed Optional playback speed
     */
    play(speed?: number) {
        this.isPaused = false;
        this.tick(30, speed ?? this.playbackRate);
        this.dispatchEvent(new Event("played"));
    }

    /**
     * Set playback speed without restarting
     * @param speed Speed multiplier (e.g., 0.5 for half speed)
     */
    setPlaybackSpeed(speed: number) {
        this.playbackRate = speed;
    }

    /**
     * Get items that should be rendered at the current timestamp
     */
    getItemsToBeRenderedNow(items: Item[]) {
        return items.filter(
            item => item.start_timestamp <= this.timestamp && item.end_timestamp >= this.timestamp
        );
    }

    /**
     * Calculate total duration based on the max end_timestamp
     */
    getTotalDuration(items: Item[]) {
        if (!items || items.length === 0) {
            return 0;
        }
        return Math.max(...items.map(item => item.end_timestamp));
    }
}

export { Timeline };