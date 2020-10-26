import { CoreTable } from "coreTable/CoreTable"
import { CsvString } from "coreTable/CoreTableConstants"
import { InvalidCellTypes, isValid } from "coreTable/InvalidCells"
import {
    EntityName,
    OwidColumnDef,
    OwidTableSlugs,
} from "coreTable/OwidTableConstants"
import { flatten } from "grapher/utils/Util"
import { MegaRow, MegaColumnMap, MegaSlugs } from "./CovidConstants"
import { CovidExplorerTable } from "./CovidExplorerTable"
import { megaDateToTime, euCountries } from "./CovidExplorerUtils"

export const MegaColumnDefs = Object.keys(MegaColumnMap).map((slug) => {
    return {
        ...MegaColumnMap[slug],
        slug,
    } as OwidColumnDef
})

export const MegaCsvToCovidExplorerTable = (
    megaCsv: CsvString,
    metaDataFromGrapherBackend?: any
) => {
    const coreTable = new CoreTable<MegaRow>(megaCsv, MegaColumnDefs, {
        tableDescription: "Load from MegaCSV",
        rowConversionFunction: (object) => {
            for (const key in object) {
                const value = object[key]
                if (key === MegaSlugs.location) {
                    delete object[key]
                    object[OwidTableSlugs.entityName] = value
                } else if (key === MegaSlugs.iso_code) {
                    delete object[key]
                    object[OwidTableSlugs.entityCode] = value
                } else if (key === MegaSlugs.date) {
                    object[OwidTableSlugs.time] = megaDateToTime(value)
                } else if (
                    key === MegaSlugs.test_units ||
                    key === MegaSlugs.continent
                ) {
                    object[key] = value.toString()
                } else {
                    const number = +value
                    if (!isNaN(number)) object[key] = number
                    else
                        object[key] =
                            InvalidCellTypes.UndefinedButShouldBeNumber
                }
            }
            return object
        },
    })
        .columnFilter(
            OwidTableSlugs.entityName,
            (name) => name !== "International",
            "Drop International rows"
        )
        .sortBy([OwidTableSlugs.time])

    const tableWithRows = addGroups(coreTable)

    return new CovidExplorerTable(
        tableWithRows.columnStore,
        tableWithRows.defs,
        {
            parent: tableWithRows as any,
            tableDescription: "Loaded into CovidExplorerTable",
        }
    )
        .updateColumnsToHideInDataTable()
        .loadColumnDefTemplatesFromGrapherBackend(metaDataFromGrapherBackend)
}

const reduceGroup = (table: CoreTable, groupName: EntityName) => {
    let runningPop = 0
    let runningTotal = 0
    const entityCode = groupName.replace(" ", "")
    const res = table.groupBy(OwidTableSlugs.time).map((table) =>
        table.reduce({
            entityName: () => groupName,
            entityCode: () => entityCode,
            new_cases: "sum",
            new_deaths: "sum",
            total_cases: (col) => {
                runningTotal += table.get("new_cases")!.sum ?? 0
                return runningTotal
            },
            population: (col) => {
                // Once we add a country to a group, we assume we will always have data for that country, so even if the
                // country is late in reporting the data keep that country in the population count.
                const sum = col.sum ?? 0
                if (sum > runningPop) runningPop = sum
                return runningPop
            },
        })
    )

    return flatten(res)
}

const addGroups = (coreTable: CoreTable) => {
    // todo: filter any rows w/o continent?
    const tablesToAppend = flatten(
        coreTable
            .columnFilter(
                MegaSlugs.continent,
                (val) => isValid(val) && !!val,
                "Just continents"
            )
            .groupBy(MegaSlugs.continent)
            .map((table) => reduceGroup(table, table.firstRow.continent))
    )

    const euTables = reduceGroup(
        coreTable.columnFilter(
            OwidTableSlugs.entityName,
            (name) => euCountries.has(name as string),
            "Get EU countries"
        ),
        "European Union"
    )

    // Drop the last day in aggregates containing Spain & Sweden
    euTables.pop()

    return coreTable
        .concat(tablesToAppend, `Added continent rows`)
        .concat(euTables, `Added EU rows`)
}
