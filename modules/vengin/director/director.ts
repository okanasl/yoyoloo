import { Renderer } from 'pixi.js';
import { Timeline } from '../timeline/timeline';
import { GlobalContainer } from '../containers/global';
import { Item } from '../item/item';
import { DirectorStatus, VisualConfig } from './types';
import { LoadManager } from './load-manager';
import { SceneRenderer } from './scene-renderer';
import { MP4Muxer } from '../muxers/mp4';


class ItemsUpdatedEvent extends CustomEvent<Item[]> {
    constructor(eventInitDict?: CustomEventInit<Item[]>) {
        super("itemsUpdated", eventInitDict);
    }
}

class StyleUpdatedEvent extends CustomEvent<VisualConfig> {
    constructor(eventInitDict?: CustomEventInit<VisualConfig>) {
        super("visualUpdated", eventInitDict);
    }
}

class Director extends EventTarget {
    canvasEl: HTMLCanvasElement;

    containerEl: HTMLDivElement;

    renderer: Renderer | undefined;

    container: GlobalContainer | undefined;

    sceneRenderer: SceneRenderer;

    loadManager: LoadManager;

    timeline = new Timeline();

    items: Item[] = [];

    visualConfig: VisualConfig

    status: DirectorStatus = 'IDLE';

    loadingAssets: boolean = false;

    constructor(
        canvasEl: HTMLCanvasElement,
        containerEl: HTMLDivElement,
        timeline: Timeline,
        visualConfig: VisualConfig,
    ) {
        super()
        this.visualConfig = visualConfig;
        this.canvasEl = canvasEl;
        this.containerEl = containerEl;
        this.timeline = timeline;
        this.loadManager = new LoadManager(this, this.timeline);
        this.sceneRenderer = new SceneRenderer(this);
        this.renderOnTimelineChange();
    }

    setVisualConfig(cfg: VisualConfig) {
        this.visualConfig = cfg;
        this.dispatchEvent(new StyleUpdatedEvent({
            detail: this.visualConfig
        }))
    }

    setScale(scale: number) {
        this.sceneRenderer.updateScale(scale)
    }

    download() {
        const muxer = new MP4Muxer(
            this.loadManager,
            this.items,
            this.visualConfig.resolution.width,
            this.visualConfig.resolution.height,
            this.visualConfig.FPS
        );
        this.dispatchEvent(new Event('muxStarted'));
        muxer.mux().then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "untitled_YOYOLOO.mp4"
            document.body.appendChild(a);
            a.click();
            this.dispatchEvent(new Event('muxCompleted'));
            console.log('MP4 ready:', url);
        }).catch(() => {
            alert('An error occured. Oops!')
            this.dispatchEvent(new Event('muxCompleted'));
        });
    }

    reset() {
        this.pause();
        this.timeline.setTimestamp(0);
    }

    pause() {
        this.timeline.pause();
    }
    
    play() {
        this.timeline.play();
    }

    togglePlay() {
        if (this.timeline.isPaused) {
            this.play();
        } else {
            this.pause();
        }
    }

    public async updateItems(items: Item[]) {
        this.items = items;
        this.dispatchEvent(new ItemsUpdatedEvent({
            detail: items
        }))
    }

    /**
     * Second rendering layer of timeline
     */
    public renderBasedOnTimeline() {
        const items = this.timeline.getItemsToBeRenderedNow(this.items);
        this.sceneRenderer.renderItems(items);
    }

    private renderOnTimelineChange() {
        this.timeline.addEventListener('timelineUpdated', () => {
            this.renderBasedOnTimeline();
        })
    }
}

export { Director };