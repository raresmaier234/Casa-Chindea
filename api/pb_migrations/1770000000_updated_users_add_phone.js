/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_")

  if (!users) {
    console.log("Users collection not found, trying 'users'")
    users = app.findCollectionByNameOrId("users")
  }

  if (!users) {
    console.log("Could not find users collection")
    return
  }

  // Check if phone field already exists
  const existingField = users.fields.find(f => f.name === "phone")
  if (existingField) {
    console.log("Phone field already exists")
    return
  }

  // Add phone field to users collection using correct PocketBase syntax
  users.fields.push({
    name: "phone",
    type: "text",
    required: false,
    system: false,
    presentable: false,
    hidden: false,
    autogeneratePattern: "",
    min: 0,
    max: 20,
    pattern: ""
  })

  return app.save(users)
}, (app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_") || app.findCollectionByNameOrId("users")

  if (!users) return

  const phoneFieldIndex = users.fields.findIndex(f => f.name === "phone")
  if (phoneFieldIndex !== -1) {
    users.fields.splice(phoneFieldIndex, 1)
  }

  return app.save(users)
})

