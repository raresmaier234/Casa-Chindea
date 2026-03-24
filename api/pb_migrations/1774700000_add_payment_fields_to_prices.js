/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("prices")

  // Add paymentMode field (select: none, full, deposit)
  collection.fields.push({
    "hidden": false,
    "id": "paymentmode_field",
    "name": "paymentMode",
    "type": "select",
    "required": false,
    "presentable": false,
    "system": false,
    "values": ["none", "full", "deposit"],
    "maxSelect": 1
  })

  // Add depositPercent field
  collection.fields.push({
    "hidden": false,
    "id": "depositpercent_field",
    "name": "depositPercent",
    "type": "number",
    "required": false,
    "presentable": false,
    "system": false,
    "min": 0,
    "max": 100,
    "onlyInt": true
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("prices")

  collection.fields = collection.fields.filter(f => f.name !== 'paymentMode' && f.name !== 'depositPercent')

  return app.save(collection)
})

