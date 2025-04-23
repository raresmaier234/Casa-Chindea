import { FC } from "react";
import { Product } from "@/service/products";
import { Stack } from "@mantine/core";
import ProductCard from "@/components/products/card";

export type ProductListProps = {
  products: Product[];
};

const ProductList: FC<ProductListProps> = async ({ products }) => {
  return (
    <Stack>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          imageSrc={"/"}
          title={product.name}
          shortDescription={"test"}
        />
      ))}
    </Stack>
  );
};

export default ProductList;
