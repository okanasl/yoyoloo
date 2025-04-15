import { Assets, autoDetectRenderer, HTMLText, Renderer, Text, TextStyle, Ticker, VideoSource } from "pixi.js";
import { Director } from "./director";
import { GlobalContainer } from "../containers/global";
import { initDevtools } from "@pixi/devtools";
import { ItemContainer } from "../containers/item-container";
import { Item, ItemType, getItemHash, AudioItem } from "../item/item";
import { ItemSprite } from "../item/item-sprite";
import * as PixiSound from '@pixi/sound';

class SceneRenderer extends EventTarget {
    director: Director;
    renderer: Renderer | undefined;
    container: GlobalContainer | undefined;
    audioInstances: Map<string, HTMLAudioElement> = new Map();
    /**
     * Window resize etc.
     */
    renderScale = 1;
    scaleObserver: ResizeObserver | undefined;
    playingSoundItemIds: AudioItem["id"][] = [];
    allItemsLoaded = false;
    
    constructor(director: Director) {
        super();
        this.director = director;
        this.init();
    }

    async init() {
        await this.createRenderer();
    }

    async createRenderer() {
        this.renderer = await autoDetectRenderer({
            canvas: this.director.canvasEl,
            width: this.director.visualConfig.resolution.width,
            height: this.director.visualConfig.resolution.height,
            backgroundAlpha: 0,
            autoDensity: true,
        });

        this.container = new GlobalContainer();
        this.container.width = this.renderer.width;
        this.container.height = this.renderer.height;
        initDevtools({ stage: this.container, renderer: this.renderer });
        this.renderWithTicker();
    }

    updateScale(scale: number) {
        this.renderScale = scale;
        if (this.container) {
            const {width, height} = this.director.visualConfig.resolution;
            this.renderer?.resize(width * scale, height * scale)
            this.container.scale = scale;
        }
    }

