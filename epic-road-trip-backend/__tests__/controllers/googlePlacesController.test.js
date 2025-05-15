// __tests__/controllers/googlePlacesController.test.js
const googlePlacesController = require('../../controllers/googlePlacesController');
const googleApiHelper = require('../../utils/googleApiHelper');

jest.mock('../../utils/googleApiHelper'); // This line is crucial and correct

describe('Google Places Controller', () => {
  let mockReq, mockRes;
  let consoleErrorSpy;

  // Helper function to create more detailed mock Google Place objects
  // This structure should align with what googleApiHelper.findPlaces would return
  const createMockGooglePlace = (id, name) => ({
    placeId: `gmp-${id}`,
    originalId: `gmp-${id}`, // For consistency if used as POI
    dataSource: "google-places",
    name: name || `Mock Google Place ${id}`,
    addressString: `123 Mock St, Mock City ${id}, MC 12345`,
    address: {
        streetAddress: `123 Mock St, Mock City ${id}, MC 12345`, // Often same as addressString for Google
        locality: `Mock City ${id}`, // Or from vicinity
        city: `Mock City ${id}`,     // Or from vicinity
        // postalCode, etc., if your controller or subsequent logic needs them
    },
    location: {
        type: "Point",
        coordinates: [parseFloat(`-122.0${id}`), parseFloat(`37.4${id}`)], // Example coordinates
    },
    types: ["mock_type", "establishment", "point_of_interest"],
    rating: Math.min(5, Math.max(0, (id % 5) + 0.5)), // Example rating 0.5 to 4.5
    userRatingsTotal: 50 + id * 10,
    photos: [{ photo_reference: `photoref-${id}`, height: 400, width: 600, html_attributions: ['Mock Photographer'] }],
    openingHours: { open_now: id % 2 === 0 }, // Example: even IDs are open
    priceLevel: (id % 4) + 1, // Example price level 1 to 4
    icon: `https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/lodging-71.png`, // Example icon
    iconBackgroundColor: '#FF9E67',
    iconMaskBaseUri: `https://maps.gstatic.com/mapfiles/place_api/icons/v2/hotel_pinlet`,
  });

  beforeEach(() => {
    mockReq = { query: {} };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    // Clear the mock's call history and any previously set implementations
    googleApiHelper.findPlaces.mockClear();
    // Reset to a default behavior if needed, or let each test set it.
    // e.g., googleApiHelper.findPlaces.mockResolvedValue([]); 
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // This helper function is used by multiple tests for different place types
  const testPlaceType = async (controllerMethod, expectedGoogleType) => {
    // Using the detailed mock data creator
    const mockPlacesData = [
        createMockGooglePlace(1, 'Awesome Hotel'), 
        createMockGooglePlace(2, 'Relaxing Lodge')
    ];
    googleApiHelper.findPlaces.mockResolvedValue(mockPlacesData); // Simulate successful API call
    mockReq.query = { latitude: '10', longitude: '20', radius: '500', page: '1', limit: '10' };

    await controllerMethod(mockReq, mockRes);

    expect(googleApiHelper.findPlaces).toHaveBeenCalledWith(
      expectedGoogleType,          // e.g., 'lodging', 'restaurant'
      `circle:500@10,20`           // locationBias string
    );
    expect(mockRes.json).toHaveBeenCalledWith({
      totalPages: 1,               // Math.ceil(mockPlacesData.length / limit)
      currentPage: 1,
      totalPois: mockPlacesData.length,
      pois: mockPlacesData,        // The controller passes this data through
    });
  };

  it('getHotelSuggestions should call findPlaces with "lodging"', async () => {
    await testPlaceType(googlePlacesController.getHotelSuggestions, 'lodging');
  });

  it('getRestaurantSuggestions should call findPlaces with "restaurant"', async () => {
    await testPlaceType(googlePlacesController.getRestaurantSuggestions, 'restaurant');
  });

  it('getBarSuggestions should call findPlaces with "bar"', async () => {
    await testPlaceType(googlePlacesController.getBarSuggestions, 'bar');
  });

  it('should construct query with search term if provided', async () => {
    // For this test, the content of the resolved array doesn't matter much,
    // only that findPlaces is called correctly.
    googleApiHelper.findPlaces.mockResolvedValue([]); 
    mockReq.query = { latitude: '10', longitude: '20', radius: '500', search: 'fancy', page: '1', limit: '10' };

    await googlePlacesController.getHotelSuggestions(mockReq, mockRes);

    expect(googleApiHelper.findPlaces).toHaveBeenCalledWith(
      'fancy lodging',        // Search term combined with type
      'circle:500@10,20'
    );
  });

  it('should construct query with location text if lat/lng/radius not provided', async () => {
    googleApiHelper.findPlaces.mockResolvedValue([]);
    mockReq.query = { location: 'Paris', search: 'cheap', page: '1', limit: '10' };

    await googlePlacesController.getRestaurantSuggestions(mockReq, mockRes);

    expect(googleApiHelper.findPlaces).toHaveBeenCalledWith(
      'cheap restaurant in Paris', // Search, type, and location text
      null                         // No locationBias when using text location in query
    );
  });
  
  it('should construct query with just search and type if only search is provided', async () => {
    googleApiHelper.findPlaces.mockResolvedValue([]);
    mockReq.query = { search: 'dive', page: '1', limit: '10' };

    await googlePlacesController.getBarSuggestions(mockReq, mockRes);

    expect(googleApiHelper.findPlaces).toHaveBeenCalledWith(
      'dive bar', // Search and type
      null        // No locationBias
    );
  });

  it('should return 400 if no location or search term provided', async () => {
    mockReq.query = { page: '1', limit: '10' }; // Missing essential location/search
    await googlePlacesController.getHotelSuggestions(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Please provide a location (text or lat/lng+radius) or a search term." });
    expect(googleApiHelper.findPlaces).not.toHaveBeenCalled(); // Crucially, findPlaces shouldn't be called
  });

  it('should handle pagination correctly', async () => {
    // Using the detailed mock data creator for a larger set
    const lotsOfPlaces = Array(25).fill(null).map((_, i) => createMockGooglePlace(i + 1, `Paginated Place ${i + 1}`));
    googleApiHelper.findPlaces.mockResolvedValue(lotsOfPlaces);
    mockReq.query = { location: 'Somewhere', page: '2', limit: '10' };

    await googlePlacesController.getHotelSuggestions(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({
      totalPages: 3, // Math.ceil(25 / 10)
      currentPage: 2,
      totalPois: 25,
      pois: lotsOfPlaces.slice(10, 20), // The second page of 10 items
    });
  });

  it('should handle zero results from findPlaces', async () => {
    googleApiHelper.findPlaces.mockResolvedValue([]); // findPlaces returns an empty array
    mockReq.query = { location: 'Nowhere', page: '1', limit: '10' };

    await googlePlacesController.getHotelSuggestions(mockReq, mockRes);
    expect(mockRes.json).toHaveBeenCalledWith({
      totalPages: 0,
      currentPage: 1,
      totalPois: 0,
      pois: [],
    });
  });

  it('should handle errors from findPlaces', async () => {
    const error = new Error('Simulated Google API Error');
    googleApiHelper.findPlaces.mockRejectedValue(error); // Simulate findPlaces throwing an error
    mockReq.query = { location: 'Errorville' };

    await googlePlacesController.getHotelSuggestions(mockReq, mockRes); // Test for 'lodging' type

    expect(mockRes.status).toHaveBeenCalledWith(500);
    // The message includes the googlePlaceType, which is 'lodging' for getHotelSuggestions
    expect(mockRes.json).toHaveBeenCalledWith({
      message: `Error fetching lodging from Google Places.`, 
      error: error.message,
    });
  });
});