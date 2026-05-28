/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1063624087")

  // Check if order field already exists
  const existing = collection.fields.find(f => f.name === "order")
  if (existing) {
    console.log("Order field already exists in photos, skipping")
    return
  }

  // add order field properly (does NOT replace other fields)
  collection.fields.addAt(collection.fields.length, new Field({
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
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1063624087")
  collection.fields.removeById("number_photo_order")
  return app.save(collection)
})
