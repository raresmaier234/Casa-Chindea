import { Title, Stack } from "@mantine/core";
import { getPaginatedProducts } from "@/service/products";
import React from "react";
import PhotosList from "@/components/carousel/list";

export default async function Home() {
  const data = await getPaginatedProducts(0, 10);

  return (
    <Stack>
      <Title>Home Page</Title>
      <PhotosList photos={[""]} />
    </Stack>
  );
}
