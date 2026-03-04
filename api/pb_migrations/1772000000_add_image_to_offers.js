/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("offers");

    collection.fields.add(new Field({
        "hidden": false,
        "id": "file_offer_image",
        "maxSelect": 1,
        "maxSize": 10485760,
        "mimeTypes": ["image/jpeg", "image/png", "image/webp", "image/gif"],
        "name": "image",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": ["400x300"],
        "type": "file"
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("offers");
    collection.fields.removeById("file_offer_image");
    return app.save(collection);
});
