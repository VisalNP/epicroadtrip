// src/App.js
import React, { useState, useEffect, useMemo } from 'react';
import MapDisplay from './components/MapDisplay';
import Sidebar from './components/Sidebar';
import TripItineraryDisplay from './components/TripItineraryDisplay';
import AuthModal from './components/AuthModal';
import SavedTripsDisplay from './components/SavedTripsDisplay';
import './App.css';
import {
  fetchDatatourismePois,
  fetchHotelSuggestionsFromApi,
  fetchRestaurantSuggestionsFromApi,
  fetchBarSuggestionsFromApi,
  fetchEnjoySuggestionsFromDb,
  fetchTravelSuggestionsFromDb,
  registerUser,
  loginUser,
  saveUserTrip,
  fetchUserSavedTrips,
  deleteUserSavedTrip
} from './services/api';

console.log("App.js - Imported Sidebar:", typeof Sidebar, Sidebar);
console.log("App.js - Imported MapDisplay:", typeof MapDisplay, MapDisplay);
console.log("App.js - Imported TripItineraryDisplay:", typeof TripItineraryDisplay, TripItineraryDisplay);
console.log("App.js - Imported AuthModal:", typeof AuthModal, AuthModal);
console.log("App.js - Imported SavedTripsDisplay:", typeof SavedTripsDisplay, SavedTripsDisplay);

