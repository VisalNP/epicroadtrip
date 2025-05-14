// src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

const makeRequest = async (endpoint, params = {}, serviceName = "API Call", method = 'GET', body = null, authUserId = null) => {
  const queryParams = new URLSearchParams(params);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const url = `${API_BASE_URL}${endpoint}${queryString}`;
  console.log(`Fetching ${serviceName}: ${method} ${url}`);

  const headers = {
    'Content-Type': 'application/json', // Assume JSON for POST/PUT/DELETE bodies
  };
  if (authUserId) {
    headers['x-user-id'] = authUserId; // Simple header-based auth
  }

  const options = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }


  try {
    const response = await fetch(url, options);
    const responseData = await response.json().catch(() => ({ message: `Response not JSON or empty for ${response.status}` }));

    if (!response.ok) {
      throw new Error(`${serviceName} request failed with status ${response.status}: ${responseData.message || response.statusText}`);
    }
    return responseData;
  } catch (error) {
    console.error(`Error in ${serviceName} request to ${url}:`, error);
    throw error;
  }
};

// --- For Your Datatourisme Database POIs ---
export const fetchDatatourismePois = async (params = {}) => {
  return makeRequest('/db/search', params, 'Datatourisme POIs');
};

export const fetchDatatourismePoiById = async (originalId) => {
  const encodedId = encodeURIComponent(originalId);
  return makeRequest(`/db/pois/${encodedId}`, {}, `Datatourisme POI by ID: ${originalId}`);
};

// --- For Google Places API Data ---
export const fetchHotelSuggestionsFromApi = async (params = {}) => {
  return makeRequest('/google/hotels', params, 'Google Hotel Suggestions');
};

export const fetchRestaurantSuggestionsFromApi = async (params = {}) => {
  return makeRequest('/google/restaurants', params, 'Google Restaurant Suggestions');
};

export const fetchBarSuggestionsFromApi = async (params = {}) => {
  return makeRequest('/google/bars', params, 'Google Bar Suggestions');
};

// --- Specific Suggestion Categories from your DB ---
export const fetchEnjoySuggestionsFromDb = async (params = {}) => {
  const queryParams = { ...params };
  queryParams.type = queryParams.type || 'CulturalSite,EntertainmentAndEvent,Activity,Event,SportingEvent,ParkAndGarden,Museum';
  return fetchDatatourismePois(queryParams);
};

export const fetchTravelSuggestionsFromDb = async (params = {}) => {
  const queryParams = { ...params };
  queryParams.type = queryParams.type || 'Transport,Parking,ElectricVehicleChargingPoint';
  return fetchDatatourismePois(queryParams);
};

// This was the old generic function. App.js now calls more specific ones.
export const fetchPoisFromApi = async (params = {}) => {
    console.warn("Generic fetchPoisFromApi called. Defaulting to DatatourismePois. Params:", params);
    return fetchDatatourismePois(params);
};


// --- Auth API Functions ---
export const registerUser = async (credentials) => { // { username, password }
  return makeRequest('/auth/register', {}, 'User Registration', 'POST', credentials);
};

export const loginUser = async (credentials) => { // { username, password }
  return makeRequest('/auth/login', {}, 'User Login', 'POST', credentials);
};

// --- Saved Trip API Functions ---
export const saveUserTrip = async (tripData, userId) => {
// tripData = { name (optional), origin, destination, waypoints }
  return makeRequest('/trips', {}, 'Save User Trip', 'POST', tripData, userId);
};

export const fetchUserSavedTrips = async (userId) => {
  return makeRequest('/trips', {}, 'Fetch User Saved Trips', 'GET', null, userId);
};

export const deleteUserSavedTrip = async (tripId, userId) => {
  return makeRequest(`/trips/${tripId}`, {}, `Delete User Saved Trip ${tripId}`, 'DELETE', null, userId);
};