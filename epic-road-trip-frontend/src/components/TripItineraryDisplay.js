// src/components/TripItineraryDisplay.js
import React, { useState, useEffect } from 'react'; // Added useEffect
import styles from './TripItineraryDisplay.module.css';

function TripItineraryDisplay({
  origin, // New prop
  destination, // New prop
  waypoints,
  directionsResponse, // New prop
  onRemoveWaypoint,
  onReorderWaypoints,
  onCalculateRoute,
  onSaveTrip,
  isUserLoggedIn,
  onClose
}) {
  const [tripName, setTripName] = useState('');
  const [tripDetails, setTripDetails] = useState({ distance: '', duration: '' });

  useEffect(() => {
    if (directionsResponse && directionsResponse.routes && directionsResponse.routes.length > 0) {
      const route = directionsResponse.routes[0]; // Use the primary route
      let totalDistance = 0;
      let totalDuration = 0;

      if (route.legs) {
        route.legs.forEach(leg => {
          totalDistance += leg.distance.value; // distance in meters
          totalDuration += leg.duration.value; // duration in seconds
        });

        setTripDetails({
          distance: (totalDistance / 1000).toFixed(1) + ' km', // Convert meters to km
          duration: formatDuration(totalDuration) // Format seconds into readable time
        });
      }
    } else {
      setTripDetails({ distance: '', duration: '' }); // Clear if no route
    }
  }, [directionsResponse]);

  const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    let durationString = '';
    if (hours > 0) {
      durationString += `${hours} hr `;
    }
    if (minutes > 0 || hours === 0) { // Show minutes if > 0 or if hours is 0
      durationString += `${minutes} min`;
    }
    return durationString.trim() || 'N/A';
  };


  const handleSave = () => {
    const defaultTripName = (origin && destination)
        ? `Trip from ${origin} to ${destination}`
        : `My Custom Trip ${new Date().toLocaleDateString()}`;
    onSaveTrip(tripName || defaultTripName);
    // setTripName(''); // Optionally clear name after saving, or keep it
  };

  const hasTripData = origin || destination || waypoints.length > 0;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Your Current Trip</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <div className={styles.listContainer}>
          {!hasTripData && (
            <p className={styles.emptyMessage}>
              Start by setting an origin, destination, or adding stops from the sidebar!
            </p>
          )}

          {origin && (
            <div className={styles.tripDetailItem}>
              <strong>Origin:</strong> {origin}
            </div>
          )}

          {waypoints.length > 0 && (
            <>
              <h4 className={styles.stopsHeader}>Stops:</h4>
              <ul className={styles.waypointList} style={{borderTop: '1px solid #383838', paddingTop: '10px'}}>
                  {waypoints.map((poi, index) => (
                  <li key={poi.originalId || poi.placeId} className={styles.waypointItem}>
                      <span className={styles.waypointName}>{index + 1}. {poi.name}</span>
                      <button onClick={() => onRemoveWaypoint(poi.originalId || poi.placeId)} className={styles.removeButton}>Remove</button>
                  </li>
                  ))}
              </ul>
            </>
          )}

          {destination && (
            <div className={styles.tripDetailItem} style={{ marginTop: waypoints.length > 0 ? '15px' : '0' }}>
              <strong>Destination:</strong> {destination}
            </div>
          )}

          {directionsResponse && tripDetails.distance && tripDetails.duration && (
            <div className={styles.routeSummary}>
              <p><strong>Total Distance:</strong> {tripDetails.distance}</p>
              <p><strong>Estimated Duration:</strong> {tripDetails.duration}</p>
            </div>
          )}
        </div>

        {hasTripData && isUserLoggedIn && (
          <div className={styles.tripActions}>
            <input
              type="text"
              placeholder="Name this trip (optional)"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className={styles.tripNameInput}
            />
            <button
              onClick={handleSave}
              className={styles.actionButton}
              style={{ backgroundColor: '#007bff' }}
            >
              Save This Trip
            </button>
          </div>
        )}

        {hasTripData && (
            <button
            onClick={onCalculateRoute}
            // disabled={waypoints.length === 0 && (!origin || !destination)} // Calculate needs at least O & D
            disabled={!origin || !destination} // Simplified: only enable if O & D are set
            className={styles.calculateRouteButton} // Reuses existing style from module
            style={{marginTop: '10px'}} // Add some space if save section is present
            >
            {directionsResponse ? "Recalculate Route" : "Calculate Route"}
            </button>
        )}
      </div>
    </div>
  );
}

export default TripItineraryDisplay;