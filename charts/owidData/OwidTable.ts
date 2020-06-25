import { OwidVariablesAndEntityKey, EntityMeta } from "./OwidVariableSet"
import { OwidVariable, OwidVariableDisplaySettings } from "./OwidVariable"
import { slugify, groupBy } from "charts/Util"
import { max, min } from "lodash"
import { computed } from "mobx"
import { OwidSource } from "./OwidSource"

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

interface OwidTripletTable {
    year: DayColumn | YearColumn
    entity: EntityColumn
    value: AbstractColumn
}

interface ColumnSpec {
    slug: columnSlug
    name: string
    unit?: string
    shortUnit?: string
    isDailyMeasurement?: boolean
    description?: string
    coverage?: string
    datasetId?: int
    datasetName?: string
    source?: OwidSource
    display?: OwidVariableDisplaySettings
}

abstract class AbstractColumn {
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
        return this.table.rows.filter(row => row[slug] !== undefined)
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
    spec: TableSpec
    constructor(rows: ROW_TYPE[], specs: TableSpec) {
        this.rows = rows
        this.spec = specs
    }

    @computed get columnNames() {
        return new Set(this.spec.keys())
    }

    isEmpty() {
        return this.rows.length === 0
    }
}

export class OwidTable extends AbstractTable<OwidRow> {
    @computed get columns() {
        const map = new Map<number, AbstractColumn>()
        this.columnNames.forEach(slug => {
            const id = parseInt(slug.split("-")[0])
            map.set(id, new StringColumn(this, this.spec.get(slug)!))
        })
        return map
    }

    @computed get columnsByName() {
        const columns = this.columns
        const map = new Map<string, AbstractColumn>()
        columns.forEach(col => {
            map.set(col.name, col)
        })
        return map
    }

    @computed get columnsBySlug() {
        const columns = this.columns
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

    static fromLegacy(json: OwidVariablesAndEntityKey) {
        let rows: OwidRow[] = []
        const entityMetaById: { [id: string]: EntityMeta } = json.entityKey
        const columnSpecs = new Map()
        columnSpecs.set("entityName", {
            name: "entityName",
            slug: "entityName"
        })
        columnSpecs.set("entityId", { name: "entityId", slug: "entityId" })
        columnSpecs.set("entityCode", {
            name: "entityCode",
            slug: "entityCode"
        })

        for (const key in json.variables) {
            const variable = new OwidVariable(
                json.variables[key]
            ).setEntityNamesAndCodesFromEntityMap(entityMetaById)
            const columnName = variable.id + "-" + slugify(variable.name)
            const isDailyMeasurement = variable.display.yearIsDay
            const timeColumnName = isDailyMeasurement ? "day" : "year"
            isDailyMeasurement
                ? columnSpecs.set("day", { name: "day", slug: "day" })
                : columnSpecs.set("year", { name: "year", slug: "year" })
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

            columnSpecs.set(columnName, {
                name: variable.name,
                slug: columnName,
                isDailyMeasurement,
                unit,
                shortUnit,
                description,
                coverage,
                datasetId,
                datasetName,
                display,
                source
            })

            let annotationColumnName: string
            let annotationMap: Map<string, string>
            if (variable.display.entityAnnotationsMap) {
                annotationColumnName = this.makeAnnotationColumnSlug(
                    columnName + "-annotations"
                )
                annotationMap = this.annotationsToMap(
                    variable.display.entityAnnotationsMap
                )
                columnSpecs.set(annotationColumnName, {
                    name: annotationColumnName,
                    slug: annotationColumnName
                })
            }

            const newRows = variable.values.map((value, index) => {
                const entityName = variable.entityNames[index]
                const row: any = {
                    [timeColumnName]: variable.years[index],
                    [columnName]: value,
                    entityName,
                    entityId: variable.entities[index],
                    entityCode: variable.entityCodes[index]
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
