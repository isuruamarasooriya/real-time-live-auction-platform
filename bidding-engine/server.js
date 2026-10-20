const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
require('dotenv').config();
globalThis.crypto = crypto;

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log('Bidding Engine connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const BidSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  bidAmount: { type: Number, required: true },
  username: { type: String },
  timestamp: { type: Date, default: Date.now }
});
const Bid = mongoose.model('Bid', BidSchema);

const ItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  currentBid: { type: Number, required: true }
});
const Item = mongoose.model('Item', ItemSchema);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const REDIS_HOST = process.env.REDIS_HOST || 'redis-master';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

const redisUrl = REDIS_PASSWORD 
  ? `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`
  : `redis://${REDIS_HOST}:${REDIS_PORT}`;

const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis Adapter connected successfully to Socket.io');
  })
  .catch(err => {
    console.error('Redis Adapter connection error:', err);
  });


//Simulates CPU load to trigger Kubernetes HPA scaling during testing.(not for production)
app.post('/api/bidding/health-stress', (req, res) => {
  for (let i = 0; i < 5000000; i++) {}
  res.status(200).json({ message: 'Stress test endpoint hit!' });
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: Token is missing'));
  if (!process.env.JWT_SECRET) return next(new Error('Server error: JWT_SECRET missing'));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.username = decoded.username;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.username} (Socket ID: ${socket.id})`);

  socket.on('placeBid', async (data) => {
    try {
      const secureData = {
        itemId: data.itemId,
        bidAmount: data.bidAmount,
        username: socket.username
      };
      
      console.log('Secure Bid Received:', secureData);

      const newBid = new Bid(secureData);
      await newBid.save();

      await Item.findOneAndUpdate(
        { id: secureData.itemId },
        { currentBid: secureData.bidAmount }
      );

      io.emit('bidUpdated', secureData);
    } catch (error) {
      console.error('Error saving bid:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.username}`);
  });
});

const PORT = process.env.PORT || 5003;
server.listen(PORT, () => console.log(`Bidding Engine running on port ${PORT}`));