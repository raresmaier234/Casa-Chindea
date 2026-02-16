/// <reference path="../pb_data/types.d.ts" />
// Migration: Update prices collection rules to allow admin access and add default row
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

    app.save(collection)

    // Add default prices row if none exists
    const existingRecords = app.findRecordsByFilter("prices", "1=1", "", 1, 0)
    if (existingRecords.length === 0) {
        const record = new Record(collection)
        record.set("priceRoom", 500)
        record.set("priceEntire", 3000)
        record.set("priceBreakfast", 50)
        record.set("priceBreakfastChild", 20)
        record.set("surchargeWeekend", 0)
        record.set("surchargeHoliday", 0)
        app.save(record)
    }
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

