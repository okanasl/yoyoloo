import { AudioItem, ImageItem, Item, TextItem, VideoItem } from "../item/item";
import { AudioLoader } from "../loaders/audio";
import { ImageLoader } from "../loaders/image";
import { VideoLoader } from "../loaders/video";
import { Timeline } from "../timeline/timeline";
import { Director } from "./director";

// Notes:
// - May consider pre-fetch

/**
 * Observes items and loads them when necessary
 */
class LoadManager extends EventTarget {
    // Tracks if ANY item is currently in the process of loading
    isItemloading = false;
    director: Director;
    timeline: Timeline;
    imageLoaderMap: Map<string, ImageLoader> = new Map();
    audioLoaderMap: Map<string, AudioLoader> = new Map();
    videoLoaderMap: Map<string, VideoLoader> = new Map();
    // Tracks if a specific item ID is currently being loaded (prevents concurrent loads for the SAME item)
    private loadStatusMap: Map<string, boolean> = new Map();
    private loadingCount = 0; // Internal counter for active loads

    constructor(director: Director, timeline: Timeline) {
        super();
        this.director = director;
        this.timeline = timeline;
        this.loadWhenItemsSet();
        this.handleLoadingEvents();
    }

    // Internal handler to manage loadingCount and global isItemloading flag
    private handleLoadingEvents() {
        const onCompleteOrFail = () => {
            this.loadingCount--;
            if (this.loadingCount <= 0) {
                this.loadingCount = 0; // Ensure it doesn't go negative
                this.isItemloading = false;
                // Dispatch 'allAssetsLoaded' ONLY when the count truly reaches zero
                this.dispatchEvent(new CustomEvent('allAssetsLoaded'));
                console.log('LoadManager: All assets loaded event dispatched.');
            }
        };

        this.addEventListener('loadingStarted', () => {
            // Only increment if it's the first item starting to load
            if (this.loadingCount === 0) {
                this.isItemloading = true; // Set global flag
            }
            this.loadingCount++;
            console.log(`LoadManager: Loading started. Count: ${this.loadingCount}`);
        });

        this.addEventListener('loadingCompleted', (event) => {
            console.log(`LoadManager: Loading completed for ${(<CustomEvent>event).detail?.itemId}. Count before decrement: ${this.loadingCount}`);
            onCompleteOrFail();
        });

        this.addEventListener('loadingFailed', (event) => {
            console.warn(`LoadManager: Loading failed for ${(<CustomEvent>event).detail?.itemId}. Count before decrement: ${this.loadingCount}`);
            onCompleteOrFail(); // Decrement count even on failure
        });
    }


    /**
     * When items updated, load data
     */
    loadWhenItemsSet() {
        this.director.addEventListener('itemsUpdated', async () => {
             console.log('LoadManager: itemsUpdated detected, starting load process.');
            // Check which items actually need loading
            const itemsToLoad = this.director.items.filter(item => !this.getLoader(item)); // Only filter items without an existing loader
            if (itemsToLoad.length > 0) {
                 console.log(`LoadManager: ${itemsToLoad.length} items require loading.`);} else {
                 console.log('LoadManager: No new items require loading.');
                 // If no items need loading, ensure the 'allAssetsLoaded' state is correct
                 if (this.loadingCount === 0) {
                     this.isItemloading = false;
                     // Ensure the UI knows loading is complete if it wasn't already
                     this.dispatchEvent(new CustomEvent('allAssetsLoaded'));
                 }
                 return; // Nothing to load
            }


            try {
                // Use Promise.allSettled to handle individual load failures gracefully
                const results = await Promise.allSettled(this.director.items.map(item => this.load(item)));

                // Log results (optional)
                results.forEach((result, index) => {
                    const item = this.director.items[index];
                    if (result.status === 'rejected') {
                        console.error(`LoadManager: Final load status for item ${item.id}: Failed - ${result.reason}`);
                    }
                });

                 console.log('LoadManager: Promise.allSettled completed for item loads.');
            } catch (error) {
                console.error('LoadManager: Unexpected error during item loading batch:', error);
            }
        });
    }

