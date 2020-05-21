export declare type PerCapita = boolean
export declare type AlignedOption = boolean
export declare type SmoothingOption = 0 | 3 | 7

export declare type DailyFrequencyOption = boolean
export declare type TotalFrequencyOption = boolean

export declare type DeathsMetricOption = boolean
export declare type CasesMetricOption = boolean
export declare type TestsMetricOption = boolean

export declare type countrySlug = string

export declare type MetricKind = "deaths" | "cases" | "tests"

export interface ParsedCovidRow {
    iso_code: string
    location: string
    date: string
    total_cases: number
    new_cases: number
    total_deaths: number
    new_deaths: number
    total_cases_per_million: number
    new_deaths_per_million: number
    total_tests: number
    new_tests: number
    total_tests_per_thousand: number
    new_tests_per_thousand: number
    tests_units: string
    stringency_index: number
    population: number
    population_density: number
    median_age: number
    aged_65_older: number
    aged_70_older: number
    gdp_per_capita: number
    extreme_poverty: number
    cvd_death_rate: number
    diabetes_prevalence: number
    female_smokers: number
    male_smokers: number
    handwashing_facilities: number
    hospital_beds_per_100k: number
}

export declare type CovidRowColumnName =
    | "continent"
    | "stringency_index"
    | "population"
    | "population_density"
    | "median_age"
    | "aged_65_older"
    | "aged_70_older"
    | "gdp_per_capita"
    | "extreme_poverty"
    | "cvd_death_rate"
    | "diabetes_prevalence"
    | "female_smokers"
    | "male_smokers"
    | "handwashing_facilities"
    | "hospital_beds_per_100k"

export interface CountryOption {
    name: string
    slug: countrySlug
    code: string
    continent: string
    population: number
    rows: ParsedCovidRow[]
    latestTotalTestsPerCase: number | undefined
    stringency_index: number
    population_density: number
    median_age: number
    aged_65_older: number
    aged_70_older: number
    gdp_per_capita: number
    extreme_poverty: number
    cvd_death_rate: number
    diabetes_prevalence: number
    female_smokers: number
    male_smokers: number
    handwashing_facilities: number
    hospital_beds_per_100k: number
}
