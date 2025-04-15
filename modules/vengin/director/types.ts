
type DirectorStatus = 'IDLE' | 'PLAY' | 'RENDER';
type DirectorAspectRatio = '16/9' | '9/16';

type VisualConfig = {
    aspectRatio: {
        width: number;
        height: number;
    };
    /**
     * FPS of the output media
     */
    FPS: number;
    /**
     * Resolution of the output media
     */
    resolution: {
        width: number;
        height: number;
    }
}

export type { DirectorAspectRatio, DirectorStatus, VisualConfig }
