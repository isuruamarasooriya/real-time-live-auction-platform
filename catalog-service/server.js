const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
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

app.get('/api/catalog/health', (req, res) => {
  res.status(200).json({ status: 'Catalog Service is Up' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Catalog Service running on port ${PORT}`));