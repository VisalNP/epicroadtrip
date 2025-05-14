// epic-road-trip-backend/routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');
const googlePlacesController = require('../controllers/googlePlacesController');
const authController = require('../controllers/authController'); // New
const tripController = require('../controllers/tripController'); // New

// --- Auth Routes ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
// No /auth/logout route for this simple version as we are not using sessions/tokens

// --- Trip Routes (Protected by simpleAuthCheck middleware in controller) ---
router.post('/trips', tripController.saveTrip);
router.get('/trips', tripController.getSavedTrips);
router.delete('/trips/:tripId', tripController.deleteSavedTrip);


// --- POI Routes (Datatourisme DB) ---
router.get('/db/search', poiController.getPois);
router.get('/db/pois/:id', poiController.getPoiById);
router.get('/suggest/enjoy', poiController.getEnjoySuggestions);
router.get('/suggest/travel', poiController.getTravelSuggestions);

// --- Google Places API Routes ---
router.get('/google/hotels', googlePlacesController.getHotelSuggestions);
router.get('/google/restaurants', googlePlacesController.getRestaurantSuggestions);
router.get('/google/bars', googlePlacesController.getBarSuggestions);

module.exports = router;