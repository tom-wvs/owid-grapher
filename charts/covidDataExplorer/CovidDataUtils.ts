import {
    dateDiffInDays,
    flatten,
    cloneDeep,
    map,
    groupBy,
    parseFloatOrUndefined,
    difference,
    entries,
    minBy,
    fromPairs,
    sortBy
} from "charts/Util"
import moment from "moment"
import {
    ParsedCovidCsvRow,
    MetricKind,
    CountryOption,
    CovidGrapherRow
} from "./CovidTypes"
import { variablePartials } from "./CovidVariablePartials"
import { csv } from "d3-fetch"
import { ColumnSpec } from "charts/owidData/OwidTable"

const keepStrings = new Set(
    `iso_code location date tests_units continent`.split(" ")
)

const ents = new Set()
export const parseCovidRow = (row: ParsedCovidCsvRow) => {
    const newRow: Partial<CovidGrapherRow> = row
    Object.keys(row).forEach(key => {
        const isNumeric = !keepStrings.has(key)
        if (isNumeric)
            (row as any)[key] = parseFloatOrUndefined((row as any)[key])
        if (key === "iso_code" && !row.iso_code) {
            if (row.location === "World") row.iso_code = "OWID_WRL"
            else if (row.location === "International") row.iso_code = "OWID_INT"
        }
    })
    newRow.entityName = row.location
    newRow.entityCode = row.iso_code
    newRow.day = dateToYear(row.date)
    ents.add(row.location)
    newRow.entityId = ents.size - 1

    return row
}

const EPOCH_DATE = "2020-01-21"

const dateToYear = (dateString: string): number =>
    dateDiffInDays(
        moment.utc(dateString).toDate(),
        moment.utc(EPOCH_DATE).toDate()
    )

declare type RowAccessor = (row: ParsedCovidCsvRow) => number | undefined

// export const covidDataPath = "https://covid.ourworldindata.org/data/owid-covid-data.csv"
export const covidDataPath = "http://localhost:3099/sandbox/testData.csv"

export const covidLastUpdatedPath =
    "https://covid.ourworldindata.org/data/owid-covid-data-last-updated-timestamp.txt"

export const fetchAndParseData = async (): Promise<CovidGrapherRow[]> => {
    const rawData = await csv(covidDataPath)
    const filtered = rawData
        .map(parseCovidRow)
        .filter(
            row => row.location !== "World" && row.location !== "International"
        )

    const continentRows = generateContinentRows(filtered)
    const euRows = calculateRowsForGroup(getEuRows(filtered), "European Union")
    return filtered.concat(continentRows, euRows)
}

const getEuRows = (rows: ParsedCovidCsvRow[]) =>
    rows.filter(row => euCountries.has(row.location))

const euCountries = new Set([
    "Austria",
    "Belgium",
    "Bulgaria",
    "Croatia",
    "Cyprus",
    "Czech Republic",
    "Denmark",
    "Estonia",
    "Finland",
    "France",
    "Germany",
    "Greece",
    "Hungary",
    "Ireland",
    "Italy",
    "Latvia",
    "Lithuania",
    "Luxembourg",
    "Malta",
    "Netherlands",
    "Poland",
    "Portugal",
    "Romania",
    "Slovakia",
    "Slovenia",
    "Spain",
    "Sweden"
])

export const calculateRowsForGroup = (
    group: ParsedCovidCsvRow[],
    groupName: string
) => {
    const groupRows = new Map<string, ParsedCovidCsvRow>()
    const rows = sortBy(group, row => moment(row.date).unix())
    rows.forEach(row => {
        const day = row.date
        if (!groupRows.has(day)) {
            const newRow: any = {}
            Object.keys(row).forEach(key => (newRow[key] = undefined))
            groupRows.set(day, {
                location: groupName,
                iso_code: groupName.replace(" ", ""),
                date: day,
                new_cases: 0,
                new_deaths: 0,
                population: 0
            } as ParsedCovidCsvRow)
        }
        const newRow = groupRows.get(day)!
        newRow.population += row.population
        newRow.new_cases += row.new_cases || 0
        newRow.new_deaths += row.new_deaths || 0
    })
    const newRows = Array.from(groupRows.values())
    let total_cases = 0
    let total_deaths = 0
    let maxPopulation = 0
    // We need to compute cumulatives again because sometimes data will stop for a country.
    newRows.forEach(row => {
        total_cases += row.new_cases
        total_deaths += row.new_deaths
        row.total_cases = total_cases
        row.total_deaths = total_deaths
        if (row.population > maxPopulation) maxPopulation = row.population

        // Once we add a country to a group, we assume we will always have data for that country, so even if the
        // country is late in reporting the data keep that country in the population count.
        row.population = maxPopulation
    })
    return newRows
}

// Generates rows for each region.
export const generateContinentRows = (rows: ParsedCovidCsvRow[]) => {
    const grouped = groupBy(rows, "continent")
    return flatten(
        Object.keys(grouped)
            .filter(cont => cont)
            .map(continentName =>
                calculateRowsForGroup(grouped[continentName], continentName)
            )
    )
}

export const makeCountryOptions = (
    data: ParsedCovidCsvRow[]
): CountryOption[] => {
    const rowsByCountry = groupBy(data, "iso_code")
    return map(rowsByCountry, rows => {
        const { location, iso_code, population, continent } = rows[0]
        return {
            name: location,
            slug: location,
            code: iso_code,
            population,
            continent,
            rows
        }
    })
}

