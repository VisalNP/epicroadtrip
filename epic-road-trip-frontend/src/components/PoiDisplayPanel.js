// src/components/PoiDisplayPanel.js
import React from 'react';
import { CATEGORY_OPTIONS } from '../constants/appConstants';

function PoiDisplayPanel({
  searchedLocations,
  activeTabId,
  setActiveTabId,
  onRemoveSearchTab,
  onAddWaypoint,
  isMinimized,       // New prop
  onToggleMinimize,  // New prop
}) {
  const activeLocationData = searchedLocations.find(loc => loc.id === activeTabId);
  const poisToDisplay = activeLocationData ? activeLocationData.pois : [];
  const isLoading = activeLocationData ? activeLocationData.isLoading : false;
  const error = activeLocationData ? activeLocationData.error : null;
  const currentTabName = activeLocationData ? activeLocationData.name : "";
  const currentTabCategoryDisplay = activeLocationData 
    ? CATEGORY_OPTIONS.find(opt => opt.value === activeLocationData.category)?.label || activeLocationData.category 
    : "";

  return (
    <div 
      className={`absolute top-5 left-[calc(theme('spacing.5')_+_380px_+_theme('spacing.4'))] 
                 z-10 max-h-[calc(100vh-40px)]
                 bg-slate-200 bg-opacity-30 backdrop-blur-md shadow-xl rounded-xl
                 flex flex-col transition-all duration-300 ease-in-out
                 ${isMinimized ? 'w-16 p-2 items-center' : 'w-[380px] p-6'}`}
    >
      <button
        onClick={onToggleMinimize}
        className={`btn-secondary !py-1 !px-2.5 !text-xs whitespace-nowrap mb-3 self-end ${isMinimized ? 'self-center' : 'self-end' }`}
        title={isMinimized ? "Expand Panel" : "Minimize Panel"}
      >
        {isMinimized ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
          </svg>
        )}
      </button>

      {!isMinimized && (
        <>
          {/* Tabs Section: fixed height, horizontal scroll if needed */}
          <div className="flex border-b border-brand-border mb-3 flex-shrink-0 -mx-1 px-1 overflow-x-auto">
            {searchedLocations.map(loc => (
              <button
                key={loc.id}
                className={`py-2.5 px-3.5 cursor-pointer border-b-2 text-sm whitespace-nowrap transition-colors duration-150
                            ${activeTabId === loc.id 
                                ? 'border-brand-blue text-brand-blue font-semibold' 
                                : 'border-transparent text-brand-text-secondary hover:text-brand-blue hover:border-gray-300'}`}
                onClick={() => setActiveTabId(loc.id)}
              >
                <span className="truncate max-w-[100px] inline-block align-middle">{loc.name}</span>
                {(loc.id !== 'origin' && loc.id !== 'destination') && (
                  <span onClick={(e) => { e.stopPropagation(); onRemoveSearchTab(loc.id); }}
                        className="ml-1.5 text-gray-400 hover:text-red-500 font-normal px-1 rounded hover:bg-red-100 transition-colors">
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* POI List / Messages Section: takes remaining space and scrolls its own content */}
          <div className="flex-grow flex flex-col min-h-0 overflow-y-auto">
            {isLoading && <p className="text-brand-text-secondary text-center mt-5 p-2.5 flex-shrink-0">Loading {currentTabCategoryDisplay} for {currentTabName}...</p>}
            {error && <p className="text-red-500 text-center mt-5 p-2.5 flex-shrink-0">Error: {error}</p>}

            {!isLoading && !error && poisToDisplay.length > 0 ? (
              <ul className="list-none p-0 m-0 overflow-y-auto flex-grow divide-y divide-brand-border">
                {poisToDisplay.map((poi) => (
                  <li key={poi.originalId || poi.placeId} className="py-3 px-1.5 hover:bg-gray-50 transition-colors group">
                    <div className="flex justify-between items-start">
                      <div className="flex-grow mr-2 overflow-hidden">
                        <strong className="text-brand-text text-sm block mb-0.5 truncate group-hover:text-brand-blue">{poi.name}</strong>
                        <p className="text-xs text-gray-500 m-0 leading-snug truncate">
                          {poi.addressString || 
                           (poi.address?.city || poi.address?.locality ? 
                              `${poi.address.streetAddress ? `${poi.address.streetAddress}, ` : ''}${poi.address.city || poi.address.locality}${poi.address.postalCode ? `, ${poi.address.postalCode}` : ''}`
                              : 'Address not available')}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 leading-snug line-clamp-2">{poi.shortDescription || poi.description || 'No description.'}</p>
                      </div>
                      {(poi.location && poi.location.coordinates) && (
                        <button
                          onClick={() => onAddWaypoint(poi)}
                          className="btn-primary !py-1 !px-2.5 !text-xs whitespace-nowrap flex-shrink-0"
                        >
                          Ajouter
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !isLoading && !error && activeLocationData && currentTabName.trim() &&
              <p className="text-brand-text-secondary text-center mt-5 p-2.5 flex-shrink-0">No {currentTabCategoryDisplay} found for {currentTabName}.</p>
            )}
            {!isLoading && !error && !activeLocationData && searchedLocations.length > 0 &&
              <p className="text-brand-text-secondary text-center mt-5 p-2.5 flex-shrink-0">Select a tab to see details.</p>
            }
            {!isLoading && !error && (!activeLocationData && searchedLocations.length === 0) &&
              <p className="text-brand-text-secondary text-center mt-5 p-2.5">Recherchez des lieux.</p> 
            }
          </div>
        </>
      )}
    </div>
  );
}

export default PoiDisplayPanel;