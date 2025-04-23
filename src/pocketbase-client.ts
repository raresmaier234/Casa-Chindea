import PocketBase from "pocketbase";

const pocketBaseClient = new PocketBase(
  process.env.POCKETBASE_CONNECTION_URL || "http://127.0.0.1:8090",
);

export default pocketBaseClient;
