/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("prices")

  // Add paymentMode field (select: none, full, deposit)
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "system": false,
    "id": "paymentmode_field",
    "name": "paymentMode",
    "type": "select",
    "required": false,
    "presentable": false,
    "values": ["none", "full", "deposit"],
    "maxSelect": 1
  }))

  // Add depositPercent field
  collection.fields.addAt(collection.fields.length, new Field({
    "hidden": false,
    "system": false,
    "id": "depositpercent_field",
    "name": "depositPercent",
    "type": "number",
    "required": false,
    "presentable": false,
    "min": 0,
    "max": 100,
    "onlyInt": true
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("prices")

  collection.fields.removeById("paymentmode_field")
  collection.fields.removeById("depositpercent_field")

  return app.save(collection)
})