function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [searchedLocations, setSearchedLocations] = useState([]);
  const [activeTabId, setActiveTabId] = useState('');

  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [selectedWaypoints, setSelectedWaypoints] = useState([]);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const [savedTrips, setSavedTrips] = useState([]);
  const [isSavedTripsModalOpen, setIsSavedTripsModalOpen] = useState(false);

  const addWaypoint = (poi) => {
    console.log("App.js: Attempting to add waypoint:", poi);
    if (!poi || (!poi.originalId && !poi.placeId)) {
        console.error("App.js: Waypoint is missing originalId or placeId", poi);
        return;
    }
    const idKey = poi.dataSource === 'google-places' ? 'placeId' : 'originalId';
    const poiId = poi[idKey];

    if (!selectedWaypoints.find(wp => wp[idKey] === poiId)) {
      setSelectedWaypoints(prevWaypoints => [...prevWaypoints, poi]);
      console.log("App.js: Waypoint added:", poi.name);
    } else {
      console.log("App.js: POI already in waypoints:", poi.name);
    }
  };

  const removeWaypoint = (poiIdOrPlaceId) => {
    setSelectedWaypoints(prevWaypoints => prevWaypoints.filter(wp => {
      const idKey = wp.dataSource === 'google-places' ? 'placeId' : 'originalId';
      return wp[idKey] !== poiIdOrPlaceId;
    }));
  };

  const reorderWaypoints = (newOrder) => {
    setSelectedWaypoints(newOrder);
  };

  const calculateRouteWithWaypoints = () => {
    if (!origin || !destination) {
      alert("Please set an origin and destination first.");
      return;
    }
    setDirectionsResponse(null);
    setIsTripModalOpen(false);
    console.log("App.js: Calculating route with origin, destination, and waypoints:", origin, destination, selectedWaypoints);
  };

  const updateLocationPois = (locationId, data, isLoading = false, error = null, searchCategory = 'poi') => {
    console.log(`App.js: updateLocationPois - ID: ${locationId}, Category: ${searchCategory}, Data received:`, JSON.parse(JSON.stringify(data || {})));
    setSearchedLocations(prevLocations =>
      prevLocations.map(loc =>
        loc.id === locationId ? { ...loc, name: loc.name, pois: data?.pois || [], isLoading, error: error?.message || null, category: searchCategory } : loc
      )
    );
  };

  const handleFetchPoisGeneric = async (locationName, locationId, category = 'poi', searchQuery = '') => {
    if (!locationName || !locationName.trim() || !locationId) {
        console.log("App.js: handleFetchPoisGeneric - Bailing: No locationName or locationId provided for fetch.");
        const targetLocation = searchedLocations.find(loc => loc.id === locationId);
        if (targetLocation) {
            updateLocationPois(locationId, { pois: [] }, false, null, category);
        }
        return;
    }
    console.log(`App.js: handleFetchPoisGeneric - Fetching for: "${locationName}", ID: ${locationId}, Category: ${category}, SearchQuery: "${searchQuery}"`);

    setSearchedLocations(prev => prev.map(loc => loc.id === locationId ? {...loc, isLoading: true, error: null, pois: [], category: category} : loc));

    let apiCallFunction;
    const params = { limit: 20 };

    if (searchQuery.trim()) {
        params.search = searchQuery.trim();
    }

    switch (category.toLowerCase()) {
      case 'hotels':
        params.location = locationName;
        apiCallFunction = fetchHotelSuggestionsFromApi;
        break;
      case 'restaurants':
        params.location = locationName;
        apiCallFunction = fetchRestaurantSuggestionsFromApi;
        break;
      case 'bars':
        params.location = locationName;
        apiCallFunction = fetchBarSuggestionsFromApi;
        break;
      case 'events':
        params.locality = locationName;
        apiCallFunction = fetchEnjoySuggestionsFromDb;
        break;
      case 'transport':
        params.locality = locationName;
        apiCallFunction = fetchTravelSuggestionsFromDb;
        break;
      case 'poi':
      default:
        params.locality = locationName;
        apiCallFunction = fetchDatatourismePois;
        break;
    }

    try {
      console.log(`App.js: Calling API for ${category} with params:`, params);
      const data = await apiCallFunction(params);
      console.log(`App.js: API response for ${category} at ${locationName}:`, JSON.parse(JSON.stringify(data || {})));
      updateLocationPois(locationId, data, false, null, category);
    } catch (err) {
      console.error(`App.js: Error fetching ${category} for ${locationName} (ID: ${locationId}):`, err);
      updateLocationPois(locationId, null, false, err, category);
    }
  };
  
  const findOrCreateLocationEntry = (name, id, category = 'poi') => {
    const trimmedName = name.trim();
    setSearchedLocations(prev => {
      const existingEntryIndex = prev.findIndex(l => l.id === id);
      if (!trimmedName) {
        if (id === 'origin' || id === 'destination') {
          return prev.filter(l => l.id !== id);
        }
        return prev;
      }
      if (existingEntryIndex > -1) {
        const currentEntry = prev[existingEntryIndex];
        const poisToKeep = (currentEntry.name === trimmedName && currentEntry.category === category) ? currentEntry.pois : [];
        const updatedEntry = { ...currentEntry, name: trimmedName, category, pois: poisToKeep, isLoading: false, error: null };
        const newLocations = [...prev];
        newLocations[existingEntryIndex] = updatedEntry;
        return newLocations;
      } else {
        const newEntry = { id, name: trimmedName, pois: [], isLoading: false, error: null, category };
        return [...prev, newEntry];
      }
    });
    return { id, name: trimmedName, pois: [], isLoading: false, error: null, category };
  };

  const handleSetOrigin = (locationName) => {
    const newOriginName = locationName.trim();
    setOrigin(newOriginName);
    if (!newOriginName) {
        findOrCreateLocationEntry('', 'origin');
        if (activeTabId === 'origin') {
            const destTab = searchedLocations.find(l => l.id === 'destination');
            const firstCustomTab = searchedLocations.find(l => l.id !== 'origin' && l.id !== 'destination');
            setActiveTabId(destTab ? 'destination' : (firstCustomTab ? firstCustomTab.id : ''));
        }
    } else {
        const currentCategory = searchedLocations.find(l => l.id === 'origin')?.category || 'poi';
        findOrCreateLocationEntry(newOriginName, 'origin', currentCategory);
        setActiveTabId('origin');
    }
  };

  const handleSetDestination = (locationName) => {
    const newDestName = locationName.trim();
    setDestination(newDestName);
    if (!newDestName) {
        findOrCreateLocationEntry('', 'destination');
        if (activeTabId === 'destination') {
            const originTab = searchedLocations.find(l => l.id === 'origin');
            const firstCustomTab = searchedLocations.find(l => l.id !== 'origin' && l.id !== 'destination');
            setActiveTabId(originTab ? 'origin' : (firstCustomTab ? firstCustomTab.id : ''));
        }
    } else {
        const currentCategory = searchedLocations.find(l => l.id === 'destination')?.category || 'poi';
        findOrCreateLocationEntry(newDestName, 'destination', currentCategory);
        setActiveTabId('destination');
    }
  };

  const handleFetchForOrigin = (locationName, category, searchQuery) => {
    const trimmedName = locationName.trim();
    if (!trimmedName) return;
    setOrigin(trimmedName); 
    findOrCreateLocationEntry(trimmedName, 'origin', category);
    handleFetchPoisGeneric(trimmedName, 'origin', category, searchQuery);
    setActiveTabId('origin');
  };

  const handleFetchForDestination = (locationName, category, searchQuery) => {
    const trimmedName = locationName.trim();
    if (!trimmedName) return;
    setDestination(trimmedName);
    findOrCreateLocationEntry(trimmedName, 'destination', category);
    handleFetchPoisGeneric(trimmedName, 'destination', category, searchQuery);
    setActiveTabId('destination');
  };

  const handleAddNewSearchLocation = (locationName, category = 'poi', searchQuery = '') => {
    const trimmedLocationName = locationName.trim();
    if (!trimmedLocationName) return;
    console.log(`App.js: handleAddNewSearchLocation - Name: "${trimmedLocationName}", Category: ${category}, Search: "${searchQuery}"`);

    const existingCustomLocation = searchedLocations.find(loc => loc.name.toLowerCase() === trimmedLocationName.toLowerCase() && loc.category === category && !['origin', 'destination'].includes(loc.id));
    if (existingCustomLocation) {
        setActiveTabId(existingCustomLocation.id);
        handleFetchPoisGeneric(trimmedLocationName, existingCustomLocation.id, category, searchQuery);
        return;
    }

    const newLocationId = `custom-${Date.now()}`;
    setSearchedLocations(prev => [
      ...prev,
      { id: newLocationId, name: trimmedLocationName, pois: [], isLoading: false, error: null, category: category }
    ]);
    handleFetchPoisGeneric(trimmedLocationName, newLocationId, category, searchQuery);
    setActiveTabId(newLocationId);
  };

  const removeSearchTab = (locationIdToRemove) => {
    let newActiveTabId = activeTabId;
    const remainingLocations = searchedLocations.filter(loc => loc.id !== locationIdToRemove);

    if (activeTabId === locationIdToRemove) {
      const originTabExists = remainingLocations.some(l => l.id === 'origin');
      const destTabExists = remainingLocations.some(l => l.id === 'destination');
      if (originTabExists) newActiveTabId = 'origin';
      else if (destTabExists) newActiveTabId = 'destination';
      else if (remainingLocations.length > 0) newActiveTabId = remainingLocations[0].id;
      else newActiveTabId = '';
    }
    setSearchedLocations(remainingLocations);
    setActiveTabId(newActiveTabId);

    if (locationIdToRemove === 'origin') setOrigin('');
    if (locationIdToRemove === 'destination') setDestination('');
  };
  
  useEffect(() => {
    const activeTabExists = searchedLocations.some(loc => loc.id === activeTabId);
    // Initialize activeTabId if searchedLocations is populated and activeTabId is empty
    if (searchedLocations.length > 0 && !activeTabId && !activeTabExists) {
        const originTab = searchedLocations.find(loc => loc.id === 'origin' && loc.name);
        const destTab = searchedLocations.find(loc => loc.id === 'destination' && loc.name);
        if (originTab) setActiveTabId('origin');
        else if (destTab) setActiveTabId('destination');
        else setActiveTabId(searchedLocations[0].id);
    } else if (searchedLocations.length > 0 && activeTabId && !activeTabExists) {
      // If activeTabId was set but tab removed, find a new one
      const originTab = searchedLocations.find(loc => loc.id === 'origin');
      const destTab = searchedLocations.find(loc => loc.id === 'destination');
      let newActiveId = '';
      if (originTab) newActiveId = 'origin';
      else if (destTab) newActiveId = 'destination';
      else newActiveId = searchedLocations[0].id;
      setActiveTabId(newActiveId);
    } else if (searchedLocations.length === 0 && activeTabId) {
      setActiveTabId('');
    }
  }, [searchedLocations, activeTabId]);


  const poisForMap = useMemo(() => {
    const collectedPois = new Map();
    searchedLocations.forEach(loc => {
      if (Array.isArray(loc.pois)) {
        loc.pois.forEach(poi => {
          const idKey = poi.dataSource === 'google-places' ? 'placeId' : 'originalId';
          if (poi.location && poi.location.coordinates && !collectedPois.has(poi[idKey])) {
            collectedPois.set(poi[idKey], poi);
          }
        });
      }
    });
    selectedWaypoints.forEach(wp => {
      const idKey = wp.dataSource === 'google-places' ? 'placeId' : 'originalId';
      if (wp.location && wp.location.coordinates && !collectedPois.has(wp[idKey])) {
        collectedPois.set(wp[idKey], wp);
      }
    });
    return Array.from(collectedPois.values());
  }, [searchedLocations, selectedWaypoints]);

  useEffect(() => {
    const storedUser = localStorage.getItem('epicRoadTripUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.userId && parsedUser.username) {
          setCurrentUser(parsedUser);
        } else {
          localStorage.removeItem('epicRoadTripUser');
        }
      } catch (e) {
        localStorage.removeItem('epicRoadTripUser');
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.userId) {
      fetchUserSavedTrips(currentUser.userId)
        .then(data => setSavedTrips(data.trips || []))
        .catch(err => {
            console.error("Failed to load saved trips:", err);
            setSavedTrips([]);
        });
    } else {
      setSavedTrips([]);
    }
  }, [currentUser]);

  const handleLogin = async (credentials) => {
    try {
      const userData = await loginUser(credentials);
      const userToStore = { userId: userData.userId, username: userData.username };
      setCurrentUser(userToStore);
      localStorage.setItem('epicRoadTripUser', JSON.stringify(userToStore));
      setIsAuthModalOpen(false);
    } catch (error) {
      alert(`Login failed: ${error.message}`);
    }
  };

  const handleRegister = async (credentials) => {
    try {
      await registerUser(credentials);
      alert('Registration successful! Please log in.');
      setAuthMode('login');
    } catch (error) {
      alert(`Registration failed: ${error.message}`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedWaypoints([]);
    setOrigin('');
    setDestination('');
    setSearchedLocations([]);
    setDirectionsResponse(null);
    setSavedTrips([]);
    setActiveTabId('');
    localStorage.removeItem('epicRoadTripUser');
  };

  const handleSaveCurrentTrip = async (tripName) => {
    if (!currentUser) {
      alert("Please log in to save your trip.");
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    if (!origin || !destination) {
      alert("Please set an origin and destination for your trip.");
      return;
    }
    const tripData = {
      name: tripName || `Trip from ${origin} to ${destination || '...'} on ${new Date().toLocaleDateString()}`,
      origin,
      destination,
      waypoints: selectedWaypoints.map(wp => ({
        originalId: wp.originalId || wp.placeId,
        name: wp.name,
        dataSource: wp.dataSource,
        location: wp.location 
      })),
    };
    try {
      const result = await saveUserTrip(tripData, currentUser.userId);
      setSavedTrips(prevTrips => [...prevTrips, result.trip]);
      alert("Trip saved!");
    } catch (error) {
      alert(`Failed to save trip: ${error.message}`);
    }
  };

  const loadSavedTrip = (trip) => {
    console.log("App.js: Loading saved trip:", trip);
    setOrigin(trip.origin);
    setDestination(trip.destination);
    setSelectedWaypoints(trip.waypoints.map(wp => ({...wp, placeId: wp.placeId || wp.originalId})));

    const newSearchedLocations = [];
    if (trip.origin) {
        newSearchedLocations.push({id: 'origin', name: trip.origin, pois: [], isLoading: false, error: null, category: 'poi'});
        // Optionally fetch POIs: handleFetchPoisGeneric(trip.origin, 'origin', 'poi');
    }
    if (trip.destination) {
        newSearchedLocations.push({id: 'destination', name: trip.destination, pois: [], isLoading: false, error: null, category: 'poi'});
        // Optionally fetch POIs: handleFetchPoisGeneric(trip.destination, 'destination', 'poi');
    }
    setSearchedLocations(newSearchedLocations);
    
    setActiveTabId(trip.origin ? 'origin' : (trip.destination ? 'destination' : ''));
    setDirectionsResponse(null);
    setIsSavedTripsModalOpen(false);
    // setTimeout(() => calculateRouteWithWaypoints(), 0); // Could also just rely on MapDisplay re-render
  };

  const handleDeleteSavedTrip = async (tripId) => {
    if (!currentUser || !window.confirm("Are you sure you want to delete this trip?")) return;
    try {
        await deleteUserSavedTrip(tripId, currentUser.userId);
        setSavedTrips(prev => prev.filter(trip => trip._id !== tripId));
    } catch (error) {
        alert(`Failed to delete trip: ${error.message}`);
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        origin={origin}
        onSetOrigin={handleSetOrigin}
        onFetchForOrigin={handleFetchForOrigin}
        destination={destination}
        onSetDestination={handleSetDestination}
        onFetchForDestination={handleFetchForDestination}
        searchedLocations={searchedLocations}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        onAddNewSearchLocation={handleAddNewSearchLocation}
        onRemoveSearchTab={removeSearchTab}
        onAddWaypoint={addWaypoint}
        setDirectionsResponse={setDirectionsResponse}
      />
      <div className="map-area">
        <MapDisplay
          origin={origin}
          destination={destination}
          waypoints={selectedWaypoints}
          pois={poisForMap}
          directionsResponse={directionsResponse}
          setDirectionsResponse={setDirectionsResponse}
        />
      </div>

      <div className="action-buttons-container">
        <button onClick={() => setIsTripModalOpen(true)} className="view-trip-button">
          Current Trip ({selectedWaypoints.length})
        </button>
        {currentUser && (
            <button onClick={() => setIsSavedTripsModalOpen(true)} className="view-trip-button saved-trips">
                Saved Trips ({savedTrips.length})
            </button>
        )}
        {!currentUser ? (
          <button
            onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
            className="view-trip-button auth-action"
          >
            Login / Register
          </button>
        ) : (
          <button onClick={handleLogout} className="view-trip-button logout">
            Logout ({currentUser.username})
          </button>
        )}
      </div>

      {isAuthModalOpen && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {isTripModalOpen && (
        <TripItineraryDisplay
          origin={origin} // Pass origin
          destination={destination} // Pass destination
          waypoints={selectedWaypoints}
          directionsResponse={directionsResponse} // Pass the current route data
          onRemoveWaypoint={removeWaypoint}
          onReorderWaypoints={reorderWaypoints}
          onCalculateRoute={calculateRouteWithWaypoints}
          onSaveTrip={handleSaveCurrentTrip}
          isUserLoggedIn={!!currentUser}
          onClose={() => setIsTripModalOpen(false)}
        />
      )}
      {isSavedTripsModalOpen && currentUser && (
        <SavedTripsDisplay
            savedTrips={savedTrips}
            onLoadTrip={loadSavedTrip}
            onDeleteTrip={handleDeleteSavedTrip}
            onClose={() => setIsSavedTripsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;