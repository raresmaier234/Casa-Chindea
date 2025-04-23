import pocketbaseClient from "@/pocketbase-client";
import { ListResult } from "pocketbase";

export type Product = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  created: string;
  updated: string;
};

export const getPaginatedProducts = (
  page: number,
  perPage: number,
): Promise<ListResult<Product>> => {
  return pocketbaseClient.collection("products").getList(page, perPage);
};
