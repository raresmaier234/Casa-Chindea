/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4092854851")

  // add field for number of rooms
  collection.fields.addAt(9, new Field({
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
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4092854851")

  // remove field
  collection.fields.removeById("number2819374650")

  return app.save(collection)
})

