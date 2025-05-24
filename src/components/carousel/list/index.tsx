"use client";

import { FC, useEffect, useState } from "react";
import PhotosCard from "@/components/carousel/card";
import PocketBase from "pocketbase";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import {Autoplay, Navigation, Pagination} from "swiper/modules";
import "@/global.css";


const pb = new PocketBase("http://127.0.0.1:8090");

type Photo = {
    id: string;
    image: string;
    collectionId: string;
    collectionName: string;
};

const PhotosList: FC = () => {
    const [photos, setPhotos] = useState<Photo[]>([]);

    useEffect(() => {
        (async () => {
            await pb.admins.authWithPassword("raresmaier123@gmail.com", "sacalaseni234");
            const records = await pb.collection("photos").getFullList<Photo>({
                sort: "-created",
            });
            setPhotos(records);
        })();
    }, []);

    const getImageUrl = (photo: Photo) => pb.files.getUrl(photo, photo.image);

    return (
        <>
            <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={20}
                slidesPerView={1}
                navigation
                autoplay={{ delay: 3000 }}
                loop
            >
                {photos.map((photo, index) => (
                    <SwiperSlide key={photo.id}>
                        <PhotosCard imageSrc={getImageUrl(photo)} title={`Image ${index + 1}`} />
                    </SwiperSlide>
                ))}
            </Swiper>
        </>
    );
};

export default PhotosList;