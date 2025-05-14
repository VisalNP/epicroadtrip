// src/components/SavedTripsDisplay.js
import React from 'react';
import styles from './TripItineraryDisplay.module.css'; // Can reuse some styles

function SavedTripsDisplay({ savedTrips, onLoadTrip, onDeleteTrip, onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Your Saved Trips</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <div className={styles.listContainer}>
          {savedTrips.length === 0 ? (
            <p className={styles.emptyMessage}>You have no saved trips yet.</p>
          ) : (
            <ul className={styles.waypointList}>
              {savedTrips.map((trip) => (
                <li key={trip._id} className={styles.waypointItem}>
                  <span className={styles.waypointName} style={{cursor: 'pointer'}} onClick={() => onLoadTrip(trip)}>
                    {trip.name || `Trip to ${trip.destination}`}
                    <small style={{display: 'block', color: '#888'}}>
                      From: {trip.origin} To: {trip.destination} ({trip.waypoints?.length || 0} stops)
                    </small>
                  </span>
                  <button onClick={() => onDeleteTrip(trip._id)} className={styles.removeButton}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
         <button onClick={onClose} className={styles.calculateRouteButton} style={{backgroundColor: '#6c757d'}}>
            Close
        </button>
      </div>
    </div>
  );
}
export default SavedTripsDisplay;