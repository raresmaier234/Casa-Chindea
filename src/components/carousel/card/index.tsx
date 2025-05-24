import { FC } from "react";
import {
  Card,
  CardProps,
  CardSection,
} from "@mantine/core";
import Image from "next/image";

export type PhotosCardProps = CardProps & {
  imageSrc: string;
  title: string;
};

const PhotosCard: FC<PhotosCardProps> = ({
  imageSrc,
  title,
  ...restProps
}) => {

  return (
    <Card {...restProps} shadow="sm" padding="lg" radius="md" h="100%" mah={"700px"} mih={"550px"} withBorder>
      <CardSection className="relative h-64">
        <Image
            src={imageSrc}
            fill
            className="object-cover"
            alt={`image-${title}`}
            sizes="(max-width: 100%) 100vw, (max-width: 1200px) 50vw"
            priority
        />
      </CardSection>
    </Card>
  );
};

export default PhotosCard;
