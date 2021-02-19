import { legacyToCurrentGrapherUrl } from "../../grapher/core/GrapherUrlMigrations"
import { Url } from "../../urls/Url"
import { UrlMigration } from "../../urls/UrlMigration"
import {
    decodeURIComponentOrUndefined,
    getExplorerSlugFromUrl,
    patchFromQueryParams,
    QueryParamTransformMap,
    transformQueryParams,
} from "./ExplorerUrlMigrationUtils"

const EXPLORER_SLUG = "energy"

const energyQueryParamTransformMap: QueryParamTransformMap = {
    "Total or Breakdown ": {
        newName: "Total or Breakdown Radio",
        transformValue: decodeURIComponentOrUndefined,
    },
    "Select a source ": {
        newName: "Select a source Dropdown",
        transformValue: decodeURIComponentOrUndefined,
    },
    "Energy or Electricity ": {
        newName: "Energy or Electricity Radio",
        transformValue: decodeURIComponentOrUndefined,
    },
    "Metric ": {
        newName: "Metric Dropdown",
        transformValue: decodeURIComponentOrUndefined,
    },
}

export const energyUrlMigration: UrlMigration = (url: Url) => {
    // if it's not the /explorer/energy path, skip it
    const explorerSlug = getExplorerSlugFromUrl(url)
    if (explorerSlug !== EXPLORER_SLUG) return url

    // if there is no patch param, then it's an old URL
    if (!url.queryParams._original.patch) {
        url = legacyToCurrentGrapherUrl(url)
        const queryParams = transformQueryParams(
            url.queryParams._original,
            energyQueryParamTransformMap
        )
        return url.setQueryParams({
            patch: patchFromQueryParams(queryParams).uriEncodedString,
        })
    }
    return url
}
