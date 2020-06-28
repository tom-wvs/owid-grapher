#! /usr/bin/env yarn jest

import { OwidTable } from "charts/owidData/OwidTable"
import { readVariable } from "test/fixtures"
import { slugify } from "charts/Util"

describe(OwidTable, () => {
    // Scenarios
    // create: rows|noRows & noSpec|fullSpec|partialSpec|incorrectSpec?
    //  add: rows
    //  add: spec
    //  add: spec with rowGen
    //  add: partialSpec
    //  add partialSpec with rowGen
    //  change spec?

    const rows = [
        {
            year: 2020,
            entityName: "United States",
            population: 3e8,
            entityId: 1,
            entityCode: "USA"
        }
    ]
    const table = new OwidTable(rows)
    it("can create a table and detect columns", () => {
        expect(table.rows.length).toEqual(1)
        expect(Array.from(table.columnsByName.keys()).length).toEqual(5)
    })

    it("a column can be added", () => {
        table.addColumn(
            { slug: "populationInMillions" },
            row => row.population / 1000000
        )
        expect(table.rows[0].populationInMillions).toEqual(300)
    })
})

describe("from legacy", () => {
    const varId = 3512
    const varSet = readVariable(varId)
    const table = OwidTable.fromLegacy(varSet)
    const name =
        "Prevalence of wasting, weight for height (% of children under 5)"
    it("can create a table and detect columns from legacy", () => {
        expect(table.rows.length).toEqual(805)
        expect(Array.from(table.columnsByName.keys())).toEqual([
            "entityName",
            "entityId",
            "entityCode",
            "year",
            name
        ])
    })
})

describe("rolling averages", () => {
    const rows = [
        {
            year: 2020,
            entityName: "United States",
            population: 3e8,
            entityId: 1,
            entityCode: "USA"
        }
    ]
    const table = new OwidTable(rows)
    it("a column can be added", () => {
        expect(table.rows.length).toEqual(1)
        expect(Array.from(table.columnsByName.keys()).length).toEqual(5)
        table.addColumn(
            { slug: "populationInMillions" },
            row => row.population / 1000000
        )
        expect(table.rows[0].populationInMillions).toEqual(300)
        expect(Array.from(table.columnsByName.keys()).length).toEqual(6)
    })
})
