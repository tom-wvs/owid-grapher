import { OwidVariablesAndEntityKey, EntityMeta } from "./OwidVariableSet"
import { OwidVariable } from "./OwidVariable"
import { slugify, groupBy } from "charts/Util"
import { max, min } from "lodash"
import { computed } from "mobx"

declare type int = number
declare type year = int
declare type columnName = string // let's be very restrictive on valid column names to start.

interface Row {
    [columnName: string]: any
}

interface OwidRow extends Row {
    entityName: string
    entityCode: string
    entityId: number
    year?: year
    day?: string
    _selected?: boolean
    _filtered?: boolean
}

interface OwidTripletTable {
    year: DayColumn | YearColumn
    entity: EntityColumn
    value: AbstractColumn
}

abstract class AbstractColumn {
    name: columnName = ""
    table: OwidTable

    constructor(table: OwidTable) {
        this.table = table
    }
}

abstract class AbstractTemporalColumn extends AbstractColumn {}
class DayColumn extends AbstractTemporalColumn {}
class YearColumn extends AbstractTemporalColumn {}
class NumberColumn extends AbstractColumn {}
class StringColumn extends AbstractColumn {}
class EntityColumn extends AbstractColumn {}

abstract class AbstractTable<ROW_TYPE> {
    rows: ROW_TYPE[]
    columnNames: Set<string>
    constructor(rows: ROW_TYPE[], columnNames: Set<string>) {
        this.rows = rows
        this.columnNames = columnNames
    }
}

export class OwidTable extends AbstractTable<OwidRow> {
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

    static fromLegacy(json: OwidVariablesAndEntityKey) {
        let rows: OwidRow[] = []
        const entityMetaById: { [id: string]: EntityMeta } = json.entityKey
        const columnNames = new Set(["entityName", "entityId", "entityCode"])
        for (const key in json.variables) {
            const variable = new OwidVariable(
                json.variables[key]
            ).setEntityNamesAndCodesFromEntityMap(entityMetaById)
            const columnName = slugify(variable.name)
            variable.display.yearIsDay
                ? columnNames.add("day")
                : columnNames.add("year")
            columnNames.add(columnName)
            const newRows = variable.values.map((value, index) => {
                const timePart = variable.display.yearIsDay ? "day" : "year"
                return {
                    [timePart]: variable.years[index],
                    [columnName]: value,
                    entityName: variable.entityNames[index],
                    entityId: variable.entities[index],
                    entityCode: variable.entityCodes[index]
                }
            })
            rows = rows.concat(newRows)
        }
        const groupMap = groupBy(rows, row => {
            const timePart =
                row.year !== undefined ? `year:` + row.year : `day:` + row.day
            return timePart + " " + row.entityName
        })

        const joinedRows = Object.keys(groupMap).map(groupKey =>
            Object.assign({}, ...groupMap[groupKey])
        )

        return new OwidTable(joinedRows, columnNames)
    }
}
