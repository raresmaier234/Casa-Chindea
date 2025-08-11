/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
    const collection = new Collection({
        "id": "calendar_blocks_id",
        "created": "2025-01-20 10:00:00.000Z",
        "updated": "2025-01-20 10:00:00.000Z",
        "name": "calendar_blocks",
        "type": "base",
        "system": false,
        "schema": [
            {
                "system": false,
                "id": "startdate_field",
                "name": "startDate",
                "type": "date",
                "required": true,
                "presentable": false,
                "unique": false,
                "options": {
                    "min": "",
                    "max": ""
                }
            },
            {
                "system": false,
                "id": "enddate_field",
                "name": "endDate",
                "type": "date",
                "required": true,
                "presentable": false,
                "unique": false,
                "options": {
                    "min": "",
                    "max": ""
                }
            },
            {
                "system": false,
                "id": "reason_field",
                "name": "reason",
                "type": "text",
                "required": false,
                "presentable": false,
                "unique": false,
                "options": {
                    "min": null,
                    "max": 500,
                    "pattern": ""
                }
            },
            {
                "system": false,
                "id": "createdby_field",
                "name": "createdBy",
                "type": "relation",
                "required": false,
                "presentable": false,
                "unique": false,
                "options": {
                    "collectionId": "_pb_users_auth_",
                    "cascadeDelete": false,
                    "minSelect": null,
                    "maxSelect": 1,
                    "displayFields": ["email"]
                }
            }
        ],
        "indexes": [
            "CREATE INDEX idx_calendar_blocks_dates ON calendar_blocks (startDate, endDate)"
        ],
        "listRule": "",
        "viewRule": "",
        "createRule": "@request.auth.id != \"\"",
        "updateRule": "@request.auth.id != \"\"",
        "deleteRule": "@request.auth.id != \"\"",
        "options": {}
    })

    return Dao(db).saveCollection(collection)
}, (db) => {
    return Dao(db).deleteCollection("calendar_blocks_id")
})