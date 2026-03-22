/// <reference path="../pb_data/types.d.ts" />

// Combined migration: Creates the "booking" collection with ALL fields in final state.
// Also adds payment settings (paymentMode, depositPercent) to "prices" collection.
// This replaces 13 incremental migrations that had ordering issues.

migrate((app) => {
  // ── 1. Create booking collection ──────────────────────────
  const collection = new Collection({
    "id": "pbc_4092854851",
    "name": "booking",
    "type": "base",
    "system": false,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1579384326",
        "max": 0,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3885137012",
        "max": 0,
        "min": 0,
        "name": "email",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3898508260",
        "max": 0,
        "min": 0,
        "name": "phone",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number1817246020",
        "max": null,
        "min": null,
        "name": "guests",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "date1269603864",
        "max": "",
        "min": "",
        "name": "checkin",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date826688707",
        "max": "",
        "min": "",
        "name": "checkout",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1915095946",
        "max": 0,
        "min": 0,
        "name": "message",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_room_type",
        "max": 0,
        "min": 0,
        "name": "roomType",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number2819374650",
        "max": 4,
        "min": 1,
        "name": "numberOfRooms",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "date2261412156",
        "max": "",
        "min": "",
        "name": "createdAt",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2744374011",
        "max": 0,
        "min": 0,
        "name": "status",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_offer_id",
        "max": 0,
        "min": 0,
        "name": "offerId",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_offer_title",
        "max": 0,
        "min": 0,
        "name": "offerTitle",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_offer_price",
        "max": null,
        "min": 0,
        "name": "offerPrice",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "text_payment_status",
        "name": "paymentStatus",
        "type": "select",
        "required": false,
        "presentable": false,
        "system": false,
        "values": ["unpaid", "paid", "deposit_paid"]
      },
      {
        "hidden": false,
        "id": "text_payment_method",
        "name": "paymentMethod",
        "type": "select",
        "required": false,
        "presentable": false,
        "system": false,
        "values": ["cash", "card"]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_stripe_pi_id",
        "max": 0,
        "min": 0,
        "name": "stripePaymentIntentId",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number_paid_amount",
        "max": null,
        "min": 0,
        "name": "paidAmount",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number_total_amount",
        "max": null,
        "min": 0,
        "name": "totalAmount",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": ""
  })

  app.save(collection)

  // ── 2. Add payment settings to prices collection ──────────
  try {
    const prices = app.findCollectionByNameOrId("prices")

    // Check if paymentMode already exists
    const hasPaymentMode = prices.fields.find(f => f.name === "paymentMode")
    if (!hasPaymentMode) {
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
    }
  } catch (e) {
    // prices collection might not exist yet — will be created by later migration
    console.log("ℹ️ Prices collection not ready for payment fields, skipping")
  }

}, (app) => {
  // Down: delete booking collection
  try {
    const collection = app.findCollectionByNameOrId("booking")
    app.delete(collection)
  } catch (e) {}

  // Down: remove payment fields from prices
  try {
    const prices = app.findCollectionByNameOrId("prices")
    prices.fields = prices.fields.filter(f => !["paymentMode", "depositPercent"].includes(f.name))
    app.save(prices)
  } catch (e) {}
})

