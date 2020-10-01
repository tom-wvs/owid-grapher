#! /usr/bin/env yarn jest

import * as TimeUnit from "grapher/utils/TimeUnit"

const YEAR: TimeUnit.TimeUnit = { type: "year", year: 2010 }
const QUARTER: TimeUnit.TimeUnit = {
    type: "quarter",
    year: 2010,
    quarter: 3,
}
const DAY: TimeUnit.TimeUnit = {
    type: "day",
    year: 2010,
    month: 2,
    day: 28,
}

describe(TimeUnit.add, () => {
    it("can add years", () => {
        expect(TimeUnit.add(YEAR, 1)).toEqual({ type: "year", year: 2011 })
    })

    it("can add quarters", () => {
        expect(TimeUnit.add(QUARTER, 1)).toEqual({
            type: "quarter",
            year: 2010,
            quarter: 4,
        })
        expect(TimeUnit.add(QUARTER, 3)).toEqual({
            type: "quarter",
            year: 2011,
            quarter: 2,
        })
    })

    it("can add days", () => {
        expect(TimeUnit.add(DAY, 1)).toEqual({
            type: "day",
            year: 2010,
            month: 3,
            day: 1,
        })
    })
})

describe(TimeUnit.sub, () => {
    it("can sub years", () => {
        expect(TimeUnit.sub(YEAR, 1)).toEqual({ type: "year", year: 2009 })
    })

    it("can sub quarters", () => {
        expect(TimeUnit.sub(QUARTER, 3)).toEqual({
            type: "quarter",
            year: 2009,
            quarter: 4,
        })
        expect(TimeUnit.sub(QUARTER, 6)).toEqual({
            type: "quarter",
            year: 2009,
            quarter: 1,
        })
    })

    it("can sub days", () => {
        expect(TimeUnit.sub(DAY, 2)).toEqual({
            type: "day",
            year: 2010,
            month: 2,
            day: 26,
        })
    })
})

describe(TimeUnit.toString, () => {
    it("converts year to string", () => {
        expect(TimeUnit.toString(YEAR)).toEqual("2010")
    })

    it("converts quarter to string", () => {
        expect(TimeUnit.toString(QUARTER)).toEqual("2010-Q3")
    })

    it("converts day to string", () => {
        expect(TimeUnit.toString(DAY)).toEqual("2010-02-28")
    })
})

describe(TimeUnit.fromString, () => {
    it("parses a year string", () => {
        expect(TimeUnit.fromString("2010")).toEqual(YEAR)
    })

    it("parses a quarter string", () => {
        expect(TimeUnit.fromString("2010-Q3")).toEqual(QUARTER)
    })

    it("parses a day string", () => {
        expect(TimeUnit.fromString("2010-02-28")).toEqual(DAY)
    })

    it("returns undefined for an invalid string", () => {
        expect(TimeUnit.fromString("+-123")).toEqual(undefined)
    })
})
