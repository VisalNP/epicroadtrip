// epic-road-trip-backend/controllers/authController.js
const User = require('../models/userModel');
// const bcrypt = require('bcryptjs'); // You'd use this for password hashing
// const jwt = require('jsonwebtoken'); // For token-based auth

// --- VERY SIMPLE AUTH - NOT FOR PRODUCTION ---

// Register a new user
exports.register = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    // In a real app, hash the password here before saving
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);
    // const newUser = new User({ username, password: hashedPassword });

    const newUser = new User({ username: username.toLowerCase(), password }); // Storing plain text password (BAD PRACTICE)
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully', userId: newUser._id, username: newUser.username });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Login an existing user
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials (user not found).' });
    }

    // In a real app, compare hashed password:
    // const isMatch = await bcrypt.compare(password, user.password);
    // if (!isMatch) {
    //   return res.status(401).json({ message: 'Invalid credentials (password incorrect).' });
    // }

    if (user.password !== password) { // Plain text comparison (BAD PRACTICE)
      return res.status(401).json({ message: 'Invalid credentials (password incorrect).' });
    }

    // For a real app, you'd generate a JWT token here
    // const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // res.json({ message: 'Login successful', token, userId: user._id, username: user.username });

    // For this simple example, just return user info (NOT how you'd do real sessions)
    res.json({ message: 'Login successful', userId: user._id, username: user.username });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};