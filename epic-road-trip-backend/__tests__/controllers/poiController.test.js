// __tests__/controllers/poiController.test.js
const poiController = require('../../controllers/poiController');
const POI = require('../../models/poiModel'); // This will be the mocked version

jest.mock('../../models/poiModel');

describe('POI Controller', () => {
  let mockReq, mockRes;
  let consoleErrorSpy;

  beforeEach(() => {
    mockReq = {
      query: {},
      params: {},
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    
    jest.clearAllMocks();
    
    // Explicitly mock POI.find and POI.findOne to return a new chain object each time
    POI.find.mockImplementation(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]), 
    }));

    POI.findOne.mockImplementation(() => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
    }));
    
    POI.countDocuments.mockResolvedValue(0);

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('getPois', () => {
    it('should fetch POIs with default parameters', async () => {
      const mockPoisList = [{ name: 'POI 1' }, { name: 'POI 2' }];
      POI.countDocuments.mockResolvedValue(2);
      
      const findChain = POI.find(); 
      findChain.exec.mockResolvedValue(mockPoisList);

      await poiController.getPois(mockReq, mockRes);

      expect(POI.countDocuments).toHaveBeenCalledWith({ dataSource: { $regex: /^datatourisme-/i } });
      expect(POI.find).toHaveBeenCalledWith({ dataSource: { $regex: /^datatourisme-/i } });
      expect(findChain.sort).toHaveBeenCalledWith({ name: 1 });
      expect(findChain.skip).toHaveBeenCalledWith(0);
      expect(findChain.limit).toHaveBeenCalledWith(20);
      expect(mockRes.json).toHaveBeenCalledWith({
        totalPages: 1,
        currentPage: 1,
        totalPois: 2,
        pois: mockPoisList,
      });
    });

    it('should apply type filter', async () => {
      mockReq.query.type = 'CulturalSite, Museum';
      const findChain = POI.find(); // Get the chain for this specific call
      await poiController.getPois(mockReq, mockRes);
      // The query object for find is checked against the POI.find mock call itself
      expect(POI.find).toHaveBeenCalledWith(expect.objectContaining({
        types: { $in: [expect.any(RegExp), expect.any(RegExp)] }
      }));
      const typesArg = POI.find.mock.calls[0][0].types.$in;
      expect(typesArg[0].toString()).toEqual('/CulturalSite/i');
      expect(typesArg[1].toString()).toEqual('/Museum/i');
    });

    it('should apply city filter', async () => {
      mockReq.query.city = 'Paris';
      const findChain = POI.find();
      await poiController.getPois(mockReq, mockRes);
      expect(POI.find).toHaveBeenCalledWith(expect.objectContaining({
        'address.city': { $regex: /Paris/i }
      }));
    });

    it('should apply locality filter', async () => {
        mockReq.query.locality = '1st Arrondissement';
        const findChain = POI.find();
        await poiController.getPois(mockReq, mockRes);
        expect(POI.find).toHaveBeenCalledWith(expect.objectContaining({
          'address.locality': { $regex: /1st Arrondissement/i }
        }));
      });

    it('should apply geospatial filter', async () => {
      mockReq.query.longitude = '2.3522';
      mockReq.query.latitude = '48.8566';
      mockReq.query.maxDistance = '1000';
      const findChain = POI.find();
      await poiController.getPois(mockReq, mockRes);
      expect(POI.find).toHaveBeenCalledWith(expect.objectContaining({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
            $maxDistance: 1000,
          },
        },
      }));
    });

    it('should apply search filter', async () => {
      mockReq.query.search = 'Eiffel';
      const findChain = POI.find();
      await poiController.getPois(mockReq, mockRes);
      expect(POI.find).toHaveBeenCalledWith(expect.objectContaining({
        $or: [
          { name: { $regex: 'Eiffel', $options: 'i' } },
          { shortDescription: { $regex: 'Eiffel', $options: 'i' } },
          { description: { $regex: 'Eiffel', $options: 'i' } },
          { 'address.city': { $regex: 'Eiffel', $options: 'i' } },
          { 'address.locality': { $regex: 'Eiffel', $options: 'i' } },
          { types: { $regex: 'Eiffel', $options: 'i' } },
        ]
      }));
    });

    it('should handle pagination and sorting', async () => {
      mockReq.query.page = '2';
      mockReq.query.limit = '10';
      mockReq.query.sortBy = 'description';
      mockReq.query.sortOrder = 'desc';
      POI.countDocuments.mockResolvedValue(100);

      const findChain = POI.find();
      findChain.exec.mockResolvedValue([]); 

      await poiController.getPois(mockReq, mockRes);

      expect(findChain.sort).toHaveBeenCalledWith({ description: -1 });
      expect(findChain.skip).toHaveBeenCalledWith(10);
      expect(findChain.limit).toHaveBeenCalledWith(10);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        currentPage: 2,
        totalPages: 10,
      }));
    });

    it('should handle errors during POI fetching (count error)', async () => {
      const error = new Error('Database count error');
      POI.countDocuments.mockRejectedValue(error); // Simulate error on count

      await poiController.getPois(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error fetching POIs from custom DB',
        error: error.message,
      });
      expect(console.error).toHaveBeenCalledWith("Error fetching POIs from custom DB:", error);
    });

    it('should handle errors during POI fetching (find error)', async () => {
        const error = new Error('Database find error');
        POI.countDocuments.mockResolvedValue(10); // Count succeeds
        const findChain = POI.find();
        findChain.exec.mockRejectedValue(error); // Find fails
  
        await poiController.getPois(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Error fetching POIs from custom DB',
          error: error.message,
        });
        expect(console.error).toHaveBeenCalledWith("Error fetching POIs from custom DB:", error);
      });

    it('should use default sort order if not provided', async () => {
        mockReq.query.sortBy = 'name';
        const findChain = POI.find();
        await poiController.getPois(mockReq, mockRes);
        expect(findChain.sort).toHaveBeenCalledWith({ name: 1 });
    });

    it('should correctly handle sortOrder "asc"', async () => {
        mockReq.query.sortBy = 'name';
        mockReq.query.sortOrder = 'asc';
        const findChain = POI.find();
        await poiController.getPois(mockReq, mockRes);
        expect(findChain.sort).toHaveBeenCalledWith({ name: 1 });
    });
  });

  describe('getPoiById', () => {
    it('should fetch a POI by its ID', async () => {
      const mockPoiData = { originalId: 'poi/123', name: 'Specific POI', _id: 'mongoId123' };
      mockReq.params.id = encodeURIComponent('poi/123');
      
      const findOneChain = POI.findOne(); 
      findOneChain.exec.mockResolvedValue(mockPoiData);

      await poiController.getPoiById(mockReq, mockRes);

      expect(POI.findOne).toHaveBeenCalledWith({
        originalId: 'poi/123',
        dataSource: { $regex: /^datatourisme-/i }
      });
      expect(findOneChain.lean).toHaveBeenCalled();
      expect(findOneChain.exec).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockPoiData);
    });

    it('should return 404 if POI not found', async () => {
      mockReq.params.id = 'nonexistent';
      const findOneChain = POI.findOne();
      findOneChain.exec.mockResolvedValue(null);

      await poiController.getPoiById(mockReq, mockRes);
      
      expect(POI.findOne).toHaveBeenCalledWith({
        originalId: 'nonexistent',
        dataSource: { $regex: /^datatourisme-/i }
      });
      expect(findOneChain.exec).toHaveBeenCalled(); // Ensure exec was called
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'POI not found in custom DB' });
    });

    it('should handle errors during getPoiById', async () => {
      const error = new Error('DB findOne error');
      mockReq.params.id = 'anyId';
      const findOneChain = POI.findOne();
      findOneChain.exec.mockRejectedValue(error);

      await poiController.getPoiById(mockReq, mockRes);

      expect(findOneChain.exec).toHaveBeenCalled(); // Ensure exec was called
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Error fetching POI by ID from custom DB',
        error: error.message,
      });
      expect(console.error).toHaveBeenCalledWith("Error fetching POI by ID from custom DB:", error);
    });
  });

  describe('getEnjoySuggestions', () => {
    it('should call getPois with enjoy types', async () => {
      const getPoisSpy = jest.spyOn(poiController, 'getPois');
      getPoisSpy.mockImplementation(async (req, res) => {
        res.json({pois: []});
      });
      
      await poiController.getEnjoySuggestions(mockReq, mockRes);

      expect(mockReq.query.type).toBe('CulturalSite,EntertainmentAndEvent,Activity,Event,SportingEvent,ParkAndGarden,Museum');
      expect(getPoisSpy).toHaveBeenCalledWith(mockReq, mockRes);
      
      getPoisSpy.mockRestore();
    });

    it('should use provided type if already present in query for enjoy suggestions', async () => {
      const getPoisSpy = jest.spyOn(poiController, 'getPois');
      getPoisSpy.mockImplementation(async (req, res) => {
        res.json({pois: []});
      });
      mockReq.query.type = 'Museum';
      
      await poiController.getEnjoySuggestions(mockReq, mockRes);
      
      expect(mockReq.query.type).toBe('Museum');
      expect(getPoisSpy).toHaveBeenCalledWith(mockReq, mockRes);
      
      getPoisSpy.mockRestore();
    });
  });

  describe('getTravelSuggestions', () => {
    it('should call getPois with travel types', async () => {
      const getPoisSpy = jest.spyOn(poiController, 'getPois');
      getPoisSpy.mockImplementation(async (req, res) => {
        res.json({pois: []});
      });
      
      await poiController.getTravelSuggestions(mockReq, mockRes);

      expect(mockReq.query.type).toBe('Transport,Parking,ElectricVehicleChargingPoint');
      expect(getPoisSpy).toHaveBeenCalledWith(mockReq, mockRes);

      getPoisSpy.mockRestore();
    });

    it('should use provided type if already present in query for travel suggestions', async () => {
        const getPoisSpy = jest.spyOn(poiController, 'getPois');
        getPoisSpy.mockImplementation(async (req, res) => {
          res.json({pois: []});
        });
        mockReq.query.type = 'Parking';
        
        await poiController.getTravelSuggestions(mockReq, mockRes);
        
        expect(mockReq.query.type).toBe('Parking');
        expect(getPoisSpy).toHaveBeenCalledWith(mockReq, mockRes);
        
        getPoisSpy.mockRestore();
      });
  });
});