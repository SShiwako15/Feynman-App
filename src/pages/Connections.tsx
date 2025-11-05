import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnections } from '../contexts/ConnectionsContext';
import Navigation from '../components/Navigation';
import '../styles/Connections.css';

export default function Connections() {
  const { connections, addConnection, removeConnection, searchUsers } = useConnections();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchUsers>>([]);
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = searchUsers(query);
      // Filter out already connected users
      const filtered = results.filter(
        (user) => !connections.find((c) => c.id === user.id)
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddConnection = (user: typeof searchResults[0]) => {
    addConnection(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <>
      <Navigation />
      <div className="connections-container">
      <div className="connections-header">
        <h1>My Connections</h1>
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back to Dashboard
        </button>
      </div>

      <div className="search-section">
        <h2>Add New Connection</h2>
        <input
          type="text"
          placeholder="Search by name, email, or subject..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((user) => (
              <div key={user.id} className="search-result-item">
                <div className="avatar-small">{user.name.charAt(0).toUpperCase()}</div>
                <div className="user-info">
                  <h4>{user.name}</h4>
                  <p>{user.email}</p>
                  {user.subject && <span className="subject-badge">{user.subject}</span>}
                </div>
                <button
                  onClick={() => handleAddConnection(user)}
                  className="add-button"
                >
                  Add Connection
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="connections-section">
        <h2>Your Connections ({connections.length})</h2>
        {connections.length > 0 ? (
          <div className="connections-grid">
            {connections.map((connection) => (
              <div key={connection.id} className="connection-card">
                <div className="avatar-medium">{connection.name.charAt(0).toUpperCase()}</div>
                <h3>{connection.name}</h3>
                <p>{connection.email}</p>
                {connection.subject && (
                  <div className="subject-badge">{connection.subject}</div>
                )}
                <button
                  onClick={() => removeConnection(connection.id)}
                  className="remove-button"
                >
                  Remove Connection
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No connections yet. Search above to add some!</p>
        )}
      </div>
    </div>
    </>
  );
}