    async renderItems(items: Item[]) {
        if (!this.allItemsLoaded) {
            const loadingPromise = new Promise<void>(resolve => {
                const onItemsLoaded = () => {
                    this.allItemsLoaded = true;
                    resolve();
                    this.director.loadManager.removeEventListener('allAssetsLoaded', onItemsLoaded);
                };
                this.director.loadManager.addEventListener('allAssetsLoaded', onItemsLoaded);
            });
            
            await loadingPromise;
        }
        if (!this.container) {
            return;
        }
        
        // Skip rendering if buffering is true

        const renderedItemTypes: ItemType[] = ['TEXT', 'VIDEO', 'IMAGE'];
        const itemsToRender = [];
        const audioItems = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type === 'AUDIO') {
                audioItems.push(item);
            } if (renderedItemTypes.includes(item.type)) {
                itemsToRender.push(item);
            }
        }
        
        for (const item of audioItems as AudioItem[]) {
            await this.setupAudio(item, this.director.timeline.timestamp);
        }

        const currentAudioIds = audioItems.map(item => item.id);
        for (const [id, instance] of this.audioInstances.entries()) {
            if (!currentAudioIds.includes(id)) {
                instance.pause();
                this.audioInstances.delete(id);
            }
        }

        const containerPromises = itemsToRender.map(async (item) => {
            if (!this.container) {
                throw new Error("Container is not initialized");
            }
            const itemContainer = new ItemContainer(item, this);
            if (item.type === 'IMAGE' || item.type === 'VIDEO') {
                const texture = await this.getItemTexture(item, this.director.timeline.timestamp);
                const sprite = new ItemSprite(texture, item);
                itemContainer.addChild(sprite);
            } else if (item.type === 'TEXT'){
                const textStyle = new TextStyle({
                    fontFamily: item.styleConfig.fontFamily,
                    fill: item.styleConfig.fill ?? '#fff',
                    fontSize: item.styleConfig.fontSize,
                })
                const text = new Text(item.data, textStyle)
                text.width = item.width;
                text.height = item.height;
                itemContainer.addChild(text)
            }
            return itemContainer;
        });

        const containers = await Promise.all(containerPromises);
        const containerItemIds = containers.map(m => m.item.id);

        const existingChildren = this.container.children
            .filter(f => (f instanceof ItemContainer));
        const existingChildrenId = existingChildren.map(m => m.item.id);

        const childrenToRemove = existingChildren
            .filter(f => !containerItemIds.includes(f.item.id));

        const updatedChildren = existingChildren.filter((f) => {
            const matchingNewContiner = containers.find(r => f.item.id === r.item.id);
            if (!matchingNewContiner) {
                return false;
            }
            if (getItemHash(f.item) !== getItemHash(matchingNewContiner.item)) {
                return true;
            }
        });
        const childrenToAdd = containers.filter((cta) => {
            return !existingChildrenId.includes(cta.item.id);
        });
        
        if (childrenToRemove && childrenToRemove.length) {
            this.container?.removeChild(...childrenToRemove);
        }
        for (let i = 0; i < updatedChildren.length; i++) {
            const updatedChild = updatedChildren[i];
            const newContainer = containers
                .find(f => f.item.id === updatedChild.item.id);
            if (newContainer) {
                updatedChild?.updateItem(newContainer.item);
            }
        }
        if (childrenToAdd && childrenToAdd.length) {
            this.container?.addChild(...childrenToAdd);
        }
    }

    private async getItemTexture(item: Item, timestamp: number = 0) {

        if (item.type === 'VIDEO') {
            const videoLoader = this.director.loadManager.videoLoaderMap.get(item.id);
            if (!videoLoader) {
                throw new Error("Video loader not found");
            }
            
            if (!videoLoader.videoDecoder) {
                await videoLoader.initializeDecoder();
            }
            
            const relativeTimestamp = (timestamp - item.start_timestamp) / 1000;
            const texture = await Assets.load({
                src: videoLoader.localUrl,
                format: videoLoader.fileType?.ext,
                loadParser: 'loadVideo',
            });
            
            if (texture._source instanceof VideoSource) {
                const vidSource = texture._source as VideoSource;
                const videoEl = vidSource.resource as HTMLVideoElement;
                videoEl.volume = 1;
                videoEl.muted = item.audioMuted;
                
                if (this.director.timeline.isPaused) {
                    videoEl.currentTime = relativeTimestamp;
                    videoEl.pause();
                    videoEl.muted = true;
                } else {
                    videoEl.play();
                    videoEl.muted = item.audioMuted;
                }
    
                this.director.timeline.addEventListener('paused', () => {
                    videoEl.pause();
                    videoEl.muted = true;
                });
    
                this.director.timeline.addEventListener('played', () => {
                    videoEl.play();
                    videoEl.muted = item.audioMuted;
                });
            }
            
            return texture;
        } else if (item.type === 'IMAGE') {
            const imgLoader = this.director.loadManager.imageLoaderMap.get(item.id);
            if (!imgLoader) {
                throw new Error("Image loader not found");
            }
            
            return await Assets.load({
                src: imgLoader.localUrl,
                format: imgLoader.fileType?.ext,
                loadParser: 'loadTextures'
            });
        }
    }

    private async setupAudio(item: AudioItem, timestamp: number) {
    
        const loader = this.director.loadManager.audioLoaderMap.get(item.id);
        if (!loader) {
            return;
        }
    
        const existingInstance = this.audioInstances.get(item.id);
        if (existingInstance) {
            return;
        }
        const relativeTimestamp = Math.max(0, (timestamp - item.start_timestamp) / 1000);
    

        const audioEl = new Audio(loader.localUrl);
        audioEl.volume = 1;
        audioEl.muted = false;
        audioEl.currentTime = relativeTimestamp;
    

        this.audioInstances.set(item.id, audioEl);
    
        // Start playing if not paused and not already playing
        if (!this.director.timeline.isPaused && !this.playingSoundItemIds.includes(item.id)) {
            audioEl.play();
            this.playingSoundItemIds.push(item.id);
        }
    
        // Sync with timeline state (matching video element behavior)
        if (this.director.timeline.isPaused) {
            audioEl.pause();
        }
    
        // Add timeline event listeners (similiar to video element)
        const pauseHandler = () => {
            if (!audioEl.paused) {
                audioEl.pause();
            }
        };
    
        const playHandler = () => {
            if (audioEl.paused) {
                audioEl.play();
            }
        };

        const changeHandler = () => {
            if (audioEl.paused) {
                const diff = Math.max(0, (this.director.timeline.timestamp - item.start_timestamp) / 1000)
                audioEl.currentTime = diff;
            }
        }
    
        this.director.timeline.addEventListener('paused', pauseHandler);
        this.director.timeline.addEventListener('played', playHandler);
        this.director.timeline.addEventListener('timelineUpdated', changeHandler);
    
        // Cleanup when audio ends (similar to video complete)
        audioEl.onended = () => {
            this.audioInstances.delete(item.id);
            this.playingSoundItemIds = this.playingSoundItemIds.filter(id => id !== item.id);
            this.director.timeline.removeEventListener('paused', pauseHandler);
            this.director.timeline.removeEventListener('played', playHandler);
            this.director.timeline.removeEventListener('timelineUpdated', changeHandler);
        };
    }

    private renderWithTicker() {
        const ticker = new Ticker();
        ticker.maxFPS = 30;
        ticker.add(() => {
            if (this.renderer && this.container) {
                this.renderer.render(this.container);
            }
        });
        ticker.start();
    }

    dispose() {
        this.scaleObserver?.disconnect();
    }
}

export { SceneRenderer };