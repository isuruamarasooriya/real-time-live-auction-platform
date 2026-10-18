const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
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

app.post('/api/bidding/health-stress', (req, res) => {
  for (let i = 0; i < 5000000; i++) {}
  res.status(200).json({ message: 'Stress test endpoint hit!' });
});

io.on('connection', (socket) => {
  console.log('New User connected:', socket.id);

  socket.on('placeBid', async (data) => {
    try {
      console.log('New Bid Received:', data);

      const newBid = new Bid(data);
      await newBid.save();

      await Item.findOneAndUpdate(
        { id: data.itemId },
        { currentBid: data.bidAmount }
      );

      io.emit('bidUpdated', data);
    } catch (error) {
      console.error('Error saving bid:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5003;
server.listen(PORT, () => console.log(`Bidding Engine running on port ${PORT}`));