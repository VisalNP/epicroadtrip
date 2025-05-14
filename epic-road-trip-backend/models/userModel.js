// epic-road-trip-backend/models/userModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define a simple schema for a saved trip
const savedTripSchema = new Schema({
  name: { type: String, default: 'My Trip' }, // User can name their trip
  origin: String,
  destination: String,
  waypoints: [{ // Storing simplified POI data for waypoints
    originalId: String, // or placeId
    name: String,
    dataSource: String, // To know if it's from DB or Google
    // You might want to store lat/lng here too if not relying on re-fetching POI details
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number]
    }
  }],
  createdAt: { type: Date, default: Date.now }
}, { _id: true }); // Give each saved trip its own ID

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  password: { // In a real app, ALWAYS HASH PASSWORDS
    type: String,
    required: true
  },
  savedTrips: [savedTripSchema] // Array of saved trips
});

// In a real app, you would add a pre-save hook for password hashing:
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

const User = mongoose.model('User', userSchema);
module.exports = User;