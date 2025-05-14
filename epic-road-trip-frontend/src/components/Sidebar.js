// src/components/Sidebar.js
import React, { useState } from 'react';

const CATEGORY_OPTIONS = [
  { value: 'poi', label: 'Points of Interest (DB)' },
  { value: 'hotels', label: 'Hotels (Google)' },
  { value: 'restaurants', label: 'Restaurants (Google)' },
  { value: 'bars', label: 'Bars (Google)' },
  { value: 'events', label: 'Events (DB)' },
  { value: 'transport', label: 'Transport (DB)' },
];

function Sidebar({
  origin,
  onSetOrigin, // Renamed from setOriginAndFetch
  onFetchForOrigin, // New: To trigger fetch for origin
  destination,
  onSetDestination, // Renamed from setDestinationAndFetch
  onFetchForDestination, // New: To trigger fetch for destination
  searchedLocations,
  activeTabId,
  setActiveTabId,
  onAddNewSearchLocation,
  onRemoveSearchTab,
  onAddWaypoint,
  setDirectionsResponse  // This is for the main "Get Directions (Origin to Destination)" button
}) {
  const [newLocationSearch, setNewLocationSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_OPTIONS[0].value);
  const [searchKeyword, setSearchKeyword] = useState('');

  const handleOriginInputChange = (e) => {
    onSetOrigin(e.target.value); // Updates App.js 'origin' state string
  };

  const handleDestinationInputChange = (e) => {
    onSetDestination(e.target.value); // Updates App.js 'destination' state string
  };

  const handleOriginSearchClick = () => {
    if (origin.trim()) {
      // Use the current selectedCategory and searchKeyword from Sidebar's state
      onFetchForOrigin(origin, selectedCategory, searchKeyword);
    }
  };

  const handleDestinationSearchClick = () => {
    if (destination.trim()) {
      // Use the current selectedCategory and searchKeyword from Sidebar's state
      onFetchForDestination(destination, selectedCategory, searchKeyword);
    }
  };

  const handleNewLocationSearchChange = (e) => setNewLocationSearch(e.target.value);
  const handleSearchKeywordChange = (e) => setSearchKeyword(e.target.value);

  const handleAddNewLocationTab = () => {
    if (newLocationSearch.trim()) {
      onAddNewSearchLocation(newLocationSearch, selectedCategory, searchKeyword);
      setNewLocationSearch('');
      // Optionally clear searchKeyword too if desired: setSearchKeyword('');
    }
  };

  const handleGetDirections = () => {
    // This button calculates route between current origin and destination strings
    // It does not consider the selectedCategory or searchKeyword from the lower section
    const originEntry = searchedLocations.find(loc => loc.id === 'origin');
    const destinationEntry = searchedLocations.find(loc => loc.id === 'destination');

    // Check App.js 'origin' and 'destination' state directly for this button
    if (origin.trim() && destination.trim()) {
      setDirectionsResponse(null); // Signal MapDisplay to recalculate
    } else {
      alert("Please ensure both Origin and Destination are set in their respective input fields.");
    }
  };

  const activeLocationData = searchedLocations.find(loc => loc.id === activeTabId);
  const poisToDisplay = activeLocationData ? activeLocationData.pois : [];
  const isLoading = activeLocationData ? activeLocationData.isLoading : false;
  const error = activeLocationData ? activeLocationData.error : null;
  const currentTabName = activeLocationData ? activeLocationData.name : "";
  // Category for the current active tab is important for display messages
  const currentTabCategoryDisplay = activeLocationData ? CATEGORY_OPTIONS.find(opt => opt.value === activeLocationData.category)?.label || activeLocationData.category : "";


  return (
    <div className="sidebar">
      <div className="location-inputs">
        {/* Origin Input and Its Search Button */}
        <div>
          <input
            type="text"
            placeholder="Origin Location"
            value={origin}
            onChange={handleOriginInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleOriginSearchClick()}
          />
          <button onClick={handleOriginSearchClick} disabled={!origin.trim() || (isLoading && activeTabId === 'origin')}>
            {isLoading && activeTabId === 'origin' ? 'Searching Origin...' : 'Search POIs for Origin'}
          </button>
        </div>

        {/* Destination Input and Its Search Button */}
        <div>
          <input
            type="text"
            placeholder="Destination Location"
            value={destination}
            onChange={handleDestinationInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleDestinationSearchClick()}
          />
          <button onClick={handleDestinationSearchClick} disabled={!destination.trim() || (isLoading && activeTabId === 'destination')}>
            {isLoading && activeTabId === 'destination' ? 'Searching Dest...' : 'Search POIs for Destination'}
          </button>
        </div>

        <hr style={{borderColor: '#444', margin: '15px 0'}} />

        {/* Section for Searching in a New Tab / Category Search */}
        <div>
            <label htmlFor="category-select" style={{display: 'block', marginBottom: '5px', fontSize: '0.9em'}}>Search for:</label>
            <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#383838', color: '#e0e0e0', border: '1px solid #555', borderRadius: '6px'}}
            >
                {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <input
                type="text"
                placeholder={`Optional: Keyword for ${CATEGORY_OPTIONS.find(c=>c.value === selectedCategory)?.label || selectedCategory}...`}
                value={searchKeyword}
                onChange={handleSearchKeywordChange}
            />
            <input
                type="text"
                placeholder="Location for selected category..."
                value={newLocationSearch}
                onChange={handleNewLocationSearchChange}
                onKeyPress={(e) => e.key === 'Enter' && handleAddNewLocationTab()}
            />
            <button onClick={handleAddNewLocationTab} disabled={!newLocationSearch.trim() || isLoading}>
                Search in New Tab
            </button>
        </div>

        {/* Main "Get Directions" Button */}
        <button
          onClick={handleGetDirections}
          className="get-directions-main-btn"
          disabled={!origin.trim() || !destination.trim()}
        >
          Get Directions (Origin to Destination)
        </button>
      </div>

      <div className="poi-section">
        {searchedLocations.length > 0 && (
          <div className="tabs">
            {searchedLocations.map(loc => (
              <button
                key={loc.id}
                className={`tab-button ${activeTabId === loc.id ? 'active' : ''}`}
                onClick={() => setActiveTabId(loc.id)}
              >
                {loc.id === 'origin' ? 'Origin: ' : loc.id === 'destination' ? 'Destination: ' : `(${(CATEGORY_OPTIONS.find(opt => opt.value === loc.category)?.label.split(" ")[0] || loc.category)}) `}
                {loc.name}
                {(loc.id !== 'origin' && loc.id !== 'destination') && (
                  <span onClick={(e) => { e.stopPropagation(); onRemoveSearchTab(loc.id); }}
                        style={{ marginLeft: '8px', cursor: 'pointer', color: '#ff6b6b' }}>
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {isLoading && <p className="status-message">Loading {currentTabCategoryDisplay} for {currentTabName}...</p>}
        {error && <p className="status-message" style={{ color: '#ff6b6b' }}>Error: {error}</p>}

        {!isLoading && !error && poisToDisplay.length > 0 ? (
          <ul className="poi-list">
            {poisToDisplay.map((poi) => (
              <li key={poi.originalId || poi.placeId}>
                <div>
                  <strong>{poi.name}</strong>
                  {poi.addressString ? (
                     <p style={{ fontSize: '0.8em', color: '#888' }}>{poi.addressString}</p>
                  ): (poi.address?.city || poi.address?.locality) && (
                    <p style={{ fontSize: '0.8em', color: '#888' }}>
                      {poi.address.streetAddress && <>{poi.address.streetAddress}<br/></>}
                      {poi.address.city || poi.address.locality || "N/A City"}
                      {poi.address.postalCode && `, ${poi.address.postalCode}`}
                    </p>
                  )}
                  <p>{poi.shortDescription || poi.description || 'No description available.'}</p>
                </div>
                {(poi.location && poi.location.coordinates) && (
                  <button onClick={() => onAddWaypoint(poi)}>
                    Add to Trip
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          !isLoading && !error && activeLocationData && currentTabName.trim() &&
          <p className="status-message">No {currentTabCategoryDisplay} found for {currentTabName}.</p>
        )}
        {!isLoading && !error && (!activeLocationData || !currentTabName.trim()) &&
          <p className="status-message">Select or search a location to view items.</p>
        }
      </div>
    </div>
  );
}

export default Sidebar;