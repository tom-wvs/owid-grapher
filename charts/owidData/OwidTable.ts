import { OwidVariablesAndEntityKey, EntityMeta } from "./OwidVariableSet"
import { OwidVariable, OwidVariableDisplaySettings } from "./OwidVariable"
import { slugify, groupBy } from "charts/Util"
import { max, min } from "lodash"
import { computed, action, observable } from "mobx"
import { OwidSource } from "./OwidSource"
import { populationMap } from "charts/PopulationMap"

declare type int = number
declare type year = int
declare type color = string
declare type columnSlug = string // let's be very restrictive on valid column names to start.

interface Row {
    [columnName: string]: any
}

interface OwidRow extends Row {
    entityName: string
    entityCode: string
    entityId: number
    year?: year
    day?: int
    date?: string
    _selected?: boolean
    _filtered?: boolean
    _color?: color
    annotation?: string
    // _x: boolean
    // _y: boolean
}

export interface ColumnSpec {
    slug: columnSlug
    name?: string
    owidVariableId?: int
    unit?: string
    shortUnit?: string
    isDailyMeasurement?: boolean
    description?: string
    coverage?: string
    datasetId?: string
    datasetName?: string
    source?: OwidSource
    display?: OwidVariableDisplaySettings
}

export abstract class AbstractColumn {
    private spec: ColumnSpec
    table: OwidTable

    constructor(table: OwidTable, spec: ColumnSpec) {
        this.table = table
        this.spec = spec
    }

    @computed get isDailyMeasurement() {
        return !!this.spec.isDailyMeasurement
    }

    @computed get unit() {
        return this.spec.unit || ""
    }

    @computed get shortUnit() {
        return this.spec.shortUnit || ""
    }

    @computed get display() {
        return this.spec.display || new OwidVariableDisplaySettings()
    }

    @computed get coverage() {
        return this.spec.coverage
    }

    @computed get annotationsMap() {
        const columnSlug = OwidTable.makeAnnotationColumnSlug(this.slug)
        const column = this.table.columnsBySlug.get(columnSlug)
        return column ? column.entityMap : undefined
    }

    @computed get entityMap() {
        const map = new Map<string, any>()
        const slug = this.slug
        this.rows.forEach(row => map.set(row.entityName, row[slug]))
        return map
    }

    @computed get description() {
        return this.spec.description
    }

    @computed get datasetName() {
        return this.spec.datasetName
    }

    @computed get source() {
        return this.spec.source
    }

    @computed get datasetId() {
        return this.spec.datasetId
    }

    @computed get name() {
        return this.spec.name ?? this.spec.slug
    }

    @computed get slug() {
        return this.spec.slug
    }

    @computed get entityNames() {
        return this.rows.map(row => row.entityName)
    }

    @computed get entitiesUniq() {
        return new Set(this.entityNames)
    }

    @computed get years() {
        return this.rows.map(row => (row.year ?? row.day)!)
    }

    @computed private get rows() {
        const slug = this.spec.slug
        return this.table.rows.filter(
            row => row[slug] !== undefined && !row._filtered
        )
    }

    @computed get values() {
        const slug = this.spec.slug
        return this.rows.map(row => row[slug])
    }
}

abstract class AbstractTemporalColumn extends AbstractColumn {}
class DayColumn extends AbstractTemporalColumn {}
class YearColumn extends AbstractTemporalColumn {}
class NumberColumn extends AbstractColumn {}
class StringColumn extends AbstractColumn {}
class EntityColumn extends AbstractColumn {}

declare type TableSpec = Map<columnSlug, ColumnSpec>

abstract class AbstractTable<ROW_TYPE> {
    rows: ROW_TYPE[]
    @observable spec: TableSpec
    constructor(rows: ROW_TYPE[], specs?: TableSpec) {
        this.rows = rows
        this.spec = specs ?? AbstractTable.makeSpecsFromRows(rows)
    }

    static makeSpecsFromRows(rows: any[]): TableSpec {
        const map = new Map()
        rows.forEach(row => {
            Object.keys(row).forEach(key => {
                map.set(key, { slug: key })
            })
        })
        return map
    }

    @computed get columnNames() {
        return new Set(this.spec.keys())
    }
}

export class OwidTable extends AbstractTable<OwidRow> {
    @computed get columnsByVarId() {
        const map = new Map<number, AbstractColumn>()
        Array.from(this.spec.keys()).forEach((slug, index) => {
            const spec = this.spec.get(slug)!
            map.set(
                spec?.owidVariableId! ?? index,
                new StringColumn(this, spec)
            )
        })
        return map
    }

    private _filterCount = 0
    private _minPopulationSize?: number
    private _selectedCountryNames?: Set<string>
    @action.bound applyFilters(
        selectedCountryNames: Set<string>,
        minPopulationSize?: int
    ) {
        if (minPopulationSize === undefined && !this._filterCount) return this
        this._minPopulationSize = minPopulationSize
        this._selectedCountryNames = selectedCountryNames
        this._filterCount = 0
        this.rows.forEach(row => {
            const name = row.entityName
            const filter = populationMap[name]
                ? populationMap[name] < minPopulationSize! &&
                  !selectedCountryNames.has(name)
                : false
            row._filtered = filter
            this._filterCount++
        })
        return this
    }

    @computed get columnsByName() {
        const columns = this.columnsByVarId
        const map = new Map<string, AbstractColumn>()
        columns.forEach(col => {
            map.set(col.name, col)
        })
        return map
    }

    @computed get columnsBySlug() {
        const columns = this.columnsByVarId
        const map = new Map<columnSlug, AbstractColumn>()
        columns.forEach(col => {
            map.set(col.slug, col)
        })
        return map
    }

