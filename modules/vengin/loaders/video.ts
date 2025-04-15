import { VideoItem } from "../item/item";
import { BaseLoader } from "./base";

class VideoLoader extends BaseLoader {
    videoEl: HTMLVideoElement | undefined;
    isReady: boolean = false;
    videoDecoder: VideoDecoder | undefined;
    frameQueue: VideoFrame[] = [];
    codecInfo: string | null = null;
    
    constructor(item: VideoItem) {
        super(item);
    }

    getAsFile(): File {
        if (!this.blob) {
            throw new Error("No blob");
        }
        // Use the detected file extension or fallback to a default
        const extension = this.fileType?.ext || 'mp4';
        const mimeType = this.fileType?.mime || 'video/mp4';
        // Use the item name if it has an extension, or append the detected one
        const fileName = this.item.name.includes('.') 
            ? this.item.name 
            : `${this.item.name}.${extension}`;
        return new File([this.blob], fileName, { type: mimeType });
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

    initializeVideoElement() {
        if (!this.localUrl) {
            throw new Error('Local URL not created. Call getOrCreateLocalUrl() first.');
        }
        
        this.videoEl = document.createElement('video');
        this.videoEl.src = this.localUrl;
        this.videoEl.preload = 'auto';
        this.videoEl.autoplay = false;
        
        this.videoEl.onerror = () => {
            console.error('Video element error:', this.videoEl?.error);
        };
        return this.videoEl;
    }

    /**
     * Extract codec information from the video
     * Uses MediaSource to detect the codec string
     */
    async detectCodec(): Promise<string> {
        if (this.codecInfo) {
            return this.codecInfo;
        }

        if (!this.videoEl) {
            await this.getOrCreateLocalUrl();
            this.initializeVideoElement();
        }

        return new Promise<string>((resolve, reject) => {
            // Create a temporary MediaSource to detect codec
            const mediaSource = new MediaSource();
            const tempVideo = document.createElement('video');
            tempVideo.src = URL.createObjectURL(mediaSource);

            mediaSource.addEventListener('sourceopen', async () => {
                try {
                    // Common codec types to check
                    const codecTypes = [
                        'video/mp4; codecs="avc1.42E01E"',  // H.264 baseline
                        'video/mp4; codecs="avc1.4D401E"',  // H.264 main
                        'video/mp4; codecs="avc1.64001E"',  // H.264 high
                        'video/webm; codecs="vp8"',         // VP8
                        'video/webm; codecs="vp09.00.10.08"', // VP9
                        'video/mp4; codecs="hev1.1.6.L93.B0"', // HEVC
                        'video/mp4; codecs="av01.0.08M.08"'  // AV1
                    ];

                    // Find the first supported codec
                    for (const codec of codecTypes) {
                        if (MediaSource.isTypeSupported(codec)) {
                            this.codecInfo = codec.split('codecs="')[1].split('"')[0];
                            URL.revokeObjectURL(tempVideo.src);
                            resolve(this.codecInfo);
                            return;
                        }
                    }

                    // Default fallback
                    this.codecInfo = 'avc1.42E01E';
                    URL.revokeObjectURL(tempVideo.src);
                    resolve(this.codecInfo);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Initialize the VideoDecoder for frame extraction
     * @returns Promise that resolves when decoder is ready
     */
    async initializeDecoder(): Promise<void> {
        // Check if WebCodecs API is available
        if (!('VideoDecoder' in window)) {
            throw new Error('WebCodecs API is not supported in this browser');
        }

        const codec = await this.detectCodec();

        return new Promise((resolve, reject) => {
            // Check if the configuration is supported before creating the decoder
            const decoderConfig: VideoDecoderConfig = {
                codec: codec,
                hardwareAcceleration: 'prefer-hardware',
            };
            
            // Check if the configuration is supported
            if (!VideoDecoder.isConfigSupported) {
                console.warn('VideoDecoder.isConfigSupported is not available, trying to configure directly');
                this.createDecoder(decoderConfig, resolve, reject);
                return;
            }
            
            VideoDecoder.isConfigSupported(decoderConfig)
                .then(support => {
                    if (support.supported) {
                        this.createDecoder(decoderConfig, resolve, reject);
                    } else {
                        // Try with a different codec if the first one isn't supported
                        console.warn('Codec not supported, trying alternative codec');
                        const alternativeConfig: VideoDecoderConfig = {
                            codec: 'vp8',
                            hardwareAcceleration: 'prefer-hardware',
                        };
                        
                        VideoDecoder.isConfigSupported(alternativeConfig)
                            .then(altSupport => {
                                if (altSupport.supported) {
                                    this.createDecoder(alternativeConfig, resolve, reject);
                                } else {
                                    // Fall back to software decoding with a basic codec
                                    const fallbackConfig: VideoDecoderConfig = {
                                        codec: 'avc1.42E01E',
                                        hardwareAcceleration: 'prefer-software',
                                    };
                                    this.createDecoder(fallbackConfig, resolve, reject);
                                }
                            })
                            .catch(error => {
                                console.error('Error checking alternative codec support:', error);
                                reject(error);
                            });
                    }
                })
                .catch(error => {
                    console.error('Error checking codec support:', error);
                    reject(error);
                });
        });
    }

    /**
     * Helper method to create and configure the decoder
     */
    private createDecoder(config: VideoDecoderConfig, resolve: () => void, reject: (error: Error) => void): void {
        try {
            // Initialize decoder with callbacks
            this.videoDecoder = new VideoDecoder({
                output: (frame) => {
                    this.frameQueue.push(frame);
                },
                error: (error) => {
                    console.error('VideoDecoder error:', error);
                    reject(error as Error);
                }
            });

            try {
                this.videoDecoder.configure(config);
                this.isReady = true;
                resolve();
            } catch (error) {
                console.error('Error configuring decoder:', error);
                reject(error as Error);
            }
        } catch (error) {
            console.error('Error creating decoder:', error);
            reject(error as Error);
        }
    }

    /**
     * Extract frames from the video and decode them
     * @returns Promise that resolves when all frames are decoded
     */
    async extractFrames(): Promise<void> {
        if (!this.blob) {
            throw new Error("Blob is not ready");
        }

        if (!this.videoDecoder) {
            await this.initializeDecoder();
        }

        // Make sure video element is loaded for metadata
        if (!this.videoEl) {
            await this.getOrCreateLocalUrl();
            this.initializeVideoElement();
        }

        return new Promise<void>((resolve, reject) => {
            const handleVideoMetadata = async () => {
                this.videoEl?.removeEventListener('loadedmetadata', handleVideoMetadata);
                
                try {
                    // Create an offscreen canvas for frame extraction
                    const canvas = new OffscreenCanvas(
                        this.videoEl?.videoWidth || 640, 
                        this.videoEl?.videoHeight || 480
                    );
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx || !this.videoEl) {
                        reject(new Error("Failed to create canvas context or video element not ready"));
                        return;
                    }

                    // Calculate frame intervals based on video duration
                    const duration = this.videoEl.duration;
                    const frameCount = Math.min(20, Math.ceil(duration)); // Extract about 1 frame per second, max 20
                    
                    for (let i = 0; i < frameCount; i++) {
                        const timestamp = (duration / frameCount) * i;
                        
                        // Seek to timestamp
                        this.videoEl.currentTime = timestamp;
                        
                        // Wait for seek to complete
                        await new Promise<void>(seekResolve => {
                            const seekHandler = () => {
                                this.videoEl?.removeEventListener('seeked', seekHandler);
                                seekResolve();
                            };
                            this.videoEl?.addEventListener('seeked', seekHandler);
                        });
                        
                        // Draw frame to canvas
                        ctx.drawImage(this.videoEl, 0, 0, canvas.width, canvas.height);
                        
                        // Create a VideoFrame from the canvas
                        const bitmap = await createImageBitmap(canvas);
                        const frame = new VideoFrame(bitmap, {
                            timestamp: timestamp * 1000000, // Convert to microseconds
                            duration: 1000000 / 30 // Assume 30fps for duration
                        });
                        
                        // Add to queue
                        this.frameQueue.push(frame);
                        
                        // Clean up bitmap
                        bitmap.close();
                    }
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            // Wait for video metadata to load
            if (this.videoEl?.readyState && this.videoEl?.readyState >= 1) {
                handleVideoMetadata();
            } else {
                this.videoEl?.addEventListener('loadedmetadata', handleVideoMetadata);
            }
        });
    }

    /**
     * Get a video frame at a specific timestamp
     * @param timestamp Time in seconds
     * @returns Promise that resolves with the VideoFrame or null if not found
     */
    async getFrameAtTime(timestamp: number): Promise<VideoFrame | null> {
        // If we don't have any frames yet, extract them
        if (this.frameQueue.length === 0) {
            try {
                await this.extractFrames();
            } catch (error) {
                console.error("Failed to extract frames:", error);
                return null;
            }
        }

        return new Promise((resolve) => {
            // Convert seconds to microseconds for WebCodecs
            const timestampMicroseconds = timestamp * 1000000;
            
            // Try to find a frame in the queue close to the requested timestamp
            let closestFrame = null;
            let smallestDiff = Number.MAX_VALUE;
            
            for (const frame of this.frameQueue) {
                const diff = Math.abs(frame.timestamp - timestampMicroseconds);
                if (diff < smallestDiff) {
                    smallestDiff = diff;
                    closestFrame = frame;
                }
            }
            
            if (closestFrame) {
                // Return the closest frame (caller is responsible for closing it)
                resolve(closestFrame);
            } else {
                // If no frame is found, try to extract it on demand
                this.extractSpecificFrame(timestamp).then(frame => {
                    resolve(frame);
                }).catch(() => {
                    resolve(null);
                });
            }
        });
    }

    /**
     * Extract a specific frame at a given timestamp
     * @param timestamp Time in seconds
     * @returns Promise that resolves with the VideoFrame or null
     */
    private async extractSpecificFrame(timestamp: number): Promise<VideoFrame | null> {
        if (!this.videoEl) {
            await this.getOrCreateLocalUrl();
            this.initializeVideoElement();
        }

        return new Promise<VideoFrame | null>((resolve, reject) => {
            try {
                if (!this.videoEl) {
                    reject(new Error("Video element not initialized"));
                    return;
                }

                // Seek to the timestamp
                this.videoEl.currentTime = timestamp;

                const handleSeeked = async () => {
                    this.videoEl?.removeEventListener('seeked', handleSeeked);
                    
                    try {
                        const canvas = new OffscreenCanvas(
                            this.videoEl?.videoWidth || 640, 
                            this.videoEl?.videoHeight || 480
                        );
                        const ctx = canvas.getContext('2d');
                        
                        if (!ctx || !this.videoEl) {
                            reject(new Error("Failed to create canvas context"));
                            return;
                        }
                        
                        // Draw the frame
                        ctx.drawImage(this.videoEl, 0, 0, canvas.width, canvas.height);
                        
                        // Create a VideoFrame
                        const bitmap = await createImageBitmap(canvas);
                        const frame = new VideoFrame(bitmap, {
                            timestamp: timestamp * 1000000,
                            duration: 1000000 / 30
                        });
                        
                        // Add to queue
                        this.frameQueue.push(frame);
                        
                        // Clean up
                        bitmap.close();
                        
                        resolve(frame);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                this.videoEl.addEventListener('seeked', handleSeeked);
                
                // Add timeout in case seeking gets stuck
                setTimeout(() => {
                    this.videoEl?.removeEventListener('seeked', handleSeeked);
                    reject(new Error("Seek timeout"));
                }, 2000);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        // Close all frames in the queue
        this.frameQueue.forEach(frame => {
            try {
                frame.close();
            } catch (e) {
                console.warn('Error closing video frame:', e);
            }
        });
        this.frameQueue = [];
        
        // Close the decoder
        if (this.videoDecoder) {
            try {
                this.videoDecoder.close();
            } catch (e) {
                console.warn('Error closing video decoder:', e);
            }
            this.videoDecoder = undefined;
        }
        
        this.isReady = false;
    }
}

export { VideoLoader };