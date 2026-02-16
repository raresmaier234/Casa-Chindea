/// <reference path="../pb_data/types.d.ts" />
// Migration: Add default prices row if none exists
migrate((app) => {
    const collection = app.findCollectionByNameOrId("prices")

    // Check if any records exist
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
        console.log("✅ Default prices row created")
    } else {
        console.log("ℹ️ Prices row already exists, skipping")
    }
}, (app) => {
    // Down migration - optional: remove default prices
    // We don't delete anything on rollback to preserve user data
})

