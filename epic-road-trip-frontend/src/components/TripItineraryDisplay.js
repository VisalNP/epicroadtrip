
import React, { useState, useEffect } from 'react';

function TripItineraryDisplay({
  origin,
  destination,
  waypoints,
  directionsResponse,
  onRemoveWaypoint,
  onCalculateRoute,
  onSaveTrip,
  isUserLoggedIn,
  onClose
}) {
  const [tripName, setTripName] = useState('');
  const [tripDetails, setTripDetails] = useState({ distance: '', duration: '' });

  useEffect(() => {
    if (directionsResponse && directionsResponse.routes && directionsResponse.routes.length > 0) {
      const route = directionsResponse.routes[0];
      let totalDistance = 0;
      let totalDuration = 0;
      if (route.legs) {
        route.legs.forEach(leg => {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value;
        });
        setTripDetails({
          distance: (totalDistance / 1000).toFixed(1) + ' km',
          duration: formatDuration(totalDuration)
        });
      }
    } else {
      setTripDetails({ distance: '', duration: '' });
    }
  }, [directionsResponse]);

  const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    let durationString = '';
    if (hours > 0) durationString += `${hours} hr `;
    if (minutes > 0 || hours === 0) durationString += `${minutes} min`;
    return durationString.trim() || 'N/A';
  };

  const handleSave = () => {
    const defaultTripName = (origin && destination)
        ? `Trip from ${origin} to ${destination}`
        : `My Custom Trip ${new Date().toLocaleDateString()}`;
    onSaveTrip(tripName || defaultTripName);
  };

  const hasTripData = origin || destination || waypoints.length > 0;

  return (
    <div 
      className="fixed inset-0  flex items-center justify-end z-1001 p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-slate-200 bg-opacity-30 backdrop-blur-md card w-[380px] max-h-[90vh] flex flex-col !rounded-r-none !rounded-l-xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 pb-4 border-b border-brand-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-brand-text">Votre voyage actuel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"> ×
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-5 space-y-4">
          {!hasTripData && (
            <p className="text-center text-brand-text-secondary py-10">
              Votre itinéraire est vide. Ajoutez des lieux depuis la barre latérale.
            </p>
          )}

          {origin && (
            <div className="pb-2 border-b border-brand-border">
              <strong className="text-sm text-brand-text-secondary block mb-0.5">Origine</strong>
              <p className="text-brand-text">{origin}</p>
            </div>
          )}

          {waypoints.length > 0 && (
            <div>
              <h4 className="text-sm text-brand-text-secondary font-medium mb-1.5">Arrêts :</h4>
              <ul className="list-none p-0 m-0 space-y-2">
                  {waypoints.map((poi, index) => (
                  <li key={poi.originalId || poi.placeId} className="py-2 px-3 bg-gray-50 rounded-md flex justify-between items-center text-sm">
                      <span className="text-brand-text truncate mr-2">{index + 1}. {poi.name}</span>
                      <button 
                        onClick={() => onRemoveWaypoint(poi.originalId || poi.placeId)} 
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 transition-colors"
                        title="Supprimer l'arrêt"
                      >
                        Supprimer
                      </button>
                  </li>
                  ))}
              </ul>
            </div>
          )}

          {destination && (
            <div className="pt-2 border-t border-brand-border">
              <strong className="text-sm text-brand-text-secondary block mb-0.5">Destination</strong>
              <p className="text-brand-text">{destination}</p>
            </div>
          )}

          {directionsResponse && tripDetails.distance && tripDetails.duration && (
            <div className="mt-3 pt-3 border-t border-dashed border-brand-border text-sm space-y-1">
              <p><strong className="text-brand-text-secondary">Distance totale :</strong> {tripDetails.distance}</p>
              <p><strong className="text-brand-text-secondary">Durée estimée :</strong> {tripDetails.duration}</p>
            </div>
          )}
        </div>

        <div className="p-5 pt-4 border-t border-brand-border flex-shrink-0 space-y-3">
          {hasTripData && isUserLoggedIn && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nommez ce voyage (optionnel)"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="input-field text-sm"
              />
              <button
                onClick={handleSave}
                className="btn-primary w-full !bg-green-500 hover:!bg-green-600"
              >
                Sauvegarder ce voyage
              </button>
            </div>
          )}

          {hasTripData && (
              <button
              onClick={onCalculateRoute}
              disabled={!origin || !destination}
              className="btn-primary w-full"
              >
              {directionsResponse ? "Recalculer l’itinéraire" : "Calculer l’itinéraire"}
              </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default TripItineraryDisplay;