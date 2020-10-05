import { toInteger } from "grapher/utils/Util"
import moment from "moment"

export interface Year {
    type: "year"
    year: number
}

export interface Quarter {
    type: "quarter"
    year: number
    quarter: number
}

export interface Day {
    type: "day"
    year: number
    month: number
    day: number
}

export type TimeUnit = Year | Quarter | Day

export function add(time: TimeUnit, amount: number): TimeUnit {
    amount = toInteger(amount)

    switch (time.type) {
        case "year":
            return { ...time, year: time.year + amount }
        case "quarter":
            const sum = time.quarter - 1 + amount
            const deltaYear = Math.floor(sum / 4)
            const newQuarter = sum - deltaYear * 4
            return {
                ...time,
                year: time.year + deltaYear,
                quarter: newQuarter + 1,
            }
        case "day":
            const date = moment.utc({
                day: time.day,
                month: time.month - 1,
                year: time.year,
            })
            date.add(amount, "days")
            return {
                ...time,
                day: date.date(),
                month: date.month() + 1,
                year: date.year(),
            }
    }
}

export function sub(time: TimeUnit, amount: number): TimeUnit {
    return add(time, -amount)
}

export function next(time: TimeUnit): TimeUnit {
    return add(time, 1)
}

export function prev(time: TimeUnit): TimeUnit {
    return sub(time, 1)
}

export function toString(time: TimeUnit): string {
    switch (time.type) {
        case "year":
            return `${time.year}`
        case "quarter":
            return `${time.year}-Q${time.quarter}`
        case "day":
            return `${time.year}-${time.month
                .toString()
                .padStart(2, "0")}-${time.day.toString().padStart(2, "0")}`
    }
}

const YEAR_REGEXP = /^(-?\d{1,4})$/ // yyyy
const QUARTER_REGEXP = /^(-?\d{1,4})-Q(\d)$/ // yyyy-Qq, e.g. 2010-Q3
const DAY_REGEXP = /^(-?\d{1,4})-(\d{2})-(\d{2})$/ // yyyy-mm-dd

export function fromString(str: string): TimeUnit | undefined {
    const yearMatch = str.match(YEAR_REGEXP)
    if (yearMatch) {
        const year = toInteger(yearMatch[1])
        return { type: "year", year }
    }

    const quarterMatch = str.match(QUARTER_REGEXP)
    if (quarterMatch) {
        const [year, quarter] = [quarterMatch[1], quarterMatch[2]].map(
            toInteger
        )
        return { type: "quarter", year, quarter }
    }

    const dayMatch = str.match(DAY_REGEXP)
    if (dayMatch) {
        const [year, month, day] = [dayMatch[1], dayMatch[2], dayMatch[3]].map(
            toInteger
        )
        return { type: "day", year, month, day }
    }

    return undefined
}