type MetricKey = {
    [K in MetricKind]: number
}

export const buildCovidVariableId = (
    name: MetricKind,
    perCapita: number,
    rollingAverage?: number,
    daily?: boolean
): number => {
    const arbitraryStartingPrefix = 1145
    const names: MetricKey = {
        tests: 0,
        cases: 1,
        deaths: 2,
        positive_test_rate: 3,
        case_fatality_rate: 4,
        tests_per_case: 5
    }
    const parts = [
        arbitraryStartingPrefix,
        names[name],
        daily ? 1 : 0,
        perCapita,
        rollingAverage
    ]
    return parseInt(parts.join(""))
}

function buildEntityAnnotations(
    data: ParsedCovidCsvRow[],
    metric: MetricKind
): string | undefined {
    if (
        metric === "cases" ||
        metric === "deaths" ||
        metric === "case_fatality_rate"
    ) {
        return `Benin: Note that on May 19 the methodology has changed
Spain: Note that on May 25 the methodology has changed
United Kingdom: Note that on June 1 the methodology has changed
Panama: Note that on June 3 the methodology has changed
European Union: Some EU countries changed methodology. See country-by-country series.
India: Note that on June 17 earlier deaths were added to the total.`
    } else if (
        metric === "tests" ||
        metric === "positive_test_rate" ||
        metric === "tests_per_case"
    ) {
        // convert to object to extract unique country => unit mapping
        const unitByCountry = fromPairs(
            data
                .filter(row => row.tests_units)
                .map(row => [row.location, row.tests_units])
        )
        return Object.entries(unitByCountry)
            .map(([location, unit]) => `${location}: ${unit}`)
            .join("\n")
    }
    return undefined
}

export const buildColumnSpec = (
    newId: number,
    name: MetricKind,
    perCapita: number,
    daily?: boolean,
    rollingAverage?: number,
    updatedTime?: string
): ColumnSpec => {
    const spec = cloneDeep(variablePartials[name]) as ColumnSpec
    spec.slug = [
        name,
        perCapita === 1e3
            ? "perThousand"
            : perCapita === 1e6
            ? "perMil"
            : undefined,
        daily ? "daily" : "cumulative",
        rollingAverage ? rollingAverage + "DayAvg" : undefined
    ]
        .filter(i => i)
        .join("-")
    spec.owidVariableId = newId
    spec.source!.name = `${spec.source!.name}${updatedTime}`

    const messages: { [index: number]: string } = {
        1: "",
        1000: " per thousand people",
        1000000: " per million people"
    }

    spec.display!.name = `${daily ? "Daily " : "Cumulative "}${
        spec.display!.name
    }${messages[perCapita]}`

    // Show decimal places for rolling average & per capita variables
    if (perCapita > 1) {
        spec.display!.numDecimalPlaces = 2
    } else if (
        name === "positive_test_rate" ||
        name === "case_fatality_rate" ||
        (rollingAverage && rollingAverage > 1)
    ) {
        spec.display!.numDecimalPlaces = 1
    } else {
        spec.display!.numDecimalPlaces = 0
    }

    // variable.display!.entityAnnotationsMap = buildEntityAnnotations(rows, name)

    return spec
}

export const getTrajectoryOptions = (
    metric: MetricKind,
    daily: boolean,
    perCapita: boolean
) => {
    const key = metric === "cases" ? metric : "deaths"
    return trajectoryOptions[key][
        perCapita ? "perCapita" : daily ? "daily" : "total"
    ]
}

const trajectoryOptions = {
    deaths: {
        total: {
            title: "Days since the 5th total confirmed death",
            threshold: 5,
            id: 4561,
            sourceColumn: "total_deaths"
        },
        daily: {
            title: "Days since 5 daily new deaths first reported",
            threshold: 5,
            id: 4562,
            sourceColumn: "new_deaths"
        },
        perCapita: {
            title: "Days since total confirmed deaths reached 0.1 per million",
            threshold: 0.1,
            id: 4563,
            sourceColumn: "new_deaths" // todo: fix
        }
    },
    cases: {
        total: {
            title: "Days since the 100th confirmed case",
            threshold: 100,
            id: 4564,
            sourceColumn: "total_cases"
        },
        daily: {
            title: "Days since confirmed cases first reached 30 per day",
            threshold: 30,
            id: 4565,
            sourceColumn: "new_cases"
        },
        perCapita: {
            title:
                "Days since the total confirmed cases per million people reached 1",
            threshold: 1,
            id: 4566,
            sourceColumn: "new_cases" // todo: fix
        }
    }
}

export function getLeastUsedColor(
    availableColors: string[],
    usedColors: string[]
): string {
    // If there are unused colors, return the first available
    const unusedColors = difference(availableColors, usedColors)
    if (unusedColors.length > 0) {
        return unusedColors[0]
    }
    // If all colors are used, we want to count the times each color is used, and use the most
    // unused one.
    const colorCounts = entries(groupBy(usedColors)).map(([color, arr]) => [
        color,
        arr.length
    ])
    const mostUnusedColor = minBy(colorCounts, ([, count]) => count) as [
        string,
        number
    ]
    return mostUnusedColor[0]
}
