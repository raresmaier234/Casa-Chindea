/// <reference path="../pb_data/types.d.ts" />
// Migration: Add payment fields to booking + payment settings to prices

migrate((app) => {
    // ── 1. booking collection: add payment fields ──
    const booking = app.findCollectionByNameOrId("booking")

    booking.fields.push(new Field({
        "system": false,
        "id": "text_payment_status",
        "name": "paymentStatus",
        "type": "select",
        "required": false,
        "presentable": false,
        "values": ["unpaid", "paid", "deposit_paid"]
    }))

    booking.fields.push(new Field({
        "system": false,
        "id": "text_payment_method",
        "name": "paymentMethod",
        "type": "select",
        "required": false,
        "presentable": false,
        "values": ["cash", "card"]
    }))

    booking.fields.push(new Field({
        "system": false,
        "id": "text_stripe_pi_id",
        "name": "stripePaymentIntentId",
        "type": "text",
        "required": false,
        "presentable": false
    }))

    booking.fields.push(new Field({
        "system": false,
        "id": "number_paid_amount",
        "name": "paidAmount",
        "type": "number",
        "required": false,
        "presentable": false,
        "options": { "min": 0, "max": null, "noDecimal": true }
    }))

    booking.fields.push(new Field({
        "system": false,
        "id": "number_total_amount",
        "name": "totalAmount",
        "type": "number",
        "required": false,
        "presentable": false,
        "options": { "min": 0, "max": null, "noDecimal": true }
    }))

    app.save(booking)

    // ── 2. prices collection: add payment mode settings ──
    const prices = app.findCollectionByNameOrId("prices")

    prices.fields.push(new Field({
        "system": false,
        "id": "text_payment_mode",
        "name": "paymentMode",
        "type": "select",
        "required": false,
        "presentable": false,
        "values": ["none", "full", "deposit"]
    }))

    prices.fields.push(new Field({
        "system": false,
        "id": "number_deposit_percent",
        "name": "depositPercent",
        "type": "number",
        "required": false,
        "presentable": false,
        "options": { "min": 1, "max": 99, "noDecimal": true }
    }))

    app.save(prices)

    // ── 3. Set defaults on existing prices row ──
    try {
        const existingPrices = app.findRecordsByFilter("prices", "1=1", "", 1, 0)
        if (existingPrices.length > 0) {
            const priceRecord = existingPrices[0]
            priceRecord.set("paymentMode", "none")
            priceRecord.set("depositPercent", 30)
            app.save(priceRecord)
            console.log("✅ Default payment settings applied to existing prices row")
        }
    } catch (e) {
        console.log("ℹ️ Could not set default payment settings:", e)
    }

}, (app) => {
    // Down: remove payment fields from booking
    const booking = app.findCollectionByNameOrId("booking")
    booking.fields = booking.fields.filter(f =>
        !["paymentStatus", "paymentMethod", "stripePaymentIntentId", "paidAmount", "totalAmount"].includes(f.name)
    )
    app.save(booking)

    // Down: remove payment settings from prices
    const prices = app.findCollectionByNameOrId("prices")
    prices.fields = prices.fields.filter(f =>
        !["paymentMode", "depositPercent"].includes(f.name)
    )
    app.save(prices)
})

