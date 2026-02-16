/// <reference path="../pb_data/types.d.ts" />
// Migration: Add offer fields to booking collection
migrate((app) => {
    const collection = app.findCollectionByNameOrId("booking")

    // Add offerId field
    collection.fields.push(new Field({
        "system": false,
        "id": "text_offer_id",
        "name": "offerId",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": null,
            "max": null,
            "pattern": ""
        }
    }))

    // Add offerTitle field
    collection.fields.push(new Field({
        "system": false,
        "id": "text_offer_title",
        "name": "offerTitle",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": null,
            "max": null,
            "pattern": ""
        }
    }))

    // Add offerPrice field
    collection.fields.push(new Field({
        "system": false,
        "id": "number_offer_price",
        "name": "offerPrice",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
            "min": 0,
            "max": null,
            "noDecimal": false
        }
    }))

    return app.save(collection)
}, (app) => {
    const collection = app.findCollectionByNameOrId("booking")

    // Remove offerPrice field
    collection.fields = collection.fields.filter(f => f.name !== "offerPrice")

    // Remove offerTitle field
    collection.fields = collection.fields.filter(f => f.name !== "offerTitle")

    // Remove offerId field
    collection.fields = collection.fields.filter(f => f.name !== "offerId")

    return app.save(collection)
})

