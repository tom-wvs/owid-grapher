import { OwidVariablesAndEntityKey, EntityMeta } from "./OwidVariableSet"
import { OwidVariable } from "./OwidVariable"
import { slugify, groupBy } from "charts/Util"

declare type int = number
declare type year = int
declare type columnName = string // let's be very restrictive on valid column names to start.

interface Row {
    [columnName: string]: any
}

interface OwidRow extends Row {
    entityName: string
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
    table: OwidTable = ""
}

abstract class AbstractTemporalColumn extends AbstractColumn {}
class DayColumn extends AbstractTemporalColumn {}
class YearColumn extends AbstractTemporalColumn {}
class NumberColumn extends AbstractColumn {}
class StringColumn extends AbstractColumn {}
class EntityColumn extends AbstractColumn {}

export class OwidTable {
    rows: Row[]
    constructor(rows: Row[]) {
        this.rows = rows
    }

    static fromLegacy(json: OwidVariablesAndEntityKey) {
        let rows: OwidRow[] = []
        const entityMetaById: { [id: string]: EntityMeta } = json.entityKey
        for (const key in json.variables) {
            const variable = new OwidVariable(
                json.variables[key]
            ).setEntityNamesFromEntityMap(entityMetaById)
            const columnName = slugify(variable.name)
            const newRows = variable.values.map((value, index) => {
                const timePart = variable.display.yearIsDay ? "day" : "year"
                return {
                    [timePart]: variable.years[index],
                    [columnName]: value,
                    entityName: variable.entityNames[index],
                    entityId: variable.entities[index]
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

        return new OwidTable(joinedRows)
    }
}
