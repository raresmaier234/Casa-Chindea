/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "name": "prices",
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
        "id": "priceroom_field",
        "name": "priceRoom",
        "type": "number",
        "required": true,
        "presentable": false,
        "system": false,
        "min": 0,
        "max": null,
        "onlyInt": true
      },
      {
        "hidden": false,
        "id": "priceentire_field",
        "name": "priceEntire",
        "type": "number",
        "required": true,
        "presentable": false,
        "system": false,
        "min": 0,
        "max": null,
        "onlyInt": true
      },
      {
        "hidden": false,
        "id": "pricebreakfast_field",
        "name": "priceBreakfast",
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
        "id": "pricebreakfastchild_field",
        "name": "priceBreakfastChild",
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
        "id": "surchargeweekend_field",
        "name": "surchargeWeekend",
        "type": "number",
        "required": false,
        "presentable": false,
        "system": false,
        "min": 0,
        "max": 100,
        "onlyInt": true
      },
      {
        "hidden": false,
        "id": "surchargeholiday_field",
        "name": "surchargeHoliday",
        "type": "number",
        "required": false,
        "presentable": false,
        "system": false,
        "min": 0,
        "max": 100,
        "onlyInt": true
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
  const collection = app.findCollectionByNameOrId("prices")

  return app.delete(collection)
})

