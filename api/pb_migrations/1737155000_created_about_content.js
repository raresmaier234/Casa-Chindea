/// <reference path="../pb_data/types.d.ts" />

// Creates the "about_content" collection with final rules already applied.
// This replaces the empty placeholder + 2 update migrations.
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_about_content",
    "name": "about_content",
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
        "id": "text_section",
        "max": 0,
        "min": 0,
        "name": "section",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_title",
        "max": 0,
        "min": 0,
        "name": "title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "editor_content",
        "name": "content",
        "type": "editor",
        "system": false,
        "required": false,
        "presentable": false,
        "maxSize": 0
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
    const collection = app.findCollectionByNameOrId("about_content")
    return app.delete(collection)
  } catch (e) {}
})

