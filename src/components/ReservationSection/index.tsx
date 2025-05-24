'use client'; // marks this as Client Component

import {Button, Stack, Text, Title} from '@mantine/core';

const ReservationSection = () => {
    return (
        <Stack
            align="center"
            mt="xl"
            style={{
                backgroundColor: "var(--mantine-color-gray-0)",
                padding: "var(--mantine-spacing-xl)",
                borderRadius: "var(--mantine-radius-md)",
                boxShadow: "var(--mantine-shadow-md)",
                maxWidth: 600,
                textAlign: "center",
            }}
        >
            <Title order={2}>Bine ati venit la Casa Chindea!</Title>
            <Text size="lg" color="dimmed" style={{textAlign: 'justify'}}>
                Evadează din cotidian și bucură-te de o vacanță relaxantă în inima naturii! Casa noastră de vacanță,
                situată la doar 3.8 km de Lacu Roșu, te așteaptă cu 6 camere duble spațioase, fiecare cu pat
                matrimonial, baie proprie și terasă cu priveliște uimitoare. Acceptăm plata cu cardul de vacanță!
                Rezervă acum și creează amintiri de neuitat alături de cei dragi!

                Locație pitorescă: La poalele Hășmașului Mare
                Peisaje de vis: Privește frumusețea naturii de pe terasă
                Facilități moderne: Living spațios, bucătărie complet utilată, internet Wi-Fi gratuit, foișor închis cu
                grătar și sobă pentru ceaun.
            </Text>
            <Button
                size="md"
                radius="md"
                color="teal"
                onClick={() => {
                    alert("Reservation feature coming soon!");
                }}
            >
                Rezerva acum!
            </Button>
        </Stack>
    );
};

export default ReservationSection;