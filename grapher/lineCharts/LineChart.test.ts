#! /usr/bin/env jest

import { LineChart } from "./LineChart"
import {
    SampleColumnSlugs,
    SynthesizeFruitTableWithNonPositives,
    SynthesizeFruitTableWithStringValues,
    SynthesizeGDPTable,
} from "../../coreTable/OwidTableSynthesizers"
import { ChartManager } from "../chart/ChartManager"
import { ScaleType, SeriesStrategy } from "../core/GrapherConstants"
import { OwidTable } from "../../coreTable/OwidTable"
import { SelectionArray } from "../selection/SelectionArray"

it("can create a new chart", () => {
    const table = SynthesizeGDPTable({ timeRange: [2000, 2010] })
    const manager: ChartManager = {
        table,
        yColumnSlugs: [SampleColumnSlugs.GDP],
    }
    const chart = new LineChart({ manager })

    expect(chart.failMessage).toBeTruthy()

    manager.selection = table.availableEntityNames

    expect(chart.failMessage).toEqual("")
    expect(chart.series.length).toEqual(2)
    expect(chart.placedSeries.length).toEqual(2)
    expect(chart.placedSeries[0].placedPoints[0].x).toBeGreaterThan(0)
})

it("can filter points with negative values when using a log scale", () => {
    const table = SynthesizeFruitTableWithNonPositives(
        {
            entityCount: 2,
            timeRange: [1900, 2000],
        },
        20,
        1
    )

    const manager: ChartManager = {
        table,
        yColumnSlugs: [SampleColumnSlugs.Fruit],
        selection: table.availableEntityNames,
    }
    const chart = new LineChart({ manager })
    expect(chart.series.length).toEqual(2)
    expect(chart.allPoints.length).toEqual(200)

    const logScaleManager = {
        ...manager,
        yAxisConfig: {
            scaleType: ScaleType.log,
        },
    }
    const logChart = new LineChart({ manager: logScaleManager })
    expect(logChart.verticalAxis.domain[0]).toBeGreaterThan(0)
    expect(logChart.series.length).toEqual(2)
    expect(logChart.allPoints.length).toEqual(180)
})

it("filters non-numeric values", () => {
    const table = SynthesizeFruitTableWithStringValues(
        {
            entityCount: 2,
            timeRange: [1900, 2000],
        },
        20,
        1
    )
    const manager: ChartManager = {
        table,
        yColumnSlugs: [SampleColumnSlugs.Fruit],
        selection: table.availableEntityNames,
    }
    const chart = new LineChart({ manager })
    expect(chart.series.length).toEqual(2)
    expect(chart.allPoints.length).toEqual(180)
})

it("will combine entity and column name when we set multi country multi column", () => {
    const table = SynthesizeGDPTable()
    const manager = {
        table,
        selection: table.availableEntityNames,
        canSelectMultipleEntities: true,
    }
    const chart = new LineChart({ manager })
    expect(chart.series[0].seriesName).toContain(" - ")
})

describe("colors", () => {
    const table = new OwidTable({
        entityName: ["usa", "canada", "usa", "canada"],
        year: [2000, 2000, 2001, 2001],
        gdp: [100, 200, 200, 300],
        entityColor: ["blue", "red", "blue", "red"],
    })
    const selection = ["usa", "canada"]
    it("can add custom colors", () => {
        const manager = {
            yColumnSlugs: ["gdp"],
            table,
            selection,
        }
        const chart = new LineChart({ manager })
        expect(chart.series.map((series) => series.color)).toEqual([
            "blue",
            "red",
        ])
    })

    it("uses column color selections when series strategy is column", () => {
        const table = new OwidTable(
            {
                entityName: ["usa", "usa"],
                year: [2000, 2001],
                gdp: [100, 200],
                entityColor: ["blue", "blue"],
            },
            [{ slug: "gdp", color: "green" }]
        )

        const manager: ChartManager = {
            yColumnSlugs: ["gdp"],
            table: table,
            selection,
            seriesStrategy: SeriesStrategy.column,
        }
        const chart = new LineChart({ manager })
        const series = chart.series

        expect(series).toHaveLength(1)
        expect(series[0].color).toEqual("green")
    })

    it("can assign colors to selected entities and preserve those colors when selection changes when using a color map", () => {
        const selection = new SelectionArray(["usa", "canada"])
        const manager: ChartManager = {
            yColumnSlugs: ["gdp"],
            table: table.dropColumns(["entityColor"]),
            selection,
            seriesColorMap: new Map(),
        }
        const chart = new LineChart({ manager })
        const series = chart.series
        expect(series).toHaveLength(2)

        selection.deselectEntity("usa")

        const newSeries = chart.series
        expect(newSeries).toHaveLength(1)
        expect(newSeries[0].color).toEqual(series[1].color)
    })
})

it("reverses order of plotted series to plot the first one over the others", () => {
    const table = new OwidTable(
        {
            entityName: ["usa", "usa"],
            year: [2000, 2001],
            gdp: [100, 200],
            pop: [100, 200],
        },
        [
            { slug: "gdp", color: "green" },
            { slug: "pop", color: "red" },
        ]
    )

    const manager: ChartManager = {
        yColumnSlugs: ["gdp", "pop"],
        table: table,
        selection: ["usa"],
        seriesStrategy: SeriesStrategy.column,
    }
    const chart = new LineChart({ manager })

    expect(chart.placedSeries).toHaveLength(2)
    expect(chart.placedSeries[0].seriesName).toEqual("pop")
})
