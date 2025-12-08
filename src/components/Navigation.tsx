import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 px-8 py-4 flex justify-between items-center">
      <div className="text-2xl font-bold">
        <Link
          to="/dashboard"
          className="bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent"
        >
          Feynman
        </Link>
      </div>
      <div className="flex gap-6 items-center">
        <Link
          to="/dashboard"
          className="text-gray-700 font-medium px-3 py-2 rounded-lg hover:text-purple-600 hover:bg-gray-100 transition-colors"
        >
          Dashboard
        </Link>
        <Link
          to="/profile"
          className="text-gray-700 font-medium px-3 py-2 rounded-lg hover:text-purple-600 hover:bg-gray-100 transition-colors"
        >
          Profile
        </Link>
        <Link
          to="/connections"
          className="text-gray-700 font-medium px-3 py-2 rounded-lg hover:text-purple-600 hover:bg-gray-100 transition-colors"
        >
          Connections
        </Link>
        <Link
          to="/video-conference"
          className="text-gray-700 font-medium px-3 py-2 rounded-lg hover:text-purple-600 hover:bg-gray-100 transition-colors"
        >
          Video Conference
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-600 font-medium">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

