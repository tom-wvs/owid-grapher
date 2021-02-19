import { QueryParams } from "../../clientUtils/url"
import { Url } from "../../urls/Url"
import { UrlMigration, performUrlMigrations } from "../../urls/UrlMigration"
import { EntityUrlBuilder } from "./EntityUrlBuilder"

export const grapherUrlMigrations: UrlMigration[] = [
    (url) => {
        const { year, time } = url.queryParams
        if (!year) return url
        return url.updateQueryParams({
            year: undefined,
            time: time?.decoded ?? year?.decoded,
        })
    },
    (url) => {
        const { country } = url.queryParams
        if (!country) return url
        return url.updateQueryParams({
            country: undefined,
            selection: EntityUrlBuilder.entityNamesToQueryParam(
                EntityUrlBuilder.migrateLegacyCountryParam(country)
            ),
        })
    },
]

export const legacyToCurrentGrapherUrl = (url: Url) =>
    performUrlMigrations(grapherUrlMigrations, url)

export const legacyToCurrentGrapherQueryParams = (
    queryStr: string
): QueryParams => {
    const url = Url.fromQueryStr(queryStr)
    return legacyToCurrentGrapherUrl(url).queryParams
}
