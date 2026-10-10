const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

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

    socket.on('placeBid', (data) => {
        console.log('New Bid Received:', data);
        io.emit('bidUpdated', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5003;
server.listen(PORT, () => console.log(`Bidding Engine running on port ${PORT}`));