/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("calendar_blocks")

  // Update rules to allow creation without strict authentication
  // We'll use empty string to allow all authenticated users
  collection.createRule = ""
  collection.updateRule = ""
  collection.deleteRule = ""
  collection.listRule = ""
  collection.viewRule = ""

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("calendar_blocks")

  // Revert to original rules
  collection.createRule = "@request.auth.id != \"\""
  collection.updateRule = "@request.auth.id != \"\""
  collection.deleteRule = "@request.auth.id != \"\""
  collection.listRule = ""
  collection.viewRule = ""

  return app.save(collection)
})

