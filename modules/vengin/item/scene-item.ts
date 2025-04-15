import { Item } from "./item";

/**
 * For media items displayed in scene.
 */
type SceneItem = {
    id: string;
    name: string;
    activeItemId?: Item["id"]
    items: Item[];
}


export type { SceneItem }
