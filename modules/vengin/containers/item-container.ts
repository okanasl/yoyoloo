import { Container, ContainerChild, ContainerOptions } from "pixi.js";
import { Item } from "../item/item";
import { SceneRenderer } from "../director/scene-renderer";

class ItemContainer<T extends Item> extends Container {
    item: T;
    sceneRenderer: SceneRenderer;
    constructor(item: T, sceneRenderer: SceneRenderer, options?: ContainerOptions<ContainerChild> | undefined) {
        super(options);
        this.sceneRenderer = sceneRenderer;
        this.item = item;
        this.updateItem(item);
    }

    updateItem(newItem: T) {
        this.item = newItem;
        if (newItem.type === 'IMAGE' || newItem.type === 'VIDEO' || newItem.type === 'TEXT') {
            this.x = newItem.x;
            this.y = newItem.y;
        }
        if (newItem.type === 'IMAGE' || newItem.type === 'VIDEO') {
            this.width = newItem.width;
            this.height = newItem.height;
        }
        this.zIndex = newItem.zIndex;
    }
}

export { ItemContainer }