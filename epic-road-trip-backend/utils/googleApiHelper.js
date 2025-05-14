// epic-road-trip-backend/utils/googleApiHelper.js
const { Client, PlaceInputType } = require("@googlemaps/google-maps-services-js");

const client = new Client({});
const API_KEY = "AIzaSyCuh1vdowfxTSrTWb1rCPlwPilaUWt9Xes";

if (!API_KEY) {
  console.warn(
    "WARNING: GOOGLE_MAPS_SERVER_API_KEY is not set in .env. Backend calls to Google Places API will fail."
  );
}

/**
 * Searches for places using Google Places API Text Search.
 * @param {string} queryText The main search query (e.g., "restaurants in Paris", "Eiffel Tower").
 * @param {string} [locationBias] Optional location bias (e.g., "circle:RADIUS@LAT,LNG" or "rectangle:south,west|north,east").
 * @param {string} [placeType] Optional: A specific type to filter by (e.g., 'restaurant', 'lodging'). Note: TextSearch is more flexible with types in the query string.
 * @returns {Promise<Array>} Array of place results or empty array.
 */
async function findPlaces(queryText, locationBiasDetails, placeType) {
  if (!API_KEY) {
    console.error("Google Places API key is not configured for backend use.");
    return [];
  }
  try {
    const params = {
      key: API_KEY,
      query: queryText,
      fields: [ // Request a good set of fields
        "place_id",
        "name",
        "formatted_address",
        "geometry",
        "types",
        "rating",
        "user_ratings_total",
        "photos",
        "opening_hours",
        "price_level",
        "icon",
        "icon_background_color",
        "icon_mask_base_uri"
      ],
    };

    if (locationBiasDetails) {
      params.locationbias = locationBiasDetails;
    }
    
    // For Text Search, 'type' can be restrictive. Often better to include it in the queryText.
    // However, if a specific type is provided, we can try adding it.
    // if (placeType) {
    //   params.type = placeType.toLowerCase(); // Ensure lowercase for Google API type
    // }

    console.log("Google Places API - Text Search Params:", params);
    const response = await client.textSearch({ params });

    if (response.data.results) {
      return response.data.results.map((place) => ({
        placeId: place.place_id, // Google's unique ID for the place
        originalId: place.place_id, // Use place_id as originalId for consistency if needed
        dataSource: "google-places",
        name: place.name,
        addressString: place.formatted_address, // Use this for display
        address: { // Attempt to parse for consistency, might be null for some fields
            streetAddress: place.formatted_address, // Best guess for street
            locality: place.vicinity || place.formatted_address.split(',').slice(-3, -2)[0]?.trim(), // Heuristic
            city: place.vicinity || place.formatted_address.split(',').slice(-3, -2)[0]?.trim(), // Heuristic
            // postalCode: place.address_components?.find(c => c.types.includes('postal_code'))?.long_name, // More complex parsing
        },
        location: place.geometry?.location
          ? {
              type: "Point",
              coordinates: [
                place.geometry.location.lng,
                place.geometry.location.lat,
              ],
            }
          : null,
        types: place.types,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        // For photos, you need to construct the URL:
        // https://developers.google.com/maps/documentation/places/web-service/photos
        photos: place.photos?.map(p => ({
            photo_reference: p.photo_reference,
            height: p.height,
            width: p.width,
            html_attributions: p.html_attributions
        })),
        openingHours: place.opening_hours,
        priceLevel: place.price_level,
        icon: place.icon, // URL to an icon
        iconBackgroundColor: place.icon_background_color,
        iconMaskBaseUri: place.icon_mask_base_uri,
      }));
    }
    return [];
  } catch (e) {
    console.error(
      "Google Places API error:",
      e.response?.data?.error_message || e.message
    );
    if (e.response?.data?.status) {
      console.error("Google Places API status:", e.response.data.status);
    }
    return [];
  }
}

module.exports = { findPlaces };