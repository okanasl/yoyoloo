import { TextStyle } from "pixi.js";
import { TextStyleConfig } from "./text-style";

type AudioItemType = 'AUDIO'
type VideoItemType = 'VIDEO'
type ImageItemType = 'IMAGE'
type TextItemType = 'TEXT'

type ItemType = VideoItemType | ImageItemType | TextItemType | AudioItemType;

type BaseItem = {
    /**
     * Unique ID of the item
     */
    id: string;
    /**
     * File name or generated name
     */
    name: string;
    /**
     * Start timestamp of render in milliseconds
     */
    start_timestamp: number;
    /**
     * End time of the timestamp of render in milliseconds
     */
    end_timestamp: number;
    /**
     * The layering zIndex of the rendered item
     */
    zIndex: number;
    /**
     * The content
     * BLOB and File for audio/image/video, and string is for text
     */
    data: string;
}

type VisualItem = BaseItem & {
    /**
     * X coordinate in global container
     */
    x: number;
    /**
     * Y coordinate in global container
     */
    y: number;

    /**
     * Width of the item to be rendered (px)
     */
    width: number;
    /**
     * Height of the item to be rendered (px)
     */
    height: number;
    controlConfig?: ItemControlConfig;
}

type VideoItem = VisualItem & {
    type: VideoItemType;
    audioMuted: boolean;
    videoElement?: HTMLVideoElement;
}

type ImageItem = VisualItem & {
    type: ImageItemType
    imageElement?: HTMLImageElement;
}


type TextItem = VisualItem & {
    type: TextItemType;
    styleConfig: TextStyleConfig;
}

type AudioItem = BaseItem & {
    type: AudioItemType;
    audioElement?: HTMLAudioElement;
    channel: 0 | 1;
}


type ItemControlConfig = {
    lockAspectRatio: boolean;
}

type LayeredItem  = VideoItem | ImageItem | TextItem;

type Item = LayeredItem | AudioItem;



/**
 * What a hash huh :D
 *
 * It is being used by change detection on pixi (resize etc)
 */
const getItemHash = (item: Item) => JSON.stringify(item);

export type { Item, VisualItem, ImageItem, TextItem, VideoItem, ItemType, AudioItem, LayeredItem }
export { getItemHash }
