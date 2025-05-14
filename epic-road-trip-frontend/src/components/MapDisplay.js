// src/components/MapDisplay.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const initialMapProps = {
  center: { lat: 46.2276, lng: 2.2137 },
  zoom: 6
};

const SCRIPT_LIBRARIES = ['places', 'routes'];

function MapDisplay({
  origin,
  destination,
  waypoints,
  pois, // This is the poisForMap from App.js
  directionsResponse,
  setDirectionsResponse
}) {
  console.log("MapDisplay: Component RENDERED. Received pois prop:", JSON.parse(JSON.stringify(pois || [])));
  console.log("MapDisplay: Received origin:", origin, "destination:", destination, "waypoints:", waypoints?.length);


  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: SCRIPT_LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [currentCenter, setCurrentCenter] = useState(initialMapProps.center);
  const [currentZoom, setCurrentZoom] = useState(initialMapProps.zoom);
  const directionsJustRendered = useRef(false);

  const directionsCallback = useCallback((response, status) => {
    if (isLoaded && window.google && status === window.google.maps.DirectionsStatus.OK && response) {
      console.log("MapDisplay: DirectionsService callback OK:", response);
      setDirectionsResponse(response);
      directionsJustRendered.current = true;
    } else {
      console.error(`MapDisplay: Directions request failed. Status: ${status}`, response);
      setDirectionsResponse(null);
    }
  }, [isLoaded, setDirectionsResponse]);

  const onLoad = useCallback(function callback(mapInstance) {
    setMap(mapInstance);
    console.log('MapDisplay: Map Loaded:', mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(mapInstance) {
    setMap(null);
    console.log('MapDisplay: Map Unmounted');
  }, []);

  useEffect(() => {
    if (!origin || !destination) {
      if (directionsResponse !== null) {
        console.log("MapDisplay useEffect: Clearing directionsResponse (no origin/dest).");
        setDirectionsResponse(null);
      }
    }
  }, [origin, destination, directionsResponse, setDirectionsResponse]);

  const handleIdle = () => {
    if (map) {
        if (directionsJustRendered.current) {
            const newCenter = map.getCenter();
            const newZoom = map.getZoom();
            if (newCenter) {
                console.log("MapDisplay handleIdle (after directions): Setting center from map", { lat: newCenter.lat(), lng: newCenter.lng() });
                setCurrentCenter({ lat: newCenter.lat(), lng: newCenter.lng() });
            }
            if (newZoom) {
                console.log("MapDisplay handleIdle (after directions): Setting zoom from map", newZoom);
                setCurrentZoom(newZoom);
            }
            directionsJustRendered.current = false;
        } else {
            const newCenter = map.getCenter();
            const newZoom = map.getZoom();
            if (newCenter) {
                // console.log("MapDisplay handleIdle (user interaction): Setting center", { lat: newCenter.lat(), lng: newCenter.lng() });
                setCurrentCenter({ lat: newCenter.lat(), lng: newCenter.lng() });
            }
            if (newZoom) {
                // console.log("MapDisplay handleIdle (user interaction): Setting zoom", newZoom);
                setCurrentZoom(newZoom);
            }
        }
    }
  };

  if (loadError) {
    return <div>Error loading map: {loadError.message}. Check console.</div>;
  }
  if (!isLoaded) {
    return <div>Loading Map...</div>;
  }

  const googleMapWaypoints = waypoints && waypoints.length > 0
    ? waypoints.map(poi => {
        if (!poi.location || !poi.location.coordinates) {
            console.warn("MapDisplay: Waypoint missing location/coordinates, cannot be used in DirectionsService:", poi);
            return null; // Skip this waypoint if it doesn't have coordinates
        }
        return {
            location: {
                lat: poi.location.coordinates[1],
                lng: poi.location.coordinates[0]
            },
            stopover: true,
        };
    }).filter(wp => wp !== null) // Filter out any null waypoints
    : [];

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={currentCenter}
      zoom={currentZoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onIdle={handleIdle}
      options={{ streetViewControl: false, mapTypeControl: false }}
    >
      {pois && pois.map((poi) => {
        // console.log(`MapDisplay: Evaluating POI for marker - Name: ${poi.name}, DataSource: ${poi.dataSource}, HasLocation: ${!!poi.location}, HasCoords: ${!!poi.location?.coordinates}, Coords:`, poi.location?.coordinates);
        if (poi.location && poi.location.coordinates && poi.location.coordinates.length === 2) {
        //   console.log(`MapDisplay: Rendering marker for ${poi.name} (${poi.dataSource}) at [lng,lat]:`, poi.location.coordinates);
          return (
            <Marker
              key={`${poi.dataSource}-${poi.originalId || poi.placeId}`}
              position={{
                lat: poi.location.coordinates[1],
                lng: poi.location.coordinates[0]
              }}
              title={`${poi.name} (${poi.dataSource})`}
              onClick={() => setSelectedPoi(poi)}
            />
          );
        } else {
        //   console.warn(`MapDisplay: NOT rendering marker for ${poi.name} (${poi.dataSource}), location/coords issue.`);
          return null;
        }
      })}

      {selectedPoi && selectedPoi.location && selectedPoi.location.coordinates && (
        <InfoWindow
          position={{
            lat: selectedPoi.location.coordinates[1],
            lng: selectedPoi.location.coordinates[0]
          }}
          onCloseClick={() => setSelectedPoi(null)}
        >
          <div>
            <h3>{selectedPoi.name} ({selectedPoi.dataSource})</h3>
            <p>{selectedPoi.shortDescription || selectedPoi.description || 'No description'}</p>
            {selectedPoi.addressString && <p><small>{selectedPoi.addressString}</small></p>}
          </div>
        </InfoWindow>
      )}

      {isLoaded && origin && destination && (
        <DirectionsService
          key={`${origin}-${destination}-${googleMapWaypoints.length}-${Date.now()}`}
          options={{
            destination: destination,
            origin: origin,
            waypoints: googleMapWaypoints,
            optimizeWaypoints: true,
            travelMode: window.google.maps.TravelMode.DRIVING,
          }}
          callback={directionsCallback}
        />
      )}

      {directionsResponse && (
        <DirectionsRenderer
          options={{
            directions: directionsResponse,
            preserveViewport: true, 
          }}
        />
      )}
    </GoogleMap>
  );
}

export default React.memo(MapDisplay);