    printStats() {
        console.log(this.minYear, this.maxYear)
        console.log(this.toDelimited(",", 10))
    }

    addColumn(spec: ColumnSpec, rowFn: (row: Row) => any) {
        const slug = spec.slug
        this.spec.set(spec.slug, spec)
        this.rows.forEach(row => {
            row[slug] = rowFn(row)
        })
    }

    // todo: have a debug param and spit out filtered, etc?
    toDelimited(delimiter = ",", rowLimit?: number) {
        const cols = Array.from(this.columnNames)
        const header = cols.join(delimiter) + "\n"
        const rows = rowLimit ? this.rows.slice(0, rowLimit) : this.rows
        const body = rows
            .map(row => cols.map(cName => row[cName] ?? "").join(delimiter))
            .join("\n")
        return header + body
    }

    @computed get availableEntities() {
        return Array.from(new Set(this.rows.map(row => row.entityName)))
    }

    // todo: can we remove at some point?
    @computed get entityIdToNameMap() {
        const map = new Map()
        this.rows.forEach(row => {
            map.set(row.entityId, row.entityName)
        })
        return map
    }

    // todo: can we remove at some point?
    @computed get entityNameToIdMap() {
        const map = new Map()
        this.rows.forEach(row => {
            map.set(row.entityName, row.entityId)
        })
        return map
    }

    // todo: can we remove at some point?
    @computed get entityNameToCodeMap() {
        const map = new Map()
        this.rows.forEach(row => {
            map.set(row.entityName, row.entityCode)
        })
        return map
    }

    @computed get maxYear() {
        return max(this.allYears)
    }

    @computed get minYear() {
        return min(this.allYears)
    }

    @computed get allYears() {
        return this.rows.filter(row => row.year).map(row => row.year!)
    }

    @computed get hasDayColumn() {
        return this.columnNames.has("day")
    }

    specToObject() {
        const spec = this.spec
        const output: any = {}
        Array.from(this.spec.keys()).forEach(slug => {
            output[slug] = spec.get(slug)
        })
        return output
    }

    toJs() {
        return {
            columns: this.specToObject(),
            rows: this.rows
        }
    }

    private static annotationsToMap(annotations: string) {
        // Todo: let's delete this and switch to traditional columns
        const entityAnnotationsMap = new Map<string, string>()
        const delimiter = ":"
        annotations.split("\n").forEach(line => {
            const [key, ...words] = line
                .split(delimiter)
                .map(word => word.trim())
            entityAnnotationsMap.set(key, words.join(delimiter))
        })
        return entityAnnotationsMap
    }

    static makeAnnotationColumnSlug(columnSlug: columnSlug) {
        return columnSlug + "-annotations"
    }

    static columnSpecFromVariable(variable: OwidVariable): ColumnSpec {
        const slug = variable.id + "-" + slugify(variable.name) // todo: remove?
        const {
            unit,
            shortUnit,
            description,
            coverage,
            datasetId,
            datasetName,
            source,
            display
        } = variable

        return {
            name: variable.name,
            slug,
            isDailyMeasurement: variable.display.yearIsDay,
            unit,
            shortUnit,
            description,
            coverage,
            datasetId,
            datasetName,
            display,
            source,
            owidVariableId: variable.id
        }
    }

    static fromLegacy(json: OwidVariablesAndEntityKey) {
        let rows: OwidRow[] = []
        const entityMetaById: { [id: string]: EntityMeta } = json.entityKey
        const columnSpecs = new Map()
        columnSpecs.set("entityName", {
            slug: "entityName"
        })
        columnSpecs.set("entityId", { slug: "entityId" })
        columnSpecs.set("entityCode", {
            slug: "entityCode"
        })

        for (const key in json.variables) {
            const variable = new OwidVariable(json.variables[key])

            const entityNames = variable.entities.map(
                id => entityMetaById[id].name
            )
            const entityCodes = variable.entities.map(
                id => entityMetaById[id].code
            )

            const columnSpec = this.columnSpecFromVariable(variable)
            const columnSlug = columnSpec.slug
            columnSpecs.set(columnSlug, columnSpec)

            columnSpec.isDailyMeasurement
                ? columnSpecs.set("day", { slug: "day" })
                : columnSpecs.set("year", { slug: "year" })

            // todo: remove. move annotations to their own first class column.
            let annotationColumnName: string
            let annotationMap: Map<string, string>
            if (variable.display.entityAnnotationsMap) {
                annotationColumnName = this.makeAnnotationColumnSlug(columnSlug)
                annotationMap = this.annotationsToMap(
                    variable.display.entityAnnotationsMap
                )
                columnSpecs.set(annotationColumnName, {
                    slug: annotationColumnName
                })
            }

            const timeColumnName = columnSpec.isDailyMeasurement
                ? "day"
                : "year"
            const newRows = variable.values.map((value, index) => {
                const entityName = entityNames[index]
                const row: any = {
                    [timeColumnName]: variable.years[index],
                    [columnSlug]: value,
                    entityName,
                    entityId: variable.entities[index],
                    entityCode: entityCodes[index]
                }
                if (annotationColumnName)
                    row[annotationColumnName] = annotationMap.get(entityName)
                return row
            })
            rows = rows.concat(newRows)
        }
        const groupMap = groupBy(rows, row => {
            const timePart =
                row.year !== undefined ? `year:` + row.year : `day:` + row.day
            return timePart + " " + row.entityName
        })

        const joinedRows: OwidRow[] = Object.keys(groupMap).map(groupKey =>
            Object.assign({}, ...groupMap[groupKey])
        )

        return new OwidTable(joinedRows, columnSpecs)
    }
}
