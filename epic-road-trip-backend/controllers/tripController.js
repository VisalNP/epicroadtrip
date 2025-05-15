const User = require('../models/userModel');
const mongoose = require('mongoose');
const simpleAuthCheck = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized: No user ID provided." });
    }
    req.userId = userId; 
    next();
};


exports.saveTrip = [simpleAuthCheck, async (req, res) => {
  const { name, origin, destination, waypoints } = req.body;
  const userId = req.userId; 

  if (!origin || !destination) {
    return res.status(400).json({ message: 'Origin and destination are required to save a trip.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const newTrip = {
      name: name || `Trip to ${destination}`,
      origin,
      destination,
      waypoints: waypoints || []
    };

    user.savedTrips.push(newTrip);
    await user.save();
    
    const addedTrip = user.savedTrips[user.savedTrips.length - 1];
    res.status(201).json({ message: 'Trip saved successfully', trip: addedTrip });

  } catch (error) {
    console.error("Error saving trip:", error);
    res.status(500).json({ message: 'Error saving trip', error: error.message });
  }
}];

exports.getSavedTrips = [simpleAuthCheck, async (req, res) => {
  const userId = req.userId;
  try {
    const user = await User.findById(userId).select('savedTrips').lean(); 
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ trips: user.savedTrips || [] });
  } catch (error) {
    console.error("Error fetching saved trips:", error);
    res.status(500).json({ message: 'Error fetching saved trips', error: error.message });
  }
}];

exports.deleteSavedTrip = [simpleAuthCheck, async (req, res) => {
    const userId = req.userId;
    const { tripId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID format.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const initialTripCount = user.savedTrips.length;
        user.savedTrips = user.savedTrips.filter(trip => trip._id.toString() !== tripId);

        if (user.savedTrips.length === initialTripCount) {
            return res.status(404).json({ message: 'Trip not found for this user.' });
        }

        await user.save();
        res.json({ message: 'Trip deleted successfully.' });

    } catch (error) {
        console.error("Error deleting trip:", error);
        res.status(500).json({ message: 'Error deleting trip', error: error.message });
    }
}];