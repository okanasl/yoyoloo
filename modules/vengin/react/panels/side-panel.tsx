import { cn } from "@/lib/utils";
import { Assistant } from "@/components/assistant";


function SidePanel() {

    return (
    <div className={cn("flex flex-col divide-y-2 divide-muted w-[420px]")}>
        <Assistant />
    </div>
    )
}

export { SidePanel }