// epic-road-trip-backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json()); // Crucial for req.body parsing

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('Epic Road Trip API is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});