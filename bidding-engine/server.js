const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

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