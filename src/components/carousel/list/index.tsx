import { FC } from "react";
import { Carousel, CarouselSlide } from '@mantine/carousel';

export type PhotosListProps = {
  photos: string[];
};

const PhotosList: FC<PhotosListProps> = async ({ photos }) => {
  return (
      <Carousel withIndicators height={200}>
        <CarouselSlide>1</CarouselSlide>
          <CarouselSlide>2</CarouselSlide>

      </Carousel>
  );
};

export default PhotosList;
