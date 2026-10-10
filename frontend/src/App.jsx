import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:5003');

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [items, setItems] = useState([]);
  const [bidAmount, setBidAmount] = useState('');

  useEffect(() => {
    fetch('http://localhost:5002/api/catalog/items')
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.log('Catalog fetch error:', err));
  }, []);

  useEffect(() => {
    socket.on('bidUpdated', (data) => {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === data.itemId ? { ...item, currentBid: data.bidAmount } : item
        )
      );
    });
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) setIsLoggedIn(true);
      else alert('Login failed. Use admin / 123');
    });
  };

  const placeBid = (itemId) => {
    if (!bidAmount) return;
    socket.emit('placeBid', { itemId, bidAmount: Number(bidAmount) });
    setBidAmount('');
  };

  if (!isLoggedIn) {
    return (
      <div className="container">
        <h2>Live Auction Login</h2>
        <form className="login-form" onSubmit={handleLogin}>
          <input placeholder="Username (admin)" onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Password (123)" onChange={e => setPassword(e.target.value)} />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Live Auction Dashboard</h2>
      {items.map(item => (
        <div key={item.id} className="item-card">
          <div>
            <h3>{item.name}</h3>
            <p className="price">Current Bid: ${item.currentBid}</p>
          </div>
          <div className="bid-section">
            <input 
              type="number" 
              placeholder="Enter bid amount"
              onChange={e => setBidAmount(e.target.value)} 
            />
            <button onClick={() => placeBid(item.id)}>Place Bid</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;