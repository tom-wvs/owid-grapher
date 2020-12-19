import {
    EntityCode,
    EntityId,
    EntityName,
    OwidTableSlugs,
} from "../../coreTable/OwidTableConstants"
import { EntityUrlBuilder } from "../core/EntityUrlBuilder"
import { difference, mapBy } from "../../clientUtils/Util"
import { isPresent } from "../../clientUtils/isPresent"
import { action, computed, observable } from "mobx"

interface Entity {
    entityName: EntityName
    entityId?: EntityId
    entityCode?: EntityCode
}

export class SelectionArray {
    constructor(
        selectedEntityNames: EntityName[] = [],
        availableEntities: Entity[] = [],
        entityType = "country",
        onSelectionChange = () => {}
    ) {
        this._selectedEntityNames = selectedEntityNames.slice()
        this.availableEntities = availableEntities.slice()
        this.entityType = entityType
        this.onSelectionChange = onSelectionChange
    }

    private onSelectionChange: () => void

    entityType: string
    @observable private _selectedEntityNames: EntityName[]
    @observable private availableEntities: Entity[]

    @computed get selectedEntityNames() {
        return this._selectedEntityNames
    }

    @computed get availableEntityNames() {
        return this.availableEntities.map((entity) => entity.entityName)
    }

    @computed get availableEntityNameSet() {
        return new Set(this.availableEntityNames)
    }

    private mapBy(col: keyof Entity, val: keyof Entity) {
        return mapBy(
            this.availableEntities,
            (v) => v[col],
            (v) => v[val]
        )
    }

    @computed get entityNameToIdMap() {
        return this.mapBy(OwidTableSlugs.entityName, OwidTableSlugs.entityId)
    }

    @computed get entityCodeToNameMap() {
        return this.mapBy(OwidTableSlugs.entityCode, OwidTableSlugs.entityName)
    }

    @computed get entityIdToNameMap() {
        return this.mapBy(OwidTableSlugs.entityId, OwidTableSlugs.entityName)
    }

    @computed get hasSelection() {
        return this.selectedEntityNames.length > 0
    }

    @computed get unselectedEntityNames() {
        return difference(this.availableEntityNames, this.selectedEntityNames)
    }

    @computed get numSelectedEntities() {
        return this.selectedEntityNames.length
    }

    @computed get selectedSet() {
        return new Set<EntityName>(this.selectedEntityNames)
    }

    @computed get allSelectedEntityIds(): EntityId[] {
        const map = this.entityNameToIdMap
        return this.selectedEntityNames
            .map((name) => map.get(name))
            .filter(isPresent)
    }

    // Clears and sets selected entities
    @action.bound setSelectedEntities(entityNames: EntityName[]) {
        this.clearSelection()
        return this.addToSelection(entityNames)
    }

    @action.bound addAvailableEntityNames(entities: Entity[]) {
        this.availableEntities.push(...entities)
        return this
    }

    @action.bound setSelectedEntitiesByCode(entityCodes: EntityCode[]) {
        const map = this.entityCodeToNameMap
        const codesInData = entityCodes.filter((code) => map.has(code))
        return this.setSelectedEntities(
            codesInData.map((code) => map.get(code)!)
        )
    }

    @action.bound setSelectedEntitiesByEntityId(entityIds: EntityId[]) {
        const map = this.entityIdToNameMap
        return this.setSelectedEntities(entityIds.map((id) => map.get(id)!))
    }

    @action.bound selectAll() {
        return this.addToSelection(this.unselectedEntityNames)
    }

    @action.bound private setSelection(newSelection: EntityName[]) {
        this._selectedEntityNames = newSelection
        this.onSelectionChange()
        return this
    }

    @action.bound addToSelection(entityNames: EntityName[]) {
        return this.setSelection(this.selectedEntityNames.concat(entityNames))
    }

    @action.bound clearSelection() {
        return this.setSelection([])
    }

    @action.bound deselectEntity(entityName: EntityName) {
        return this.setSelection(
            this.selectedEntityNames.filter((name) => name !== entityName)
        )
    }

    @action.bound toggleSelection(entityName: EntityName) {
        return this.selectedSet.has(entityName)
            ? this.deselectEntity(entityName)
            : this.selectEntity(entityName)
    }

    @computed get numAvailableEntityNames() {
        return this.availableEntityNames.length
    }

    @action.bound selectEntity(entityName: EntityName) {
        return this.addToSelection([entityName])
    }

    // Mainly for testing
    @action.bound selectSample(howMany = 1) {
        return this.setSelectedEntities(
            this.availableEntityNames.slice(0, howMany)
        )
    }

    @computed get asParam() {
        return EntityUrlBuilder.entityNamesToEncodedQueryParam(
            this.selectedEntityNames
        )
    }
}
