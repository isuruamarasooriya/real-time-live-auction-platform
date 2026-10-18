import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io(import.meta.env.VITE_BIDDING_ENGINE_URL, {
  autoConnect: false
});

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token') ? true : false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [items, setItems] = useState([]);
  const [bidInputs, setBidInputs] = useState({});

  useEffect(() => {
    fetch(`${import.meta.env.VITE_CATALOG_SERVICE_URL}/api/catalog/items`)
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.log('Catalog fetch error:', err));
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      socket.auth = { token };
      socket.connect();
    } else {
      socket.disconnect();
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

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      if (err.message.includes('Authentication error')) {
        handleLogout();
      }
    });

    return () => {
      socket.off('bidUpdated');
      socket.off('connect_error');
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        setIsLoggedIn(true);
        setShowAuthModal(false);
      } else {
        alert('Login failed. Check credentials.');
      }
    });
  };

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  const handleBidChange = (itemId, value) => {
    setBidInputs({ ...bidInputs, [itemId]: value });
  };

  const placeBid = (itemId) => {
    if (!isLoggedIn) {
      alert('You must login to place a bid!');
      setShowAuthModal(true);
      return;
    }

    const bidAmount = bidInputs[itemId];
    if (!bidAmount) return;
    
    socket.emit('placeBid', { itemId, bidAmount: Number(bidAmount) });
    setBidInputs({ ...bidInputs, [itemId]: '' });
  };

  if (showAuthModal && !isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="card">
          <h2>{isRegistering ? 'Create an Account' : 'Live Auction Login'}</h2>
          <form className="login-form" onSubmit={isRegistering ? handleRegister : handleLogin}>
            <input 
              name="username"
              placeholder="Username" 
              onChange={e => setUsername(e.target.value)} 
              required
            />
            <input 
              type="password" 
              name="password"
              placeholder="Password" 
              onChange={e => setPassword(e.target.value)} 
              required
            />
            <button type="submit">{isRegistering ? 'Register' : 'Login to Auction'}</button>
          </form>
          <p 
            style={{ marginTop: '15px', color: '#007bff', cursor: 'pointer', fontSize: '0.9em' }} 
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Already have an account? Login here' : "Don't have an account? Register here"}
          </p>
          <button 
            onClick={() => setShowAuthModal(false)} 
            style={{ marginTop: '20px', background: '#6c757d', padding: '8px 16px', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', width: '100%' }}
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Live Auction Dashboard</h2>
        {isLoggedIn ? (
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        ) : (
          <button className="login-btn" onClick={() => setShowAuthModal(true)}>Login / Register</button>
        )}
      </header>

      <div className="items-grid">
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', gridColumn: '1/-1' }}>Loading auction items...</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="item-card">
              <div>
                <h3>{item.name}</h3>
                <p className="price">Current Bid: ${item.currentBid}</p>
              </div>
              <div className="bid-section">
                <input 
                  type="number" 
                  name={`bid-${item.id}`}
                  id={`bid-${item.id}`}
                  placeholder="New bid"
                  value={bidInputs[item.id] || ''}
                  onChange={e => handleBidChange(item.id, e.target.value)} 
                />
                <button onClick={() => placeBid(item.id)}>Place Bid</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;