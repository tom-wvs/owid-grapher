import { TooltipProps } from "../tooltip/TooltipProps"
import { Bounds } from "../../clientUtils/Bounds"
import { GrapherTabOption } from "../core/GrapherConstants"

export interface FooterManager {
    fontSize?: number
    sourcesLine?: string
    note?: string
    hasOWIDLogo?: boolean
    shouldLinkToOwid?: boolean
    originUrlWithProtocol?: string
    isMediaCard?: boolean
    tooltip?: TooltipProps
    tabBounds?: Bounds

    changeTabCommand?: (tabName: GrapherTabOption) => void
}
