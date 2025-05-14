const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
  },
  coordinates: {
    type: [Number], 
  },
}, { _id: false });

const poiSchema = new mongoose.Schema({
  originalId: { type: String, unique: true, required: true, index: true },
  dataSource: { type: String, required: true, index: true },
  name: { type: String, index: true, required: true }, 
  types: { type: [String], index: true },
  shortDescription: String,
  description: String,
  address: {
    streetAddress: String,
    postalCode: String,    
    locality: { type: String, index: true }, 
    city: { type: String, index: true },    
  },
  location: { 
    type: pointSchema,
    index: '2dsphere', 
    required: false,  
  },
  lastUpdateInternal: { type: Date, default: Date.now },
  lastUpdateSource: Date,
});

poiSchema.index({ name: 'text', shortDescription: 'text', description: 'text', 'address.city': 'text', 'address.locality': 'text' });

const POI = mongoose.model('POI', poiSchema);

module.exports = POI;