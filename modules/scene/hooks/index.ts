import { useEffect, useState } from "react";

type PositionDeltaResponse = {
    /**
     * Calculated by width delta (container minus canvas on xAxis)
     */
    dX: number;
    /**
     * Calculated by height delta (container minus canvas on yAxis)
     */
    dY: number;
    /**
     * Scaling number of container relative to canvas (xAxis)
     */
    aX: number;
    /**
     * Scaling number of container relative to canvas (yAxis)
     */
    aY: number;
}

function useGetPositionDelta({canvasEl, containerEl}:{
    containerEl: HTMLDivElement | null,
    canvasEl: HTMLCanvasElement | null
}): PositionDeltaResponse | null {
    const [positionDelta, setPositionDelta] = useState<PositionDeltaResponse | null>(null);

    useEffect(() => {
        if (!containerEl || !canvasEl) return;

        const calculatePositionDelta = () => {
            const dX = containerEl.offsetWidth - canvasEl.offsetWidth;
            const dY = containerEl.offsetHeight - canvasEl.offsetHeight;
            const aX = containerEl.offsetWidth / canvasEl.offsetWidth;
            const aY = containerEl.offsetHeight / canvasEl.offsetHeight;
            return { dX, aX, dY, aY };
        };

        setPositionDelta(calculatePositionDelta());

        const containerObserver = new ResizeObserver(() => {
            setPositionDelta(calculatePositionDelta());
        });

        const canvasObserver = new ResizeObserver(() => {
            setPositionDelta(calculatePositionDelta());
        });

        containerObserver.observe(containerEl);
        canvasObserver.observe(canvasEl);

        return () => {
            containerObserver.disconnect();
            canvasObserver.disconnect();
        };
    }, [containerEl, canvasEl]);

    return positionDelta;
}

export { useGetPositionDelta }
