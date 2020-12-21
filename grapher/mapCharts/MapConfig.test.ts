#! /usr/bin/env jest

import { MapConfig } from "./MapConfig"

it("can serialize for saving", () => {
    expect(new MapConfig().toObject()).toEqual({})

    const map = new MapConfig()
    map.hideTimeline = true
    expect(map.toObject()).toEqual({
        hideTimeline: true,
    })
})

it("works with legacy variableId", () => {
    const map = new MapConfig({ variableId: 23 })
    expect(map.columnSlug).toEqual("23")
    expect(map.toObject()).toEqual({
        variableId: 23,
    })
})
