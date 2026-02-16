/// <reference path="../pb_data/types.d.ts" />
// Migration: Update prices collection rules to allow admin access
migrate((app) => {
    const collection = app.findCollectionByNameOrId("prices")

    // Allow anyone to list/view prices
    collection.listRule = ""
    collection.viewRule = ""

    // Allow authenticated admins to create/update/delete
    // Using empty string ("") allows any authenticated user
    // For admin-only, we handle it in the backend
    collection.createRule = "@request.auth.id != ''"
    collection.updateRule = "@request.auth.id != ''"
    collection.deleteRule = "@request.auth.id != '' && @request.auth.admin = true"

    return app.save(collection)
}, (app) => {
    const collection = app.findCollectionByNameOrId("prices")

    // Revert to original rules
    collection.listRule = ""
    collection.viewRule = ""
    collection.createRule = null
    collection.updateRule = null
    collection.deleteRule = null

    return app.save(collection)
})

