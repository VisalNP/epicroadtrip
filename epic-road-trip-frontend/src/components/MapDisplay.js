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
  pois,
  directionsResponse,
  setDirectionsResponse
}) {


  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: SCRIPT_LIBRARIES.filter(lib => lib !== 'routes'), 
                                                                 
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
                setCurrentCenter({ lat: newCenter.lat(), lng: newCenter.lng() });
            }
            if (newZoom) {
                setCurrentZoom(newZoom);
            }
            directionsJustRendered.current = false; 
        } else {
            const newCenter = map.getCenter();
            const newZoom = map.getZoom();
            if (newCenter) {
                setCurrentCenter({ lat: newCenter.lat(), lng: newCenter.lng() });
            }
            if (newZoom) {
                setCurrentZoom(newZoom);
            }
        }
    }
  };
  

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-700 text-red-400 text-lg p-4">
        Error loading map: {loadError.message}. Check console.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-700 text-gray-300 text-lg">
        Loading Map...
      </div>
    );
  }

  const googleMapWaypoints = waypoints && waypoints.length > 0
    ? waypoints.map(poi => {
        if (!poi.location || !poi.location.coordinates) {
            console.warn("MapDisplay: Waypoint missing location/coordinates, cannot be used in DirectionsService:", poi);
            return null;
        }
        return {
            location: {
                lat: poi.location.coordinates[1],
                lng: poi.location.coordinates[0]
            },
            stopover: true,
        };
    }).filter(wp => wp !== null)
    : [];

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={currentCenter}
      zoom={currentZoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onIdle={handleIdle}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, zoomControl: true }}
    >
      {pois && pois.map((poi) => {
        if (poi.location && poi.location.coordinates && poi.location.coordinates.length === 2) {
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
          <div className="p-1 text-gray-800"> 
            <h3 className="text-md font-semibold mb-1">{selectedPoi.name} ({selectedPoi.dataSource})</h3>
            <p className="text-xs mb-1">{selectedPoi.shortDescription || selectedPoi.description || 'No description'}</p>
            {selectedPoi.addressString && <p className="text-xs text-gray-600"><small>{selectedPoi.addressString}</small></p>}
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
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#007bff",
              strokeOpacity: 0.8,
              strokeWeight: 6
            }
          }}
        />
      )}
    </GoogleMap>
  );
}

export default React.memo(MapDisplay);