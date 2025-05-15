// __tests__/controllers/tripController.test.js
const tripController = require('../../controllers/tripController');
const User = require('../../models/userModel');
const mongoose = require('mongoose'); // The mocked version

jest.mock('../../models/userModel');

describe('Trip Controller', () => {
  let mockReq, mockRes, mockNext;
  const validUserId = 'testUser123';
  let consoleErrorSpy;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      headers: {},
      userId: validUserId,
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks(); 

    let tempIdCounter = 0;
    const generateMockTripId = () => `mockTripId_${Date.now()}_${tempIdCounter++}`;
    
    mongoose.Types.ObjectId.isValid.mockImplementation(id => {
        if (id === null || typeof id === 'undefined') return false;
        const idString = String(id);
        return /^[0-9a-fA-F]{24}$/.test(idString) || idString.startsWith('mockTripId') || idString.startsWith('mockObjectId');
    });
    // This mock should return a string because that's what .toString() would do.
    mongoose.Types.ObjectId.mockImplementation(() => ({ 
        toString: () => generateMockTripId(),
        equals: function(other) { return other && other.toString() === this.toString(); } 
    }));


    // User.findById mock in beforeEach
    // This is crucial: User.findById should return a NEW chainable object each time
    // The global mongoose mock's `createChainable` handles this if User is a MockModel
    // Let's re-ensure User.findById itself is mocked to return a new chain.
    User.findById.mockImplementation((userIdQuery) => {
        // This is a simplified version assuming the global mock already makes User.findById return a chain.
        // If User.findById itself is what you get from `mongoose.model('User', schema)`,
        // then its static methods like `findById` should already be returning new chains.
        // The issue might be if `User.findById` itself is not the mocked static method.

        // Let's be explicit:
        const mockUserInstanceForChain = { // A generic user instance for the chain to resolve with
            _id: userIdQuery, // Use the queried ID
            savedTrips: [],
            save: jest.fn().mockResolvedValueThis(), // Or mockResolvedValue(this instance)
        };

        const chain = {
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(), 
            exec: jest.fn().mockResolvedValue(userIdQuery === validUserId ? mockUserInstanceForChain : null), // Default exec
            then: function(onFulfilled, onRejected) { 
                return this.exec().then(onFulfilled, onRejected);
            },
            catch: function(onRejected) {
                return this.exec().catch(onRejected);
            }
        };
        return chain;
    });
    
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('simpleAuthCheck middleware', () => {
    const simpleAuthCheck = tripController.saveTrip[0];

    it('should call next() and set req.userId if x-user-id header is present', () => {
      mockReq.headers['x-user-id'] = 'user123';
      simpleAuthCheck(mockReq, mockRes, mockNext);
      expect(mockReq.userId).toBe('user123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 if x-user-id header is missing', () => {
      delete mockReq.headers['x-user-id'];
      delete mockReq.userId;
      simpleAuthCheck(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized: No user ID provided." });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('saveTrip', () => {
    const saveTripHandler = tripController.saveTrip[1];

    it('should save a trip successfully', async () => {
      mockReq.userId = validUserId;
      mockReq.body = { name: 'My Awesome Trip', origin: 'City A', destination: 'City B', waypoints: [] };
      
      const mockUserInstance = {
        _id: validUserId,
        savedTrips: [],
        save: jest.fn(), 
      };
      mockUserInstance.save.mockResolvedValue(mockUserInstance); 

      mockUserInstance.savedTrips.push = jest.fn(function(tripData) {
        // Create a mock ObjectId string for the new trip
        const newTripIdObject = new mongoose.Types.ObjectId(); // This calls our mock
        const newTrip = { ...tripData, _id: newTripIdObject }; // Store the object-like ID
        this[this.length] = newTrip;
        return newTrip;
      });

      // For saveTrip, the controller directly awaits User.findById(userId)
      // So, User.findById needs to resolve directly to mockUserInstance
      User.findById.mockResolvedValue(mockUserInstance); 

      await saveTripHandler(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(validUserId);
      expect(mockUserInstance.savedTrips.push).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My Awesome Trip',
        origin: 'City A',
        destination: 'City B',
      }));
      expect(mockUserInstance.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      
      const pushedTrip = mockUserInstance.savedTrips[mockUserInstance.savedTrips.length -1];
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Trip saved successfully',
        trip: expect.objectContaining({ 
            name: 'My Awesome Trip', 
            _id: pushedTrip._id // This will be the mock ObjectId object
        })
      }));
    });

    it('should return 400 if origin or destination is missing', async () => {
      mockReq.body = { origin: 'City A' };
      await saveTripHandler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Origin and destination are required to save a trip.' });
    });

    it('should return 404 if user not found', async () => {
      mockReq.userId = 'invalidUserId';
      mockReq.body = { origin: 'City A', destination: 'City B' };
      User.findById.mockResolvedValue(null); // findById resolves to null

      await saveTripHandler(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith('invalidUserId');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found.' });
    });

    it('should handle errors during saving trip', async () => {
      mockReq.userId = validUserId;
      mockReq.body = { origin: 'City A', destination: 'City B' };
      const error = new Error('DB save error');
      const mockUserWithError = {
          _id: validUserId,
          savedTrips: [],
          save: jest.fn().mockRejectedValue(error),
      };
      mockUserWithError.savedTrips.push = jest.fn();
      User.findById.mockResolvedValue(mockUserWithError); // findById resolves to the user

      await saveTripHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error saving trip', error: error.message });
      expect(console.error).toHaveBeenCalledWith("Error saving trip:", error);
    });

    it('should use default trip name if name is not provided', async () => {
        mockReq.body = { origin: 'Origin City', destination: 'Destination City', waypoints: [] };
        const mockUserInstance = {
            _id: validUserId, savedTrips: [], save: jest.fn(),
        };
        mockUserInstance.save.mockResolvedValue(mockUserInstance);
        mockUserInstance.savedTrips.push = jest.fn(function(tripData) {
            const newTripIdObject = new mongoose.Types.ObjectId();
            const newTrip = { ...tripData, _id: newTripIdObject };
            this[this.length] = newTrip; return newTrip;
        });
        User.findById.mockResolvedValue(mockUserInstance); // findById resolves to the user

        await saveTripHandler(mockReq, mockRes);
        expect(mockUserInstance.savedTrips.push).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Trip to Destination City',
        }));
    });
  });

  describe('getSavedTrips', () => {
    const getSavedTripsHandler = tripController.getSavedTrips[1];

    it('should fetch saved trips for a user', async () => {
      const tripsData = [{ name: 'Trip 1', _id: 'tripId1' }, { name: 'Trip 2', _id: 'tripId2' }];
      const mockUserWithTrips = { _id: validUserId, savedTrips: tripsData };

      // User.findById() in the controller returns a chain.
      // So, we get the chain instance and configure its exec.
      const mockChainReturnedByFindById = User.findById(validUserId); // Call User.findById() to get the chain
      mockChainReturnedByFindById.exec.mockResolvedValue(mockUserWithTrips);

      await getSavedTripsHandler(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(validUserId);
      expect(mockChainReturnedByFindById.select).toHaveBeenCalledWith('savedTrips');
      expect(mockChainReturnedByFindById.lean).toHaveBeenCalled();
      expect(mockChainReturnedByFindById.exec).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ trips: tripsData });
    });

    it('should return empty array if user has no saved trips', async () => {
        const mockChainReturnedByFindById = User.findById(validUserId);
        mockChainReturnedByFindById.exec.mockResolvedValue({ _id: validUserId, savedTrips: [] });
  
        await getSavedTripsHandler(mockReq, mockRes);
        expect(mockChainReturnedByFindById.exec).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ trips: [] });
    });
      
    it('should return 404 if user not found for getSavedTrips', async () => {
      mockReq.userId = 'invalidUserId';
      const mockChainReturnedByFindById = User.findById('invalidUserId');
      mockChainReturnedByFindById.exec.mockResolvedValue(null); // Default behavior from beforeEach might cover this

      await getSavedTripsHandler(mockReq, mockRes);
      
      expect(mockChainReturnedByFindById.exec).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found.' });
    });

    it('should handle errors during fetching saved trips', async () => {
        const error = new Error('DB fetch error');
        const mockChainReturnedByFindById = User.findById(validUserId);
        mockChainReturnedByFindById.exec.mockRejectedValue(error);

        await getSavedTripsHandler(mockReq, mockRes);
        
        expect(mockChainReturnedByFindById.exec).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error fetching saved trips', error: error.message });
        expect(console.error).toHaveBeenCalledWith("Error fetching saved trips:", error);
    });
  });

  describe('deleteSavedTrip', () => {
    const deleteSavedTripHandler = tripController.deleteSavedTrip[1];
    // Use the ObjectId mock that returns an object with toString for comparisons
    const tripIdToDeleteObject = new mongoose.Types.ObjectId(); 
    const anotherTripIdObject = new mongoose.Types.ObjectId();
    const tripIdToDeleteString = tripIdToDeleteObject.toString();
    const anotherTripIdString = anotherTripIdObject.toString();


    it('should delete a saved trip successfully', async () => {
      mockReq.params.tripId = tripIdToDeleteString; // The controller compares with string
      
      const mockUserInstance = {
        _id: validUserId,
        savedTrips: [
            // Store the mock ObjectId objects in the array
            { _id: tripIdToDeleteObject, name: 'Trip to delete' },
            { _id: anotherTripIdObject, name: 'Another trip' }
        ],
        save: jest.fn(),
      };
      mockUserInstance.save.mockResolvedValue(mockUserInstance);
      User.findById.mockResolvedValue(mockUserInstance); 
      mongoose.Types.ObjectId.isValid.mockReturnValue(true);

      await deleteSavedTripHandler(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith(validUserId);
      // After filter: user.savedTrips = user.savedTrips.filter(trip => trip._id.toString() !== tripId);
      // The trip._id is our mock ObjectId, its .toString() will be called.
      expect(mockUserInstance.savedTrips.length).toBe(1); 
      expect(mockUserInstance.savedTrips[0]._id.toString()).toBe(anotherTripIdString);
      expect(mockUserInstance.save).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Trip deleted successfully.' });
    });

    it('should return 400 if tripId is invalid', async () => {
        mockReq.params.tripId = 'invalidTripIdFormat';
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);
  
        await deleteSavedTripHandler(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid trip ID format.' });
    });

    it('should return 404 if user not found for delete', async () => {
        mockReq.userId = 'unknownUser';
        mockReq.params.tripId = tripIdToDeleteString;
        User.findById.mockResolvedValue(null); // findById resolves to null
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        await deleteSavedTripHandler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found.' });
    });

    it('should return 404 if trip not found for the user', async () => {
        mockReq.params.tripId = 'nonExistentTripIdForUserString';
        const someExistingTripIdObject = new mongoose.Types.ObjectId();
        const mockUserInstance = {
            _id: validUserId,
            savedTrips: [{ _id: someExistingTripIdObject, name: 'Some Trip' }],
            save: jest.fn(),
        };
        mockUserInstance.save.mockResolvedValue(mockUserInstance);
        User.findById.mockResolvedValue(mockUserInstance); // findById resolves to user
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        await deleteSavedTripHandler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Trip not found for this user.' });
    });

    it('should handle errors during deleting trip', async () => {
        mockReq.params.tripId = tripIdToDeleteString;
        const error = new Error('DB delete error');
        const mockUserInstance = {
            _id: validUserId,
            savedTrips: [{ _id: tripIdToDeleteObject, name: 'Trip to delete' }],
            save: jest.fn().mockRejectedValue(error),
        };
        User.findById.mockResolvedValue(mockUserInstance); // findById resolves to user
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        await deleteSavedTripHandler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error deleting trip', error: error.message });
        expect(console.error).toHaveBeenCalledWith("Error deleting trip:", error);
    });
  });
});