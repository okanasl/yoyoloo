import * as React from "react"
import { useDirectorCtx } from "@/modules/scene/ctx/director-ctx"


function SceneCanvas(props: React.ComponentProps<"canvas">) {
    const { setCanvasEl } = useDirectorCtx();
    return (
      <canvas
        className={`bg-black mx-auto`}
        ref={setCanvasEl}
        {...props}
      />
    )
}

export { SceneCanvas }
