// src/App.js
import React, { useState, useEffect, useMemo } from 'react';
import MapDisplay from './components/MapDisplay';
import Sidebar from './components/Sidebar';
import PoiDisplayPanel from './components/PoiDisplayPanel';
import TripItineraryDisplay from './components/TripItineraryDisplay';
import AuthModal from './components/AuthModal';
import SavedTripsDisplay from './components/SavedTripsDisplay';
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

function App() {
  // ... (all existing state up to here) ...
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

  const [isLoadingOrigin, setIsLoadingOrigin] = useState(false);
  const [isLoadingDestination, setIsLoadingDestination] = useState(false);
  const [isLoadingNewLocation, setIsLoadingNewLocation] = useState(false);

  // New state for POI Panel minimization
  const [isPoiPanelMinimized, setIsPoiPanelMinimized] = useState(false);

  const togglePoiPanelMinimize = () => {
    setIsPoiPanelMinimized(prev => !prev);
  };

  // ... (rest of your functions: addWaypoint, removeWaypoint, etc.)
  const addWaypoint = (poi) => {
    if (!poi || (!poi.originalId && !poi.placeId)) {
        console.error("App.js: Waypoint is missing originalId or placeId", poi);
        return;
    }
    const idKey = poi.dataSource === 'google-places' ? 'placeId' : 'originalId';
    const poiId = poi[idKey];

    if (!selectedWaypoints.find(wp => wp[idKey] === poiId)) {
      setSelectedWaypoints(prevWaypoints => [...prevWaypoints, poi]);
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
  };
  
  const updateLocationPois = (locationId, data, isLoading = false, error = null, searchCategory = 'poi') => {
    setSearchedLocations(prevLocations =>
      prevLocations.map(loc =>
        loc.id === locationId ? { 
          ...loc, 
          pois: data?.pois || [], 
          isLoading, 
          error: error?.message || null, 
          category: searchCategory 
        } : loc
      )
    );
  };

  const handleFetchPoisGeneric = async (locationName, locationId, category = 'poi', searchQuery = '') => {
    if (!locationName || !locationName.trim() || !locationId) {
        const targetLocation = searchedLocations.find(loc => loc.id === locationId);
        if (targetLocation) {
            updateLocationPois(locationId, { pois: [] }, false, null, category);
        }
        return;
    }

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
      const data = await apiCallFunction(params);
      updateLocationPois(locationId, data, false, null, category);
    } catch (err) {
      updateLocationPois(locationId, null, false, err, category);
    }
  };
  
  const findOrCreateLocationEntry = (name, id, category = 'poi') => {
    const trimmedName = name.trim();
    setSearchedLocations(prev => {
      const existingEntryIndex = prev.findIndex(l => l.id === id);
      
      if (!trimmedName) { 
        if (id === 'origin' || id === 'destination') {
          const entryToUpdate = prev.find(l => l.id === id);
          if (entryToUpdate) { 
            return prev.map(l => l.id === id ? {...l, name: '', pois: [], isLoading: false, error: null} : l);
          }
        }
        return prev; 
      }

      if (existingEntryIndex > -1) { 
        const currentEntry = prev[existingEntryIndex];
        const poisToKeep = (currentEntry.name === trimmedName && currentEntry.category === category) ? currentEntry.pois : [];
        const updatedEntry = { 
          ...currentEntry, 
          name: trimmedName, 
          category, 
          pois: poisToKeep, 
          isLoading: (currentEntry.name === trimmedName && currentEntry.category === category) ? currentEntry.isLoading : false,
          error: (currentEntry.name === trimmedName && currentEntry.category === category) ? currentEntry.error : null,
        };
        const newLocations = [...prev];
        newLocations[existingEntryIndex] = updatedEntry;
        return newLocations;
      } else { 
        const newEntry = { id, name: trimmedName, pois: [], isLoading: false, error: null, category };
        if (id === 'origin') return [newEntry, ...prev.filter(l => l.id !== 'origin')];
        if (id === 'destination') {
            const originExists = prev.find(l => l.id === 'origin');
            if (originExists) return [originExists, newEntry, ...prev.filter(l => l.id !== 'origin' && l.id !== 'destination')];
            return [newEntry, ...prev.filter(l => l.id !== 'destination')];
        }
        return [...prev, newEntry];
      }
    });
    return { id, name: trimmedName, pois: [], isLoading: false, error: null, category };
  };

  const handleSetOrigin = (locationName) => {
    const newOriginName = locationName.trim();
    setOrigin(newOriginName); 
    const currentOriginEntry = searchedLocations.find(l => l.id === 'origin');
    const currentCategory = currentOriginEntry?.category || 'poi'; 
    
    if (!newOriginName) {
        setSearchedLocations(prev => prev.map(l => l.id === 'origin' ? {...l, name: '', pois: [], isLoading: false, error: null} : l));
        if (activeTabId === 'origin') { 
            const destTab = searchedLocations.find(l => l.id === 'destination' && l.name);
            const firstCustomTab = searchedLocations.find(l => l.id !== 'origin' && l.id !== 'destination' && l.name);
            setActiveTabId(destTab ? 'destination' : (firstCustomTab ? firstCustomTab.id : (searchedLocations.length > 1 ? searchedLocations.filter(l => l.id !== 'origin')[0].id : '')));
        }
    } else {
        findOrCreateLocationEntry(newOriginName, 'origin', currentCategory);
        setActiveTabId('origin'); 
    }
  };

  const handleSetDestination = (locationName) => {
    const newDestName = locationName.trim();
    setDestination(newDestName); 
    const currentDestEntry = searchedLocations.find(l => l.id === 'destination');
    const currentCategory = currentDestEntry?.category || 'poi'; 

    if (!newDestName) {
        setSearchedLocations(prev => prev.map(l => l.id === 'destination' ? {...l, name: '', pois: [], isLoading: false, error: null} : l));
        if (activeTabId === 'destination') {
            const originTab = searchedLocations.find(l => l.id === 'origin' && l.name);
            const firstCustomTab = searchedLocations.find(l => l.id !== 'origin' && l.id !== 'destination' && l.name);
            setActiveTabId(originTab ? 'origin' : (firstCustomTab ? firstCustomTab.id : (searchedLocations.length > 1 ? searchedLocations.filter(l => l.id !== 'destination')[0].id : '')));
        }
    } else {
        findOrCreateLocationEntry(newDestName, 'destination', currentCategory);
        setActiveTabId('destination'); 
    }
  };

  const handleFetchForOrigin = async (locationName, category, searchQuery) => {
    const trimmedName = locationName.trim(); 
    if (!trimmedName) return;

    setIsLoadingOrigin(true);
    setOrigin(trimmedName); 
    findOrCreateLocationEntry(trimmedName, 'origin', category); 
    setActiveTabId('origin');
    try {
      await handleFetchPoisGeneric(trimmedName, 'origin', category, searchQuery);
    } finally {
      setIsLoadingOrigin(false);
    }
  };

  const handleFetchForDestination = async (locationName, category, searchQuery) => {
    const trimmedName = locationName.trim();
    if (!trimmedName) return;

    setIsLoadingDestination(true);
    setDestination(trimmedName); 
    findOrCreateLocationEntry(trimmedName, 'destination', category); 
    setActiveTabId('destination');
    try {
      await handleFetchPoisGeneric(trimmedName, 'destination', category, searchQuery);
    } finally {
      setIsLoadingDestination(false);
    }
  };

  const handleAddNewSearchLocation = async (locationName, category = 'poi', searchQuery = '') => {
    const trimmedLocationName = locationName.trim();
    if (!trimmedLocationName) return;

    setIsLoadingNewLocation(true);

    const existingCustomLocation = searchedLocations.find(loc => 
        loc.name.toLowerCase() === trimmedLocationName.toLowerCase() && 
        loc.category === category && 
        !['origin', 'destination'].includes(loc.id) 
    );

    let targetId;
    if (existingCustomLocation) {
        targetId = existingCustomLocation.id;
    } else {
        targetId = `custom-${Date.now()}`;
        setSearchedLocations(prev => [
          ...prev,
          { id: targetId, name: trimmedLocationName, pois: [], isLoading: false, error: null, category: category }
        ]);
    }
    
    setActiveTabId(targetId);
    try {
      await handleFetchPoisGeneric(trimmedLocationName, targetId, category, searchQuery);
    } finally {
      setIsLoadingNewLocation(false);
    }
  };

  const removeSearchTab = (locationIdToRemove) => {
    setSearchedLocations(prevLocations => {
        const remainingLocations = prevLocations.filter(loc => loc.id !== locationIdToRemove);
        
        if (activeTabId === locationIdToRemove) {
            let newActiveTabId = '';
            const originTabExists = remainingLocations.some(l => l.id === 'origin' && l.name.trim());
            const destTabExists = remainingLocations.some(l => l.id === 'destination' && l.name.trim());

            if (originTabExists) newActiveTabId = 'origin';
            else if (destTabExists) newActiveTabId = 'destination';
            else if (remainingLocations.length > 0) newActiveTabId = remainingLocations[0].id;
            setActiveTabId(newActiveTabId);
        }
        return remainingLocations;
    });

    if (locationIdToRemove === 'origin') setOrigin('');
    if (locationIdToRemove === 'destination') setDestination('');
  };
  
  useEffect(() => {
    const activeTab = searchedLocations.find(loc => loc.id === activeTabId);
    const activeTabIsValid = activeTab && activeTab.name.trim();

    if (searchedLocations.length > 0) {
        if (!activeTabId || !activeTabIsValid) { 
            const originTab = searchedLocations.find(loc => loc.id === 'origin' && loc.name.trim());
            const destTab = searchedLocations.find(loc => loc.id === 'destination' && loc.name.trim());
            const firstValidCustomTab = searchedLocations.find(loc => 
                loc.id !== 'origin' && loc.id !== 'destination' && loc.name.trim()
            );
            const firstAnyValidTab = searchedLocations.find(loc => loc.name.trim());


            if (originTab) setActiveTabId('origin');
            else if (destTab) setActiveTabId('destination');
            else if (firstValidCustomTab) setActiveTabId(firstValidCustomTab.id);
            else if (firstAnyValidTab) setActiveTabId(firstAnyValidTab.id); 
            else if (searchedLocations.length > 0) setActiveTabId(searchedLocations[0].id); 
            else setActiveTabId(''); 
        }
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
            console.error("Failed to fetch saved trips:", err);
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
    setIsLoadingOrigin(false);
    setIsLoadingDestination(false);
    setIsLoadingNewLocation(false);
    setIsPoiPanelMinimized(false); // Reset panel state on logout
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
    } catch (error)
    {
      alert(`Failed to save trip: ${error.message}`);
    }
  };

  const loadSavedTrip = (trip) => {
    setOrigin(trip.origin);
    setDestination(trip.destination);
    setSelectedWaypoints(trip.waypoints.map(wp => ({
        ...wp, 
        placeId: wp.placeId || wp.originalId, 
        originalId: wp.originalId || wp.placeId
    })));

    const newSearchedLocations = [];
    if (trip.origin) {
        newSearchedLocations.push({id: 'origin', name: trip.origin, pois: [], isLoading: false, error: null, category: 'poi'});
    }
    if (trip.destination) {
        newSearchedLocations.push({id: 'destination', name: trip.destination, pois: [], isLoading: false, error: null, category: 'poi'});
    }
    setSearchedLocations(newSearchedLocations);
    
    setDirectionsResponse(null); 
    setIsSavedTripsModalOpen(false);
    setIsPoiPanelMinimized(false); // Ensure panel is open when loading a trip
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

  const isAPrimaryModalOpen = isTripModalOpen || isSavedTripsModalOpen || isAuthModalOpen;

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="absolute inset-0 z-0">
        <MapDisplay
          origin={origin}
          destination={destination}
          waypoints={selectedWaypoints}
          pois={poisForMap}
          directionsResponse={directionsResponse}
          setDirectionsResponse={setDirectionsResponse}
        />
      </div>

      <Sidebar
        origin={origin}
        onSetOrigin={handleSetOrigin}
        onFetchForOrigin={handleFetchForOrigin}
        destination={destination}
        onSetDestination={handleSetDestination}
        onFetchForDestination={handleFetchForDestination}
        onAddNewSearchLocation={handleAddNewSearchLocation}
        isLoadingOrigin={isLoadingOrigin}
        isLoadingDestination={isLoadingDestination}
        isLoadingNewLocation={isLoadingNewLocation}
      />

      {/* Conditionally render PoiDisplayPanel */}
      {searchedLocations.length > 0 && !isAPrimaryModalOpen && (
        <PoiDisplayPanel
          searchedLocations={searchedLocations}
          activeTabId={activeTabId}
          setActiveTabId={setActiveTabId}
          onRemoveSearchTab={removeSearchTab}
          onAddWaypoint={addWaypoint}
          // New props for minimization
          isMinimized={isPoiPanelMinimized}
          onToggleMinimize={togglePoiPanelMinimize}
        />
      )}

      <div className="fixed top-5 right-5 z-[1000] flex gap-3 items-center">
        <button onClick={() => setIsTripModalOpen(true)} className="btn-secondary !py-2 !px-4 text-sm">
          Current Trip ({selectedWaypoints.length})
        </button>
        {currentUser && (
            <button onClick={() => setIsSavedTripsModalOpen(true)} className="btn-secondary !py-2 !px-4 text-sm">
                Saved Trips ({savedTrips.length})
            </button>
        )}
        {!currentUser ? (
          <button
            onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
            className="btn-primary !py-2 !px-4 text-sm"
          >
            Login / Register
          </button>
        ) : (
          <button onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm hover:shadow-md"
          >
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
          origin={origin}
          destination={destination}
          waypoints={selectedWaypoints}
          directionsResponse={directionsResponse}
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