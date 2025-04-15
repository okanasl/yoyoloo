import * as React from "react"
import { useDirectorCtx } from "@/modules/scene/ctx/director-ctx"


function SceneContainer(props: React.ComponentProps<"div">) {
    const { setContainerEl } = useDirectorCtx();
    return (
      <div
        className="w-full h-full flex items-center justify-center grow max-w-full relative" ref={setContainerEl}
        {...props}
      />
    )
}

export { SceneContainer }
