const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');
globalThis.crypto = crypto;
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Catalog Service connected to MongoDB');
    await seedInitialItems();
  })
  .catch(err => console.error('MongoDB connection error:', err));

const ItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  startingPrice: { type: Number, required: true },
  currentBid: { type: Number, required: true }
});
const Item = mongoose.model('Item', ItemSchema);

async function seedInitialItems() {
  try {
    const count = await Item.countDocuments();
    if (count === 0) {
      await Item.insertMany([
        { id: '1', name: 'Antique Vase', startingPrice: 100, currentBid: 100 },
        { id: '2', name: 'Vintage Camera', startingPrice: 250, currentBid: 250 }
      ]);
      console.log('Initial items seeded to database');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

app.get('/api/catalog/items', async (req, res) => {
  try {
    const items = await Item.find({});
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error });
  }
});

// Health check endpoint
app.get('/api/catalog/health', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ status: 'Catalog Service is Up', database: 'Connected' });
  } else {
    res.status(503).json({ status: 'Catalog Service is Down', database: 'Disconnected' });
  }
});

const PORT = process.env.PORT || 5002;
const server = app.listen(PORT, () => console.log(`Catalog Service running on port ${PORT}`));

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

// testing auto detect
// test agin pipeline
// trigger rebuild