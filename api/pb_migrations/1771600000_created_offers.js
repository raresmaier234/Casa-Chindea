/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = new Collection({
        "name": "offers",
        "type": "base",
        "system": false,
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text_id",
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
                "hidden": false,
                "id": "autodate_created",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate_updated",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "offer_type_field",
                "name": "type",
                "type": "text",
                "required": true,
                "presentable": false,
                "system": false,
                "min": null,
                "max": null,
                "pattern": ""
            },
            {
                "hidden": false,
                "id": "offer_title_field",
                "name": "title",
                "type": "text",
                "required": true,
                "presentable": true,
                "system": false,
                "min": null,
                "max": null,
                "pattern": ""
            },
            {
                "hidden": false,
                "id": "offer_startdate_field",
                "name": "startDate",
                "type": "text",
                "required": true,
                "presentable": false,
                "system": false,
                "min": null,
                "max": null,
                "pattern": ""
            },
            {
                "hidden": false,
                "id": "offer_enddate_field",
                "name": "endDate",
                "type": "text",
                "required": true,
                "presentable": false,
                "system": false,
                "min": null,
                "max": null,
                "pattern": ""
            },
            {
                "hidden": false,
                "id": "offer_totalprice_field",
                "name": "totalPrice",
                "type": "number",
                "required": false,
                "presentable": false,
                "system": false,
                "min": 0,
                "max": null,
                "onlyInt": true
            },
            {
                "hidden": false,
                "id": "offer_roomprice_field",
                "name": "roomPrice",
                "type": "number",
                "required": false,
                "presentable": false,
                "system": false,
                "min": 0,
                "max": null,
                "onlyInt": true
            },
            {
                "hidden": false,
                "id": "offer_nights_field",
                "name": "nights",
                "type": "number",
                "required": false,
                "presentable": false,
                "system": false,
                "min": 1,
                "max": null,
                "onlyInt": true
            },
            {
                "hidden": false,
                "id": "offer_details_field",
                "name": "details",
                "type": "text",
                "required": false,
                "presentable": false,
                "system": false,
                "min": null,
                "max": null,
                "pattern": ""
            },
            {
                "hidden": false,
                "id": "offer_includes_field",
                "name": "includes",
                "type": "text",
                "required": false,
                "presentable": false,
                "system": false,
                "min": null,
                "max": null,
                "pattern": ""
            },
            {
                "hidden": false,
                "id": "offer_active_field",
                "name": "active",
                "type": "bool",
                "required": false,
                "presentable": false,
                "system": false
            }
        ],
        "listRule": "",
        "viewRule": "",
        "createRule": null,
        "updateRule": null,
        "deleteRule": null
    })

    return app.save(collection)
}, (app) => {
    const collection = app.findCollectionByNameOrId("offers")

    return app.delete(collection)
})
