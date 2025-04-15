import { Sprite, SpriteOptions, Texture } from "pixi.js";
import { GlobalContainer } from "../containers/global";
import { Item } from "./item";

/**
 * Represents a Sprite(Video / Image)
 */
class ItemSprite extends Sprite {
    constructor(opts: SpriteOptions | Texture, item: Item) {
        super(opts)
        if (item.type === 'IMAGE' || item.type === 'VIDEO' || item.type === 'TEXT') {
            this.width = item.width;
            this.height = item.height;
        }
    }
}

export { ItemSprite }