/// <reference path="../pb_data/types.d.ts" />
// Recovery migration: re-adds image/thumbnail/description/title fields
// that were accidentally removed by the bad 1780000000 migration.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1063624087")

  const fieldDefs = [
    {
      id: "file3309110367",
      name: "image",
      def: {
        "hidden": false,
        "id": "file3309110367",
        "maxSelect": 1,
        "maxSize": 0,
        "mimeTypes": ["image/png", "image/jpeg", "image/webp", "image/gif"],
        "name": "image",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [],
        "type": "file"
      }
    },
    {
      id: "file_thumbnail",
      name: "thumbnail",
      def: {
        "hidden": false,
        "id": "file_thumbnail",
        "maxSelect": 1,
        "maxSize": 0,
        "mimeTypes": ["image/png", "image/jpeg", "image/webp", "image/gif"],
        "name": "thumbnail",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [],
        "type": "file"
      }
    },
    {
      id: "text1843675174",
      name: "description",
      def: {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1843675174",
        "max": 200,
        "min": 0,
        "name": "description",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    },
    {
      id: "text724990059",
      name: "title",
      def: {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text724990059",
        "max": 0,
        "min": 0,
        "name": "title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    }
  ]

  for (const f of fieldDefs) {
    const exists = collection.fields.find(field => field.name === f.name)
    if (!exists) {
      collection.fields.addAt(collection.fields.length, new Field(f.def))
      console.log(`Restored field: ${f.name}`)
    } else {
      console.log(`Field already exists, skipping: ${f.name}`)
    }
  }

  return app.save(collection)
}, (app) => {
  // no-op rollback
})

