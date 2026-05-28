/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1063624087")

  // add order field
  unmarshal({
    "fields": [
      {
        "hidden": false,
        "id": "number_photo_order",
        "max": null,
        "min": null,
        "name": "order",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1063624087")

  // remove order field
  collection.fields.removeById("number_photo_order")

  return app.save(collection)
})

