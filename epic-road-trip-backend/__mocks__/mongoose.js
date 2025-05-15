// __mocks__/mongoose.js
const mongoose = jest.createMockFromModule('mongoose');

// Helper to create a new chainable mock for each call
const createChainable = (resolveValue = []) => ({
  // Default resolveValue to an empty array for find(), or can be an object for findOne()
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(resolveValue),
  // Add a then method to allow direct awaiting on find/findOne if exec is not explicitly called
  // This is sometimes how people use Mongoose promises.
  then: jest.fn(function(onFulfilled, onRejected) {
    return Promise.resolve(this.exec()).then(onFulfilled, onRejected);
  }),
  catch: jest.fn(function(onRejected) {
    return Promise.resolve(this.exec()).catch(onRejected);
  }),
  // For specific methods like push or remove on subdocuments
  push: jest.fn(),
  remove: jest.fn(),
});


// This will be the constructor for our mocked models
function MockModel(data = {}) {
  // Simulate instance properties
  Object.assign(this, data);
  this._id = data._id || new mongoose.Types.ObjectId().toString(); // Ensure _id is present

  // Instance methods
  this.save = jest.fn().mockResolvedValue(this); // save resolves with the instance
  this.remove = jest.fn().mockResolvedValue(this); // remove resolves with the instance (if you use it)
  
  // If the model data has an array property (like savedTrips), mock its methods
  for (const key in data) {
    if (Array.isArray(data[key])) {
      this[key] = [...data[key]]; // Copy array
      this[key].push = jest.fn(item => { // Mock push
        this[key][this[key].length] = item;
        // For trip saving, the controller expects the pushed item (with its new _id)
        // The saveTrip controller adds an _id if it's not there.
        // The mock for User in tripController will handle assigning an _id to the pushed trip
        return this[key].length;
      });
      // Mock other array methods if needed (e.g., .id() for subdocs)
      this[key].id = jest.fn(id => this[key].find(doc => doc._id.toString() === id.toString()));
    }
  }
}

// Static methods for the MockModel constructor
MockModel.countDocuments = jest.fn().mockResolvedValue(0);
MockModel.find = jest.fn(() => createChainable([])); // find usually resolves to an array
MockModel.findOne = jest.fn(() => createChainable(null)); // findOne resolves to an object or null
MockModel.findById = jest.fn(() => createChainable(null)); // findById resolves to an object or null
MockModel.findOneAndUpdate = jest.fn(() => createChainable(null));
MockModel.findByIdAndUpdate = jest.fn(() => createChainable(null));
MockModel.deleteOne = jest.fn(() => createChainable({ deletedCount: 0 }));
MockModel.deleteMany = jest.fn(() => createChainable({ deletedCount: 0 }));
MockModel.updateOne = jest.fn(() => createChainable({ nModified: 0, n: 0 }));
MockModel.updateMany = jest.fn(() => createChainable({ nModified: 0, n: 0 }));
MockModel.bulkWrite = jest.fn().mockResolvedValue({ upsertedCount: 0, modifiedCount: 0, acknowledged: true });


// The mongoose.model function
mongoose.model = jest.fn((modelName, schema) => {
  // Return our MockModel constructor
  // We can attach the schema definition to the mock if needed for some tests
  MockModel.modelName = modelName;
  MockModel.schema = schema;
  return MockModel;
});

mongoose.Schema = jest.fn().mockImplementation(function(schemaDef, options) {
  this.schemaDefinition = schemaDef;
  this.options = options;
  this.pre = jest.fn();
  this.post = jest.fn();
  this.index = jest.fn();
  this.add = jest.fn();
  this.plugin = jest.fn();
  // Ensure methods like 'add' or 'plugin' don't break the chain if called on the schema.
  return this;
});

// Mock mongoose.Types.ObjectId
let idCounter = 0;
const mockObjectId = () => `mockObjectId${Date.now()}${idCounter++}`;

mongoose.Types = {
  ObjectId: jest.fn(id => id || mockObjectId()), // If id is passed, use it, else generate one
};
mongoose.Types.ObjectId.isValid = jest.fn(id => {
    // A more robust mock for ObjectId.isValid
    if (id === null || typeof id === 'undefined') return false;
    const idString = String(id);
    return /^[0-9a-fA-F]{24}$/.test(idString) || idString.startsWith('mockObjectId'); // Allow our generated mock IDs
});


mongoose.connect = jest.fn().mockResolvedValue(undefined);
mongoose.disconnect = jest.fn().mockResolvedValue(undefined);

module.exports = mongoose;