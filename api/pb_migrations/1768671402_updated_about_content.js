/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection
  try {
    collection = app.findCollectionByNameOrId("pbc_about_content")
  } catch (e) {
    // Already created by previous migration — skip
    return
  }

  unmarshal({ "updateRule": "" }, collection)
  return app.save(collection)
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_about_content")
    unmarshal({ "updateRule": null }, collection)
    return app.save(collection)
  } catch (e) {}
})

