// src/components/Sidebar.js
import React, { useState } from 'react';
import { CATEGORY_OPTIONS } from '../constants/appConstants'; // Import shared constants

function Sidebar({
  origin,
  onSetOrigin,
  onFetchForOrigin,
  destination,
  onSetDestination,
  onFetchForDestination,
  onAddNewSearchLocation,
  // Props for individual button loading states, managed by parent
  isLoadingOrigin,
  isLoadingDestination,
  isLoadingNewLocation,
}) {
  const [newLocationSearch, setNewLocationSearch] = useState('');
  // selectedCategoryState and searchKeyword are now used for all searches originating from this sidebar
  const [selectedCategoryState, setSelectedCategoryState] = useState(CATEGORY_OPTIONS[0].value);
  const [searchKeyword, setSearchKeyword] = useState('');

  const handleOriginInputChange = (e) => onSetOrigin(e.target.value);
  const handleDestinationInputChange = (e) => onSetDestination(e.target.value);

  const handleOriginSearchClick = () => {
    if (origin.trim()) {
      // Pass current category and keyword for origin search
      onFetchForOrigin(origin, selectedCategoryState, searchKeyword);
    }
  };

  const handleDestinationSearchClick = () => {
    if (destination.trim()) {
      // Pass current category and keyword for destination search
      onFetchForDestination(destination, selectedCategoryState, searchKeyword);
    }
  };

  const handleNewLocationSearchChange = (e) => setNewLocationSearch(e.target.value);
  const handleSearchKeywordChange = (e) => setSearchKeyword(e.target.value);

  const handleAddNewLocationTab = () => {
    if (newLocationSearch.trim()) {
      onAddNewSearchLocation(newLocationSearch, selectedCategoryState, searchKeyword);
      setNewLocationSearch(''); // Clear input after search
    }
  };
  
  const commonInputStyles = "input-field"; // Define your input-field class in global CSS
  const commonButtonStyles = "btn-primary w-full text-sm"; // Define btn-primary in global CSS

  return (
    <div 
      className="absolute top-5 left-5 z-10 w-[380px] max-h-[calc(100vh-40px)]
                 bg-slate-200 bg-opacity-30 backdrop-blur-md p-6 shadow-xl rounded-xl
                 overflow-y-auto flex flex-col" // Outer container scrolls if its direct children overflow
    >
      <div className="flex flex-col gap-5 flex-shrink-0"> {/* Input sections wrapper */}
        {/* Origin */}
        <div>
          <label htmlFor="origin-loc" className="block text-sm font-medium text-brand-text-secondary mb-1">Origine</label>
          <input
            id="origin-loc"
            type="text"
            placeholder="Enter origin location"
            value={origin}
            onChange={handleOriginInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleOriginSearchClick()}
            className={commonInputStyles}
          />
          <button 
            onClick={handleOriginSearchClick} 
            disabled={!origin.trim() || isLoadingOrigin} 
            className={`${commonButtonStyles} mt-2`}
          >
            {isLoadingOrigin ? 'Searching...' : 'Recherche de Points d\'Intérêt'}
          </button>
        </div>

        {/* Destination */}
        <div>
          <label htmlFor="dest-loc" className="block text-sm font-medium text-brand-text-secondary mb-1">Destination</label>
          <input
            id="dest-loc"
            type="text"
            placeholder="Enter destination location"
            value={destination}
            onChange={handleDestinationInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleDestinationSearchClick()}
            className={commonInputStyles}
          />
          <button 
            onClick={handleDestinationSearchClick} 
            disabled={!destination.trim() || isLoadingDestination} 
            className={`${commonButtonStyles} mt-2`}
          >
            {isLoadingDestination ? 'Searching...' : 'Recherche de Points d\'Intérêt'}
          </button>
        </div>

        <hr className="border-brand-border my-1" />

        {/* New Location Search Section */}
        <div className="flex flex-col gap-3 p-4 bg-brand-blue-light rounded-lg">
            <h3 className="text-md font-semibold text-brand-blue-dark mb-1">Recherche Avancée</h3>  
            <div>
              <label htmlFor="category-select" className="block text-sm font-medium text-brand-text-secondary mb-1">Categorie</label>
              <select
                  id="category-select"
                  value={selectedCategoryState}
                  onChange={(e) => setSelectedCategoryState(e.target.value)}
                  className={`${commonInputStyles} py-2.5`} // Ensure padding matches input
              >
                  {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="keyword-search" className="block text-sm font-medium text-brand-text-secondary mb-1">Mot-clé (Optionnel)</label>
              <input
                  id="keyword-search"
                  type="text"
                  placeholder={`"Parc", "Musée", "Luxe"`}
                  value={searchKeyword}
                  onChange={handleSearchKeywordChange}
                  className={commonInputStyles}
              />
            </div>
            <div>
              <label htmlFor="new-loc-search" className="block text-sm font-medium text-brand-text-secondary mb-1">Location</label>
              <input
                  id="new-loc-search"
                  type="text"
                  placeholder="Recherchez une nouvelle localisation"
                  value={newLocationSearch}
                  onChange={handleNewLocationSearchChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNewLocationTab()}
                  className={commonInputStyles}
              />
            </div>
            <button 
                onClick={handleAddNewLocationTab} 
                disabled={!newLocationSearch.trim() || isLoadingNewLocation} 
                className={`${commonButtonStyles} bg-brand-blue-medium hover:bg-brand-blue-dark`}
            >
                {isLoadingNewLocation ? 'Searching...' : 'Recherche'}
            </button>
        </div>
      </div>
      {/* Tabs and POI list are no longer here */}
    </div>
  );
}

export default Sidebar;