    getLoader(item: Item) {
        switch (item.type) {
            case 'VIDEO':
                return this.videoLoaderMap.get(item.id);
            case 'AUDIO':
                return this.audioLoaderMap.get(item.id);
            case 'IMAGE':
                return this.imageLoaderMap.get(item.id);
            default:
                // Should not happen with proper typing, but good practice
                 console.error(`LoadManager: Attempted to get loader for invalid item type: ${(<any>item).type}`);
                 return undefined; // Return undefined for unknown types
        }
    }

    // Main load function called for each item
    async load(item: Item) {
        switch (item.type) {
            case 'VIDEO':
                return this.loadMedia(item, this.videoLoaderMap, VideoLoader);
            case 'IMAGE':
                return this.loadMedia(item, this.imageLoaderMap, ImageLoader);
            case 'AUDIO':
                return this.loadMedia(item, this.audioLoaderMap, AudioLoader);
            default:
                 console.warn(`LoadManager: Attempted to load unsupported item type: ${(<any>item).type}`);
                 return Promise.resolve(); // Return a resolved promise for unsupported types
        }
    }

    // --- Generic Load Function ---
    private async loadMedia<
        T extends VideoItem | AudioItem | ImageItem | TextItem,
        L extends VideoLoader | AudioLoader | ImageLoader
    >(
        item: T,
        loaderMap: Map<string, L>,
        LoaderClass: new (item: T) => L
    ): Promise<string | undefined> { // Return Promise<string | undefined> for URL

        let loader = loaderMap.get(item.id);
        if (loader) {
             console.log(`LoadManager: Loader for item ${item.id} (${item.type}) already exists. Skipping load.`);


            try {
                let localUrl: string | undefined;
                
                // It exists, but did the previous load succeed? Check for blob.
                if (!loader.blob) {
                    console.warn(`LoadManager: Cached loader for ${item.id} exists but has no blob (previous load likely failed).`);
                    // Treat as not loaded, remove faulty loader so it can be retried properly below
                    loaderMap.delete(item.id);
                    loader = undefined;
                } else {
                    localUrl = await loader.getOrCreateLocalUrl();
                }
                // Only return URL if loader wasn't deleted above
                if (loader) {
                     return localUrl;
                }
            } catch(error) {
                 console.error(`LoadManager: Error retrieving cached URL for item ${item.id}:`, error);
                 // If URL retrieval fails for a cached item, maybe remove it?
                 loaderMap.delete(item.id);
                 throw error;
            }
        }

        if (this.loadStatusMap.get(item.id) === true) {
             console.warn(`LoadManager: Concurrent load attempt for item ${item.id} blocked.`);
             return undefined;
        }

        // 3. If no existing loader and no concurrent load, start the loading process
         console.log(`LoadManager: Initiating new load for item ${item.id} (${item.type}).`);
        this.loadStatusMap.set(item.id, true);
        this.dispatchEvent(new CustomEvent('loadingStarted', {
            detail: { itemId: item.id, type: item.type }
        }));

        try {
            loader = new LoaderClass(item);
            await loader.load(); // Actual fetching/processing
            loaderMap.set(item.id, loader);

            if (!loader.blob) {
                throw new Error(`Load successful but blob missing for ${item.type.toLowerCase()} ${item.id}`);
            }

            const localUrl = await loader.getOrCreateLocalUrl();

            // Dispatch completion event
            this.loadStatusMap.set(item.id, false);
            this.dispatchEvent(new CustomEvent('loadingCompleted', {
                detail: { itemId: item.id, type: item.type, url: localUrl }
            }));
             console.log(`LoadManager: Load completed successfully for item ${item.id}.`);
            return localUrl;

        } catch (error) {
             console.error(`LoadManager: Load failed for item ${item.id}. Error:`, error);
            // Clean up and dispatch failure event
            this.loadStatusMap.set(item.id, false);
            loaderMap.delete(item.id);
            this.dispatchEvent(new CustomEvent('loadingFailed', {
                detail: { itemId: item.id, type: item.type, error }
            }));
            throw error;
        }
    }

    getAudioLoaders() {
        return this.audioLoaderMap.values();
    }
}

export { LoadManager };