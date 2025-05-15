const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const savedTripSchema = new Schema({
  name: { type: String, default: 'My Trip' }, 
  origin: String,
  destination: String,
  waypoints: [{ 
    originalId: String,
    name: String,
    dataSource: String,
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number]
    }
  }],
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  savedTrips: [savedTripSchema]
});

const User = mongoose.model('User', userSchema);
module.exports = User;