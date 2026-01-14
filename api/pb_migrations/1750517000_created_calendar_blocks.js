/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "name": "calendar_blocks",
    "type": "base",
    "system": false,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text_id",
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
        "id": "autodate_created",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate_updated",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "startdate_field",
        "name": "startDate",
        "type": "date",
        "required": true,
        "presentable": false,
        "system": false,
        "min": "",
        "max": ""
      },
      {
        "hidden": false,
        "id": "enddate_field",
        "name": "endDate",
        "type": "date",
        "required": true,
        "presentable": false,
        "system": false,
        "min": "",
        "max": ""
      },
      {
        "hidden": false,
        "id": "reason_field",
        "name": "reason",
        "type": "text",
        "required": false,
        "presentable": false,
        "system": false,
        "autogeneratePattern": "",
        "max": 500,
        "min": 0,
        "pattern": "",
        "primaryKey": false
      },
      {
        "hidden": false,
        "id": "createdby_field",
        "name": "createdBy",
        "type": "relation",
        "required": false,
        "presentable": false,
        "system": false,
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "displayFields": null,
        "maxSelect": 1,
        "minSelect": null
      }
    ],
    "listRule": "",
    "viewRule": "",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("calendar_blocks")

  return app.delete(collection)
})