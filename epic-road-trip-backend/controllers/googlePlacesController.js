// epic-road-trip-backend/controllers/googlePlacesController.js
const { findPlaces } = require('../utils/googleApiHelper');

async function getGooglePlacesByType(req, res, googlePlaceType) {
  const { location, search, latitude, longitude, radius, page = 1, limit = 20 } = req.query;

  let queryForGoogle;
  let locationBias = null;

  if (latitude && longitude && radius) {
    queryForGoogle = search ? `${search} ${googlePlaceType}` : googlePlaceType;
    locationBias = `circle:${parseInt(radius, 10)}@${parseFloat(latitude)},${parseFloat(longitude)}`;
  } else if (location) {
    queryForGoogle = search ? `${search} ${googlePlaceType} in ${location}` : `${googlePlaceType} in ${location}`;
  } else if (search) {
    queryForGoogle = `${search} ${googlePlaceType}`;
  }
  else {
    return res.status(400).json({ message: "Please provide a location (text or lat/lng+radius) or a search term." });
  }

  try {
    // The third argument to findPlaces in googleApiHelper was `placeType`, but it was commented out.
    // Sending `locationBias` as the second effective argument for it.
    const googleResults = await findPlaces(queryForGoogle, locationBias /*, googlePlaceType - if helper uses it */);

    const totalFromThisFetch = googleResults.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedResults = googleResults.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      totalPages: totalFromThisFetch > 0 ? Math.ceil(totalFromThisFetch / parseInt(limit)) : 0,
      currentPage: parseInt(page),
      totalPois: totalFromThisFetch,
      pois: paginatedResults,
    });
  } catch (error) {
    res.status(500).json({ message: `Error fetching ${googlePlaceType} from Google Places.`, error: error.message });
  }
}

exports.getHotelSuggestions = async (req, res) => {
  await getGooglePlacesByType(req, res, 'lodging');
};

exports.getRestaurantSuggestions = async (req, res) => {
  await getGooglePlacesByType(req, res, 'restaurant');
};

exports.getBarSuggestions = async (req, res) => {
  await getGooglePlacesByType(req, res, 'bar');
};