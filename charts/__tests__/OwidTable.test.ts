#! /usr/bin/env yarn jest

import { OwidTable } from "charts/owidData/OwidTable"

describe(OwidTable, () => {
    it("can create a table", () => {
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
        expect(table.rows.length).toEqual(1)
        expect(Array.from(table.columnsByName.keys()).length).toEqual(5)
    })
})
