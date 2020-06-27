import {
    OwidVariable,
    OwidVariableDisplaySettings,
    EntityMeta,
    OwidVariablesAndEntityKey
} from "./OwidVariable"
import {
    slugify,
    groupBy,
    computeRollingAverage,
    insertMissingValuePlaceholders,
    diffDateISOStringInDays
} from "charts/Util"
import { max, min, flatten } from "lodash"
import { computed, action, observable } from "mobx"
import { OwidSource } from "./OwidSource"
import { populationMap } from "charts/PopulationMap"
import { EPOCH_DATE } from "settings"

declare type int = number
declare type year = int
declare type color = string
declare type columnSlug = string // let's be very restrictive on valid column names to start.

interface Row {
    [columnName: string]: any
}

// Todo: replace with someone else's library
const computeRollingAveragesForEachGroup = (
    rows: Row[],
    valueAccessor: (row: Row) => any,
    groupColName: string,
    dateColName: string,
    rollingAverage: number
) => {
    const groups: number[][] = []
    let currentGroup = rows[0][groupColName]
    let currentRows: Row[] = []
    // Assumes items are sorted by entity
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const groupName = row && row[groupColName]
        if (currentGroup !== groupName) {
            const averages = computeRollingAverage(
                insertMissingValuePlaceholders(
                    currentRows.map(valueAccessor),
                    currentRows.map(row => row[dateColName])
                ),
                rollingAverage
            ).filter(value => value !== null) as number[]
            groups.push(averages)
            if (!row) break
            currentRows = []
            currentGroup = groupName
        }
        currentRows.push(row)
    }
    return flatten(groups)
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

export declare type RowBuilder = (row: Row, index?: int) => any

export abstract class AbstractColumn {
    spec: ColumnSpec
    table: AbstractTable<Row>

    constructor(table: AbstractTable<Row>, spec: ColumnSpec) {
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
    @observable protected columns: Map<columnSlug, AbstractColumn> = new Map()

    constructor(rows: ROW_TYPE[], specs?: TableSpec) {
        this.rows = rows
        this.spec = specs ? specs : this.detectSpec()
        Array.from(this.spec.keys()).forEach(slug => {
            this.setSpecAndInitColumn(slug, this.spec.get(slug)!)
        })
    }

    setSpecAndInitColumn(slug: string, spec: ColumnSpec) {
        this.columns.set(slug, new StringColumn(this, spec))
    }

    addColumn(spec: ColumnSpec, rowFn: RowBuilder) {
        const slug = spec.slug
        this.spec.set(slug, spec)
        this.columns.set(slug, new StringColumn(this, spec))
        this.rows.forEach((row, index) => {
            ;(row as any)[slug] = rowFn(row, index)
        })
        console.log("adding column " + slug, spec)
        return this
    }

    addRollingAverageColumn(
        spec: ColumnSpec,
        windowSize: int,
        valueAccessor: (row: Row) => any,
        dateColName: columnSlug,
        groupBy: columnSlug
    ) {
        const averages = computeRollingAveragesForEachGroup(
            this.rows,
            valueAccessor,
            groupBy,
            dateColName,
            windowSize
        )
        this.addColumn(
            spec,
            (row, index) => (row[spec.slug] = averages[index!])
        )
    }

    @computed get columnsBySlug() {
        return this.columns
    }

    @computed get columnsByName() {
        const map = new Map<string, AbstractColumn>()
        this.columns.forEach(col => {
            map.set(col.name, col)
        })
        return map
    }

    detectSpec() {
        this.spec = AbstractTable.makeSpecsFromRows(this.rows)
        return this.spec
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
    @computed get columnsByOwidVarId() {
        const map = new Map<number, AbstractColumn>()
        Array.from(this.columns.values()).forEach((column, index) => {
            map.set(column.spec.owidVariableId ?? index, column)
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

    printStats() {
        console.log(this.minYear, this.maxYear)
        console.log(this.toDelimited(",", 10))
    }

    addRows(rows: OwidRow[]) {
        this.rows = this.rows.concat(rows)
        return this
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

    private static columnSpecFromLegacyVariable(
        variable: OwidVariable
    ): ColumnSpec {
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

            const columnSpec = this.columnSpecFromLegacyVariable(variable)
            const columnSlug = columnSpec.slug
            columnSpec.isDailyMeasurement
                ? columnSpecs.set("day", { slug: "day" })
                : columnSpecs.set("year", { slug: "year" })
            columnSpecs.set(columnSlug, columnSpec)

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

            // Todo: remove
            const display = variable.display
            const yearsNeedTransform =
                display.yearIsDay &&
                display.zeroDay !== undefined &&
                display.zeroDay !== EPOCH_DATE
            const years = yearsNeedTransform
                ? this.convertLegacyYears(variable.years, display.zeroDay!)
                : variable.years

            const newRows = variable.values.map((value, index) => {
                const entityName = entityNames[index]
                const row: any = {
                    [timeColumnName]: years[index],
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

    // todo: remove
    private static convertLegacyYears(years: number[], zeroDay: string) {
        // Only shift years if the variable zeroDay is different from EPOCH_DATE
        // When the dataset uses days (`yearIsDay == true`), the days are expressed as integer
        // days since the specified `zeroDay`, which can be different for different variables.
        // In order to correctly join variables with different `zeroDay`s in a single chart, we
        // normalize all days to be in reference to a single epoch date.
        const diff = diffDateISOStringInDays(zeroDay, EPOCH_DATE)
        return years.map(y => y + diff)
    }
}
