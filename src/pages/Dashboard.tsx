import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConnections } from '../contexts/ConnectionsContext';
import Navigation from '../components/Navigation';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { connections } = useConnections();

  return (
    <>
      <Navigation />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Welcome back, {user?.name}!</h1>
          <Link to="/profile" className="profile-link">
            View Profile
          </Link>
        </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>My Profile</h2>
          <div className="profile-preview">
            <div className="avatar-large">{user?.name.charAt(0).toUpperCase()}</div>
            <div>
              <h3>{user?.name}</h3>
              <p>{user?.email}</p>
              {user?.subject && (
                <div className="subject-badge">
                  <span>📚</span> {user.subject}
                </div>
              )}
            </div>
          </div>
          <Link to="/profile" className="card-link">
            Edit Profile →
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Connections</h2>
          <p className="stat-number">{connections.length}</p>
          <p className="stat-label">Active connections</p>
          <Link to="/connections" className="card-link">
            Manage Connections →
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Video Conference</h2>
          <p>Start or join a video conference with your connections</p>
          <Link to="/video-conference" className="card-link primary">
            Start Conference →
          </Link>
        </div>
      </div>

      <div className="recent-connections">
        <h2>Recent Connections</h2>
        {connections.length > 0 ? (
          <div className="connections-list">
            {connections.slice(0, 3).map((connection) => (
              <div key={connection.id} className="connection-item">
                <div className="avatar-small">{connection.name.charAt(0).toUpperCase()}</div>
                <div>
                  <h4>{connection.name}</h4>
                  {connection.subject && <p>{connection.subject}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No connections yet. Start by adding some!</p>
        )}
      </div>
    </div>
    </>
  );
}