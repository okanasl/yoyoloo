import { fileTypeFromStream, FileTypeResult } from "file-type";
import { Item } from "../item/item";

abstract class BaseLoader extends EventTarget {
    item: Item;
    localUrl: string | undefined;
    isReady: boolean =false;
    blob: Blob | undefined;
    fileType: FileTypeResult | undefined;
    isLoading: boolean = false;

    constructor(item: Item) {
        super();
        this.item = item;
    }

    async load() {
        if (this.isLoading) {
            console.log('Already loading item', this.item.id)
            return;
        }
        try {
            this.isLoading = true;
            if (typeof this.item.data === 'string') {
                const resp = await fetch(this.item.data);
                this.blob = await resp.blob();
            } else {
                throw new Error('Unsupported video data type');
            }
            this.fileType = await fileTypeFromStream(this.blob.stream());
            this.isReady = true;
        } catch (error) {
            console.error('Video loading failed:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    async getArrayBuffer(): Promise<ArrayBuffer> {
        if (!this.blob) {
            throw new Error("Blob does not exists");
        }
        return await this.blob.arrayBuffer();
    }
}

export { BaseLoader }