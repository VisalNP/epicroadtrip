
const User = require('../models/userModel');

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

    const newUser = new User({ username: username.toLowerCase(), password });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully', userId: newUser._id, username: newUser.username });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

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

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials (password incorrect).' });
    }

    res.json({ message: 'Login successful', userId: user._id, username: user.username });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};