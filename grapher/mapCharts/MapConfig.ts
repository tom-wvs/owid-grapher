import { observable } from "mobx"
import { MapProjectionName } from "./MapProjections"
import { ColorScaleConfig } from "../color/ColorScaleConfig"
import { ColumnSlug } from "../../coreTable/CoreTableConstants"
import { LegacyVariableId } from "../../clientUtils/owidTypes"
import {
    Persistable,
    updatePersistables,
    objectWithPersistablesToObject,
    deleteRuntimeAndUnchangedProps,
} from "../persistable/Persistable"
import { trimObject } from "../../clientUtils/Util"

// MapConfig holds the data and underlying logic needed by MapTab.
// It wraps the map property on ChartConfig.
// TODO: migrate database config & only pass legend props
class MapConfigDefaults {
    @observable columnSlug?: ColumnSlug
    @observable hideTimeline?: boolean

    @observable colorScale = new ColorScaleConfig()
    // Show the label from colorSchemeLabels in the tooltip instead of the numeric value
    @observable tooltipUseCustomLabels?: boolean = undefined
}

export type MapConfigInterface = MapConfigDefaults

interface MapConfigWithLegacyInterface extends MapConfigInterface {
    variableId?: LegacyVariableId
    targetYear?: number
}

export class MapConfig extends MapConfigDefaults implements Persistable {
    updateFromObject(obj: Partial<MapConfigWithLegacyInterface>) {
        // Migrate variableIds to columnSlugs
        if (obj.variableId && !obj.columnSlug)
            obj.columnSlug = obj.variableId.toString()

        updatePersistables(this, obj)
    }

    toObject() {
        const obj = objectWithPersistablesToObject(
            this
        ) as MapConfigWithLegacyInterface
        deleteRuntimeAndUnchangedProps(obj, new MapConfigDefaults())

        if (obj.columnSlug) {
            // Restore variableId for legacy for now
            obj.variableId = parseInt(obj.columnSlug)
            delete obj.columnSlug
        }

        return trimObject(obj)
    }

    constructor(obj?: Partial<MapConfigWithLegacyInterface>) {
        super()
        if (obj) this.updateFromObject(obj)
    }
}
