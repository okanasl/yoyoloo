import { ImageItem } from "../item/item";
import { BaseLoader } from "./base";

class ImageLoader extends BaseLoader {
    imageEl: HTMLImageElement | undefined;
    localUrl: string | undefined;
    isReady: boolean = false;

    constructor(item: ImageItem) {
        super(item);
    }

    async getOrCreateLocalUrl(): Promise<string> {
        if (!this.blob) {
            throw new Error("Blob is not ready");
        }
        if (this.localUrl) {
            return this.localUrl;
        }
        // Create a File with the correct extension and MIME type
        const file = this.getAsFile();
        this.localUrl = URL.createObjectURL(file);
        return this.localUrl;
    }

    public getAsFile(): File {
        if (!this.blob) {
            throw new Error("No blob");
        }
        // Use the detected file extension or fallback to a default
        const extension = this.fileType?.ext || 'jpg';
        const mimeType = this.fileType?.mime || 'image/jpeg';
        // Use the item name if it has an extension, or append the detected one
        const fileName = this.item.name.includes('.') 
            ? this.item.name 
            : `${this.item.name}.${extension}`;
        return new File([this.blob], fileName, { type: mimeType });
    }

    public initializeImageElement(): HTMLImageElement {
        if (this.imageEl) {
            return this.imageEl;
        }
        if (!this.localUrl) {
            throw new Error('Local URL not created. Call getOrCreateLocalUrl() first.');
        }
        
        this.imageEl = document.createElement('img');
        this.imageEl.src = this.localUrl;
        
        this.imageEl.onload = () => {
            this.isReady = true;
        };
        
        this.imageEl.onerror = (err) => {
            console.error('Image element error:', err);
        };
        return this.imageEl;
    }

    destroy(): void {
        if (this.imageEl) {
            this.imageEl.src = '';
            this.imageEl = undefined;
        }
        if (this.localUrl) {
            URL.revokeObjectURL(this.localUrl);
            this.localUrl = undefined;
        }
    }
}

export { ImageLoader }