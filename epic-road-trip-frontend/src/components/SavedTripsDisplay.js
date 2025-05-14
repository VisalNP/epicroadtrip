// src/components/SavedTripsDisplay.js
import React from 'react';
// import { X, Trash2, Eye } from 'react-feather';

function SavedTripsDisplay({ savedTrips, onLoadTrip, onDeleteTrip, onClose }) {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-end z-1001 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-200 bg-opacity-30 backdrop-blur-md card w-full max-w-sm max-h-[80vh] flex flex-col p-0" // p-0 because header/footer will have padding
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 pb-4 border-b border-brand-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-brand-text">Your Saved Trips</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            {/* <X size={22} /> */} ×
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-5">
          {savedTrips.length === 0 ? (
            <p className="text-center text-brand-text-secondary py-10">You have no saved trips yet.</p>
          ) : (
            <ul className="list-none p-0 m-0 divide-y divide-brand-border">
              {savedTrips.map((trip) => (
                <li key={trip._id} className="py-3.5 flex justify-between items-center group">
                  <div>
                    <span 
                      className="font-medium text-brand-text group-hover:text-brand-blue cursor-pointer block" 
                      onClick={() => onLoadTrip(trip)}
                    >
                      {trip.name || `Trip to ${trip.destination}`}
                    </span>
                    <small className="block text-xs text-brand-text-secondary mt-0.5">
                      From: {trip.origin} To: {trip.destination} ({trip.waypoints?.length || 0} stops)
                    </small>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                      onClick={() => onLoadTrip(trip)}
                      className="text-brand-blue hover:text-brand-blue-dark p-1 rounded hover:bg-brand-blue-light transition-colors"
                      title="Load trip"
                    >
                       {/* <Eye size={18} /> */} Load
                    </button>
                    <button 
                      onClick={() => onDeleteTrip(trip._id)} 
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 transition-colors"
                      title="Delete trip"
                    >
                      {/* <Trash2 size={18} /> */} Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
         <div className="p-5 pt-4 border-t border-brand-border flex-shrink-0">
            <button 
                onClick={onClose} 
                className="btn-secondary w-full !border-gray-300 !text-gray-700 hover:!bg-gray-100" // More neutral close
            >
                Close
            </button>
         </div>
      </div>
    </div>
  );
}
export default SavedTripsDisplay;