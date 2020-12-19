import * as React from "react"
import { ScaleSelector, ScaleSelectorManager } from "../controls/ScaleSelector"
import { ScaleType } from "../core/GrapherConstants"
import { action, observable } from "mobx"

export default {
    title: "ScaleSelector",
    component: ScaleSelector,
}

class MockScaleSelectorManager implements ScaleSelectorManager {
    @observable scaleType = ScaleType.log

    @action.bound changeScaleTypeCommand(newScaleType: ScaleType) {
        this.scaleType = newScaleType
    }
}

export const Default = () => (
    <ScaleSelector manager={new MockScaleSelectorManager()} />
)
