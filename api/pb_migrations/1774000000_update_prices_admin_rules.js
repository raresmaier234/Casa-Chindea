/// <reference path="../pb_data/types.d.ts" />
// Migration: Allow all admin users to create/update/delete prices
migrate((app) => {
    const collection = app.findCollectionByNameOrId("prices")

    // Anyone can read prices (public)
    collection.listRule = ""
    collection.viewRule = ""

    // Any authenticated user with admin=true can create/update/delete
    collection.createRule = "@request.auth.admin = true"
    collection.updateRule = "@request.auth.admin = true"
    collection.deleteRule = "@request.auth.admin = true"

    return app.save(collection)
}, (app) => {
    const collection = app.findCollectionByNameOrId("prices")

    collection.createRule = "@request.auth.id != ''"
    collection.updateRule = "@request.auth.id != ''"
    collection.deleteRule = "@request.auth.id != '' && @request.auth.admin = true"

    return app.save(collection)
})

