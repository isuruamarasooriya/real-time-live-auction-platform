const crypto = require('crypto');
globalThis.crypto = crypto;

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log('Auth Service connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Registration failed', error });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Login error', error });
  }
});

// Health Check Endpoint
app.get('/api/auth/health', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ status: 'Auth Service is Up', database: 'Connected' });
  } else {
    res.status(503).json({ status: 'Auth Service is Down', database: 'Disconnected' });
  }
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));

// Graceful shutdown logic
const shutdown = async () => {
  server.close(async () => {
    try {
      if (mongoose.connection.readyState !== 0) await mongoose.connection.close(false);
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  });

  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', shutdown); 
process.on('SIGINT', shutdown);