/// <reference path="../pb_data/types.d.ts" />

// Creates the "booking" collection that was originally created via PocketBase Admin UI.
// This migration ensures the collection exists before update migrations run.
migrate((app) => {
  // Check if it already exists (from local dev or previous deploy)
  try {
    app.findCollectionByNameOrId("booking")
    // Already exists — skip
    return
  } catch (e) {
    // Doesn't exist — create it
  }

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
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "number3402113753",
        "max": null,
        "min": null,
        "name": "price",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "bool2618758466",
        "name": "isAvailable",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": ""
  })

  return app.save(collection)
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("booking")
    return app.delete(collection)
  } catch (e) {
    // Ignore if doesn't exist
  }
})

