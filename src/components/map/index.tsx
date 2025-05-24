"use client"
import React from 'react';
import {GoogleMap, LoadScript, Marker} from "@react-google-maps/api";

type GoogleMapComponentProps = {
    apiKey: string;
    center: { lat: number; lng: number };
    zoom?: number;
    markerPosition?: { lat: number; lng: number };
    mapContainerStyle?: React.CSSProperties;
};

const Map: React.FC<GoogleMapComponentProps> = ({
                                                    apiKey,
                                                    center,
                                                    zoom = 10,
                                                    markerPosition,
                                                    mapContainerStyle = {width: '100%', height: '400px'},
                                                }) => {
    return (
        <LoadScript googleMapsApiKey={apiKey}>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={zoom}
            >
                {markerPosition && <Marker position={markerPosition}/>}
            </GoogleMap>
        </LoadScript>
    );
};

export default Map;