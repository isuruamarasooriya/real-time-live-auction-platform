import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io(import.meta.env.VITE_BIDDING_ENGINE_URL);

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [items, setItems] = useState([]);
  const [bidInputs, setBidInputs] = useState({});

  useEffect(() => {
    if (isLoggedIn) {
      fetch(`${import.meta.env.VITE_CATALOG_SERVICE_URL}/api/catalog/items`)
        .then(res => res.json())
        .then(data => setItems(data))
        .catch(err => console.log('Catalog fetch error:', err));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    socket.on('bidUpdated', (data) => {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === data.itemId ? { ...item, currentBid: data.bidAmount } : item
        )
      );
    });
  }, []);

  // Handle user login process
  const handleLogin = (e) => {
    e.preventDefault();
    fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) setIsLoggedIn(true);
      else alert('Login failed. Check credentials.');
    });
  };

  // Handle new user registration process
  const handleRegister = (e) => {
    e.preventDefault();
    fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success || data.message) {
        alert('Registration successful! Please login.');
        setIsRegistering(false);
      } else {
        alert('Registration failed.');
      }
    })
    .catch(err => console.log('Register error:', err));
  };

  const handleBidChange = (itemId, value) => {
    setBidInputs({ ...bidInputs, [itemId]: value });
  };

  const placeBid = (itemId) => {
    const bidAmount = bidInputs[itemId];
    if (!bidAmount) return;
    socket.emit('placeBid', { itemId, bidAmount: Number(bidAmount) });
    setBidInputs({ ...bidInputs, [itemId]: '' });
  };

  // Display Registration or Login Form if the user is not logged in
  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="card">
          <h2>{isRegistering ? 'Create an Account' : 'Live Auction Login'}</h2>
          
          {/* Form submits to either handleRegister or handleLogin based on state */}
          <form className="login-form" onSubmit={isRegistering ? handleRegister : handleLogin}>
            <input 
              placeholder="Username" 
              onChange={e => setUsername(e.target.value)} 
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              onChange={e => setPassword(e.target.value)} 
              required
            />
            <button type="submit">{isRegistering ? 'Register' : 'Login to Auction'}</button>
          </form>
          
          {/* Toggle link to switch between Login and Register views */}
          <p 
            style={{ marginTop: '15px', color: '#007bff', cursor: 'pointer', fontSize: '0.9em' }} 
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Already have an account? Login here' : "Don't have an account? Register here"}
          </p>
        </div>
      </div>
    );
  }

  // Display Dashboard if the user is logged in
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Live Auction Dashboard</h2>
        <button className="logout-btn" onClick={() => setIsLoggedIn(false)}>Logout</button>
      </header>

      <div className="items-grid">
        {items.map(item => (
          <div key={item.id} className="item-card">
            <div>
              <h3>{item.name}</h3>
              <p className="price">Current Bid: ${item.currentBid}</p>
            </div>
            <div className="bid-section">
              <input 
                type="number" 
                placeholder="New bid"
                value={bidInputs[item.id] || ''}
                onChange={e => handleBidChange(item.id, e.target.value)} 
              />
              <button onClick={() => placeBid(item.id)}>Place Bid</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;