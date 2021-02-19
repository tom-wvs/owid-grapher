import { isEmpty, mapValues, omitUndefinedValues } from "./Util"

export type RawQueryParams = Record<string, string | undefined>

export interface QueryParam {
    _original: string
    decoded: string
}

export interface QueryParams {
    [key: string]: QueryParam | undefined
}

// Deprecated. Use getWindowQueryParams() to get the params from the global URL,
// or strToQueryParams(str) to parse an arbtirary query string.
export const getQueryParams = (queryStr?: string): QueryParams =>
    strToQueryParams(queryStr || getWindowQueryStr())

export const getWindowQueryParams = (): QueryParams =>
    strToQueryParams(getWindowQueryStr())

/**
 * Converts a query string into an object of key-value pairs.
 * Handles URI-decoding of the values.
 */
export const strToQueryParams = (queryStr = ""): QueryParams => {
    // we cannot use URLSearchParams here since we want to keep both encoded and decoded version of param.

    if (queryStr[0] === "?") queryStr = queryStr.substring(1)

    const querySplit = queryStr.split("&").filter((s) => !isEmpty(s))
    const params: QueryParams = {}

    for (const param of querySplit) {
        const [key, value] = param.split("=", 2)
        if (value != undefined)
            params[key] = {
                _original: value,
                decoded: decodeURIComponent(value.replace(/\+/g, "%20")),
            }
    }
    return params
}

export const strToDecodedQueryParams = (queryStr = ""): RawQueryParams =>
    mapValues(strToQueryParams(queryStr), (p) => p?.decoded)

export const rawQueryParamsToQueryParams = (
    rawQueryParams: RawQueryParams
): QueryParams =>
    mapValues(omitUndefinedValues(rawQueryParams), (p) => ({
        _original: encodeURIComponent(p),
        decoded: p,
    }))

/**
 * Converts an object to a query string.
 * Expects the input object to not be encoded already, and handles the URI-encoding of the values.
 */
export const queryParamsToStr = (params: RawQueryParams) => {
    const queryParams = new URLSearchParams(omitUndefinedValues(params))
    const newQueryStr = queryParams.toString()
    return newQueryStr.length ? `?${newQueryStr}` : ""
}

export const setWindowQueryVariable = (key: string, val: string | null) => {
    const params = mapValues(getWindowQueryParams(), (p) => p?.decoded)

    if (val === null || val === "") delete params[key]
    else params[key] = val

    setWindowQueryStr(queryParamsToStr(params))
}

export const getWindowQueryStr = () => window.location.search

export const setWindowQueryStr = (str: string) =>
    history.replaceState(
        null,
        document.title,
        window.location.pathname + str + window.location.hash
    )

export const splitURLintoPathAndQueryString = (
    url: string
): { path: string; queryString: string | undefined } => {
    const [path, queryString] = url.split(/\?/)
    return { path: path, queryString: queryString }
}
