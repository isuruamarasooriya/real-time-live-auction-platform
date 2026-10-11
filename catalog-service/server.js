const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const items = [
    { id: '1', name: 'Antique Vase', startingPrice: 100, currentBid: 100 },
    { id: '2', name: 'Vintage Camera', startingPrice: 250, currentBid: 250 }
];

app.get('/api/catalog/items', (req, res) => {
    res.json(items);
});

app.get('/api/catalog/health', (req, res) => {
    res.status(200).json({ status: 'Catalog Service is Up' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Catalog Service running on port ${PORT}`));