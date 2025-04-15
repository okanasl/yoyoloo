import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { AudioItem, Item, VideoItem } from '../item/item';
import { LoadManager } from '../director/load-manager';
import { VideoLoader } from '../loaders/video';
import { AudioLoader } from '../loaders/audio';
import { ImageLoader } from '../loaders/image';

/**
 * A class that muxes a list of items into an MP4 video with audio using LoadManager for item loading.
 */
class MP4Muxer {
    private loadManager: LoadManager;
    private items: Item[];
    private outputWidth: number;
    private outputHeight: number;
    private frameRate: number;

    constructor(
        loadManager: LoadManager,
        items: Item[],
        outputWidth: number,
        outputHeight: number,
        frameRate: number = 30
    ) {
        this.loadManager = loadManager;
        this.items = items;
        this.outputWidth = outputWidth;
        this.outputHeight = outputHeight;
        this.frameRate = frameRate;
    }

    async mux(): Promise<Blob> {
        if (typeof OffscreenCanvas === 'undefined' ||
            typeof VideoEncoder === 'undefined' ||
            typeof AudioEncoder === 'undefined') {
            throw new Error('Required APIs (OffscreenCanvas, VideoEncoder, or AudioEncoder) are not supported');
        }

        // Filter and load media items
        const mediaItems = this.items.filter(item => 
            item.type === 'VIDEO' || item.type === 'IMAGE' || item.type === 'AUDIO'
        );
        const loadPromises = mediaItems.map(item => this.loadManager.load(item));
        await Promise.all(loadPromises);

        // Process all items
        const processedItems = await Promise.all(this.items.map(async (item) => {
            if (item.type === 'VIDEO') {
                const loader = this.loadManager.getLoader(item) as VideoLoader;
                const video = loader!.initializeVideoElement();
                await new Promise<void>((resolve) => {
                    video.onloadeddata = () => resolve();
                    video.load();
                });
                item.videoElement = video;
                return item;
            } else if (item.type === 'IMAGE') {
                const loader = this.loadManager.getLoader(item) as ImageLoader;
                const imageEl = loader!.initializeImageElement();
                await imageEl.decode();
                item.imageElement = imageEl;
                return item
            } else if (item.type === 'TEXT') {
                return { ...item, textContent: item.data as string };
            } else if (item.type === 'AUDIO') {
                const loader = this.loadManager.getLoader(item) as AudioLoader;
                const audio = loader!.initializeAudioElement();
                await new Promise<void>((resolve) => {
                    audio.onloadeddata = () => resolve();
                    audio.load();
                });
                item.audioElement = audio;
                return item;
            }
            return item;
        }));

        // Sort items and calculate duration
        const sortedItems = [...processedItems].sort((a, b) => a.zIndex - b.zIndex);
        const totalDurationMs = Math.max(...sortedItems.map(item => item.end_timestamp));
        const totalFrames = Math.ceil((totalDurationMs / 1000) * this.frameRate);
        const totalDurationSec = totalDurationMs / 1000;

        // Initialize muxer
        const muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
                codec: 'avc',
                width: this.outputWidth,
                height: this.outputHeight,
            },
            audio: {
                codec: 'aac',
                numberOfChannels: 1,
                sampleRate: 44100,
            },
            fastStart: 'in-memory',
        });

        // Setup video encoder
        const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error('VideoEncoder error:', e),
        });

        videoEncoder.configure({
            codec: 'avc1.42001f',
            width: this.outputWidth,
            height: this.outputHeight,
            bitrate: 1e6,
        });

        // Setup audio encoder
        const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: (e) => console.error('AudioEncoder error:', e),
        });

        audioEncoder.configure({
            codec: 'mp4a.40.2',
            numberOfChannels: 1,
            sampleRate: 44100,
            bitrate: 128000,
        });

        // Process audio
        const audioContext = new OfflineAudioContext(1, 44100 * totalDurationSec, 44100);
        
        // Collect audio sources (including from unmuted video items)
        const audioItems = sortedItems.filter(item => item.type === 'AUDIO' && item.audioElement) as AudioItem[];
        
        for (const item of audioItems) {
            let audioBuffer: AudioBuffer;
            if (item) {
                const loader = this.loadManager.audioLoaderMap.get(item.id);
                const arrayBuff = await loader?.blob?.arrayBuffer();
                if (arrayBuff) {
                    audioBuffer = await audioContext.decodeAudioData(arrayBuff)
                } else {
                    continue;
                }
            } else {
                continue;
            }
        
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(item.start_timestamp / 1000);
        }

        const renderedAudio = await audioContext.startRendering();
        const channel0 = renderedAudio.getChannelData(0);
        const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate: 44100,
            numberOfFrames: renderedAudio.length, // Frames per channel
            numberOfChannels: 1,
            timestamp: 0,
            data: channel0, // Full data for both channels
        });
        audioEncoder.encode(audioData);
        audioData.close();

        // Setup canvas for video
        const canvas = new OffscreenCanvas(this.outputWidth, this.outputHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from OffscreenCanvas');
        }

        // Render video frames
        for (let frame = 0; frame < totalFrames; frame++) {
            const currentTimeMs = (frame / this.frameRate) * 1000;
            ctx.clearRect(0, 0, this.outputWidth, this.outputHeight);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, this.outputWidth, this.outputHeight);

            for (const item of sortedItems) {
                if (currentTimeMs >= item.start_timestamp && currentTimeMs <= item.end_timestamp) {
                    if (item.type === 'VIDEO' && item.videoElement) {
                        const videoTime = (currentTimeMs - item.start_timestamp) / 1000;
                        await new Promise<void>((resolve) => {
                            if (!item.videoElement) {
                                throw new Error("Video element is not exists");
                            }
                            item.videoElement.currentTime = videoTime;
                            item.videoElement.addEventListener("seeked", () => resolve(), { once: true });
                        });
                        ctx.drawImage(item.videoElement, item.x, item.y, item.width, item.height);
                    } else if (item.type === 'IMAGE' && item.imageElement) {
                        ctx.drawImage(item.imageElement, item.x, item.y, item.width, item.height);
                    } else if (item.type === 'TEXT' && item.textContent) {
                        ctx.fillStyle = '#ffffff';
                        ctx.font = `${Math.min(item.height, 50)}px Arial`;
                        ctx.fillText(item.textContent, item.x, item.y + item.height);
                    }
                }
            }

            const timestamp = (frame / this.frameRate) * 1e6;
            const imageBitmap = await createImageBitmap(canvas);
            const videoFrame = new VideoFrame(imageBitmap, {
                timestamp,
                duration: (1 / this.frameRate) * 1e6,
            });
            videoEncoder.encode(videoFrame);
            videoFrame.close();
        }

        // Finalize encoding
        await Promise.all([videoEncoder.flush(), audioEncoder.flush()]);
        muxer.finalize();

        const { buffer } = muxer.target;
        return new Blob([buffer], { type: 'video/mp4' });
    }
}

export { MP4Muxer };