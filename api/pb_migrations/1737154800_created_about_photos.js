/// <reference path="../pb_data/types.d.ts" />

// Creates the "about_photos" collection
migrate((app) => {
  const collection = new Collection({
    "id": "pbc_about_photos",
    "name": "about_photos",
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
        "hidden": false,
        "id": "file_image",
        "name": "image",
        "type": "file",
        "system": false,
        "required": false,
        "presentable": false,
        "maxSelect": 1,
        "maxSize": 5242880,
        "mimeTypes": ["image/jpeg","image/png","image/webp","image/gif"]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_description",
        "max": 0,
        "min": 0,
        "name": "description",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
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
    const collection = app.findCollectionByNameOrId("about_photos")
    return app.delete(collection)
  } catch (e) {}
})

