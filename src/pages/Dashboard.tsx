import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConnections } from '../contexts/ConnectionsContext';
import Navigation from '../components/Navigation';

export default function Dashboard() {
  const { user } = useAuth();
  const { connections } = useConnections();

  return (
    <>
      <Navigation />
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Welcome back, {user?.name}!</h1>
          <Link
            to="/profile"
            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            View Profile
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-5">My Profile</h2>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center text-2xl font-bold">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{user?.name}</h3>
                <p className="text-gray-600 text-sm">{user?.email}</p>
                {user?.subject && (
                  <div className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700 mt-2">
                    📚 {user.subject}
                  </div>
                )}
              </div>
            </div>
            <Link
              to="/profile"
              className="text-purple-600 hover:text-purple-700 font-medium inline-block mt-2"
            >
              Edit Profile →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-5">Connections</h2>
            <p className="text-5xl font-bold text-purple-600 my-3">{connections.length}</p>
            <p className="text-gray-600 mb-5">Active connections</p>
            <Link
              to="/connections"
              className="text-purple-600 hover:text-purple-700 font-medium inline-block mt-2"
            >
              Manage Connections →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-5">Video Conference</h2>
            <p className="text-gray-600 mb-5">
              Start or join a video conference with your connections
            </p>
            <Link
              to="/video-conference"
              className="inline-block px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 mt-2"
            >
              Start Conference →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-5">Recent Connections</h2>
          {connections.length > 0 ? (
            <div className="flex flex-col gap-4">
              {connections.slice(0, 3).map((connection: { id: string; name: string; subject?: string }) => (
                <div
                  key={connection.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold">
                    {connection.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{connection.name}</h4>
                    {connection.subject && (
                      <p className="text-gray-600 text-sm mt-1">{connection.subject}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No connections yet. Start by adding some!</p>
          )}
        </div>
      </div>
    </>
  );
}