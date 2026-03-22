/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection
  try {
    collection = app.findCollectionByNameOrId("pbc_about_content")
  } catch (e) {
    // Collection doesn't exist — create it first
    collection = new Collection({
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
          "name": "section",
          "type": "text",
          "required": false,
          "presentable": false,
          "primaryKey": false,
          "system": false
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_title",
          "name": "title",
          "type": "text",
          "required": false,
          "presentable": false,
          "primaryKey": false,
          "system": false
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
  }

  unmarshal({ "createRule": "" }, collection)
  return app.save(collection)
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_about_content")
    unmarshal({ "createRule": null }, collection)
    return app.save(collection)
  } catch (e) {}
})

