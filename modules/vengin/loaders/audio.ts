import { AudioItem } from "../item/item";
import { BaseLoader } from "./base";

class AudioLoader extends BaseLoader {
    audioEl: HTMLAudioElement | undefined;
    localUrl: string | undefined;
    isPlaying: boolean = false;
    constructor(item: AudioItem) {
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
        const file = this.getAudioAsFile();
        this.localUrl = URL.createObjectURL(file);
        return this.localUrl;
    }

    public getAudioAsFile(): File {
        if (!this.blob) {
            throw new Error("No blob");
        }
        // Use the detected file extension or fallback to a default
        const extension = this.fileType?.ext || 'mp3';
        const mimeType = this.fileType?.mime || 'video/mp3';
        // Use the item name if it has an extension, or append the detected one
        const fileName = this.item.name.includes('.') 
            ? this.item.name 
            : `${this.item.name}.${extension}`;
        return new File([this.blob], fileName, { type: mimeType });
    }

    

    initializeAudioElement() {
        if (this.audioEl) {
            return this.audioEl;
        }
        if (!this.localUrl) {
            throw new Error('Local URL not created. Call getOrCreateLocalUrl() first.');
        }
        
        this.audioEl = document.createElement('audio');
        this.audioEl.src = this.localUrl;
        this.audioEl.preload = 'auto';
        this.audioEl.autoplay = false;
        
        this.audioEl.onerror = (err) => {
            console.error('Video element error:', err);
        };
        return this.audioEl;
    }

    setCurrentTime(time: number): void {
        if (!this.audioEl) {
            throw new Error('Audio element not initialized. Call load() first.');
        }
        this.audioEl.currentTime = time;
    }

    // Cleanup method
    destroy(): void {
        if (this.audioEl) {
            this.audioEl.pause();
            this.audioEl.src = '';
            this.audioEl = undefined;
        }
        if (this.localUrl) {
            URL.revokeObjectURL(this.localUrl);
            this.localUrl = undefined;
        }
        this.isPlaying = false;
    }
}

export { AudioLoader };