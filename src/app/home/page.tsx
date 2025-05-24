import {Container} from "@mantine/core";
import {getServerSession} from "next-auth";
import {authOptions} from "../api/auth/[...nextauth]/route";
import PhotosList from "@/components/carousel/list";
import ReservationSection from "@/components/ReservationSection";
import Map from "@/components/map";

const HomePage = async () => {
    const session = await getServerSession(authOptions);

    return (
        <Container h="200vh" mt={100} maw={"100%"} pl={100} pr={100}>
            <PhotosList/>
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr", // wrap on smaller screens
                gap: 20,
                justifyContent: 'center',
            }}>
                <ReservationSection/>
                <div
                    style={{
                        marginTop: 32,
                        backgroundColor: 'var(--mantine-color-gray-0)',
                        padding: 'var(--mantine-spacing-xl)',
                        borderRadius: 'var(--mantine-radius-md)',
                        boxShadow: 'var(--mantine-shadow-md)',
                        maxWidth: 600,
                        width: '100%', // full width on small screens
                        minHeight: 400,
                        boxSizing: 'border-box',
                    }}
                >
                    <Map
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                        center={{lat: 46.7820948, lng: 25.8335092}}
                        zoom={16}
                        markerPosition={{lat: 46.7820948, lng: 25.8335092}}
                        mapContainerStyle={{width: '100%', height: '100%'}}
                    />
                </div>
            </div>
        </Container>
    );
};

export default HomePage;