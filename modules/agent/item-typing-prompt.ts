const ITEMS_PROMPT = `import { TextStyle } from "pixi.js";

type TextStyleConfig = {
    /**
     * Alignment for multiline text, does not affect single line text
     * @type {'left'|'center'|'right'|'justify'}
     */
    align?: TextStyleAlign;
    /** Indicates if lines can be wrapped within words, it needs wordWrap to be set to true */
    breakWords?: boolean;
    /** Set a drop shadow for the text */
    dropShadow?: boolean | Partial<TextDropShadow>;
    /**
     * A canvas fillstyle that will be used on the text e.g., 'red', '#00FF00'.
     * Can be an array to create a gradient, e.g., ['#000000','#FFFFFF']
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle|MDN}
     * @type {string|string[]|number|number[]|CanvasGradient|CanvasPattern}
     */
    fill?: FillInput;
    /** The font family, can be a single font name, or a list of names where the first is the preferred font. */
    fontFamily?: string;
    /** The font size (as a number it converts to px, but as a string, equivalents are '26px','20pt','160%' or '1.6em') */
    fontSize?: number | string;
    /**
     * The font style.
     * @type {'normal'|'italic'|'oblique'}
     */
    fontStyle?: TextStyleFontStyle;
    /**
     * The font variant.
     * @type {'normal'|'small-caps'}
     */
    fontVariant?: TextStyleFontVariant;
    /**
     * The font weight.
     * @type {'normal'|'bold'|'bolder'|'lighter'|'100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900'}
     */
    fontWeight?: TextStyleFontWeight;
    /** The height of the line, a number that represents the vertical space that a letter uses. */
    leading?: number;
    /** The amount of spacing between letters, default is 0 */
    letterSpacing?: number;
    /** The line height, a number that represents the vertical space that a letter uses */
    lineHeight?: number;
    /**
     * Occasionally some fonts are cropped. Adding some padding will prevent this from
     * happening by adding padding to all sides of the text.
     */
    padding?: number;
    /** A canvas fillstyle that will be used on the text stroke, e.g., 'blue', '#FCFF00' */
    stroke?: StrokeInput;
    /**
     * The baseline of the text that is rendered.
     * @type {'alphabetic'|'top'|'hanging'|'middle'|'ideographic'|'bottom'}
     */
    textBaseline?: TextStyleTextBaseline;
    trim?: boolean;
    /**
     * Determines whether newlines & spaces are collapsed or preserved "normal"
     * (collapse, collapse), "pre" (preserve, preserve) | "pre-line" (preserve,
     * collapse). It needs wordWrap to be set to true.
     * @type {'normal'|'pre'|'pre-line'}
     */
    whiteSpace?: TextStyleWhiteSpace;
    /** Indicates if word wrap should be used */
    wordWrap?: boolean;
    /** The width at which text will wrap, it needs wordWrap to be set to true */
    wordWrapWidth?: number;
}

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
    data: Blob | File | string;
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
`

export {ITEMS_PROMPT}