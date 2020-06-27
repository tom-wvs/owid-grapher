import { extend } from "../Util"
import { observable, computed } from "mobx"
import { OwidSource } from "./OwidSource"

export class OwidVariableDisplaySettings {
    @observable name?: string = undefined
    @observable unit?: string = undefined
    @observable shortUnit?: string = undefined
    @observable isProjection?: true = undefined
    @observable conversionFactor?: number = undefined
    @observable numDecimalPlaces?: number = undefined
    @observable tolerance?: number = undefined
    @observable yearIsDay?: boolean = undefined
    @observable zeroDay?: string = undefined
    @observable entityAnnotationsMap?: string = undefined
    @observable includeInTable?: boolean = true
}

export class OwidVariable {
    @observable.ref id!: number
    @observable.ref name!: string
    @observable.ref description!: string
    @observable.ref unit!: string
    @observable.ref shortUnit!: string
    @observable.ref datasetName!: string
    @observable.ref datasetId!: string

    @observable.ref coverage?: string

    @observable
    display: OwidVariableDisplaySettings = new OwidVariableDisplaySettings()

    @observable.struct source!: OwidSource
    @observable.ref years: number[] = []
    @observable.ref entityNames: string[] = []
    @observable.ref entityCodes: string[] = []
    @observable.ref entities: number[] = []
    @observable.ref values: (string | number)[] = []

    constructor(json: any) {
        for (const key in this) {
            if (key in json) {
                if (key === "display") {
                    extend(this.display, json.display)
                } else {
                    this[key] = json[key]
                }
            }
        }
    }
}
