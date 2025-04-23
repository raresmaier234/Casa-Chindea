import { FC } from "react";
import {
  Card,
  CardProps,
  CardSection,
  Title,
  Text,
  Button,
} from "@mantine/core";
import Image from "next/image";

export type ProductCardProps = CardProps & {
  imageSrc: string;
  title: string;
  shortDescription: string;
};

const ProductCard: FC<ProductCardProps> = ({
  imageSrc,
  title,
  shortDescription,
  ...restProps
}) => {
  return (
    <Card {...restProps} shadow="sm" padding="lg" radius="md" withBorder>
      <CardSection>
        <Image
          src={imageSrc}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt={`image-${title}`}
        />
      </CardSection>

      <Title order={3}>{title}</Title>
      <Text>{shortDescription}</Text>

      <Button>Add to cart</Button>
    </Card>
  );
};

export default ProductCard;
