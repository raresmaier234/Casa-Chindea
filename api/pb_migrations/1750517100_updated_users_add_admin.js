/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add admin field
  collection.fields.addAt(collection.fields.length, new Field({
    "system": false,
    "id": "admin_field",
    "name": "admin",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove admin field
  collection.fields.removeById("admin_field")

  return app.save(collection)
})
