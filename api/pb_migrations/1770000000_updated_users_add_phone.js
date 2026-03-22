/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let users
  try {
    users = app.findCollectionByNameOrId("_pb_users_auth_")
  } catch (e) {
    try {
      users = app.findCollectionByNameOrId("users")
    } catch (e2) {
      console.log("Could not find users collection, skipping")
      return
    }
  }

  // Check if phone field already exists
  const existingField = users.fields.find(f => f.name === "phone")
  if (existingField) {
    console.log("Phone field already exists")
    return
  }

  // Add phone field using new Field() constructor (required for PocketBase v0.25+)
  users.fields.addAt(users.fields.length, new Field({
    "hidden": false,
    "id": "text_phone_field",
    "max": 20,
    "min": 0,
    "name": "phone",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text",
    "autogeneratePattern": ""
  }))

  return app.save(users)
}, (app) => {
  try {
    const users = app.findCollectionByNameOrId("_pb_users_auth_")
    users.fields.removeById("text_phone_field")
    return app.save(users)
  } catch (e) {}
})

