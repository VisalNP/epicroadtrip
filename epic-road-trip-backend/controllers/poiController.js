const POI = require('../models/poiModel');
exports.getPois = async (req, res) => {
  try {
    const {
      type,
      city,
      locality,
      maxDistance,
      longitude,
      latitude,
      search,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    let query = {};
    query.dataSource = { $regex: /^datatourisme-/i };

    if (type) {
      const typeArray = type.split(',').map(t => new RegExp(t.trim(), 'i'));
      query.types = { $in: typeArray };
    }
    if (city) query['address.city'] = { $regex: new RegExp(city, 'i') };
    if (locality) query['address.locality'] = { $regex: new RegExp(locality, 'i') };

    if (longitude && latitude && maxDistance) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(maxDistance, 10),
        },
      };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.locality': { $regex: search, $options: 'i' } },
        { types: { $regex: search, $options: 'i' } },
      ];
    }

    const count = await POI.countDocuments(query);
    const pois = await POI.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean()
      .exec();

    res.json({
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      totalPois: count,
      pois,
    });

  } catch (error) {
    console.error("Error fetching POIs from custom DB:", error);
    res.status(500).json({ message: 'Error fetching POIs from custom DB', error: error.message });
  }
};

exports.getPoiById = async (req, res) => {
  try {
    const poi = await POI.findOne({
      originalId: decodeURIComponent(req.params.id),
      dataSource: { $regex: /^datatourisme-/i }
    }).lean();

    if (!poi) {
      return res.status(404).json({ message: 'POI not found in custom DB' });
    }
    res.json(poi);
  } catch (error) {
    console.error("Error fetching POI by ID from custom DB:", error);
    res.status(500).json({ message: 'Error fetching POI by ID from custom DB', error: error.message });
  }
};

exports.getEnjoySuggestions = async (req, res) => {
  req.query.type = req.query.type || 'CulturalSite,EntertainmentAndEvent,Activity,Event,SportingEvent,ParkAndGarden,Museum';
  return exports.getPois(req, res);
};

exports.getTravelSuggestions = async (req, res) => {
  req.query.type = req.query.type || 'Transport,Parking,ElectricVehicleChargingPoint';
  return exports.getPois(req, res);
};