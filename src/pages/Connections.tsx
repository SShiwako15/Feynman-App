import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnections } from '../contexts/ConnectionsContext';
import Navigation from '../components/Navigation';

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
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">My Connections</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-5">Add New Connection</h2>
          <input
            type="text"
            placeholder="Search by name, email, or subject..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500 transition-colors"
          />

          {searchResults.length > 0 && (
            <div className="mt-5 flex flex-col gap-3">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{user.name}</h4>
                    <p className="text-gray-600 text-sm mt-1">{user.email}</p>
                    {user.subject && (
                      <span className="inline-block bg-gray-200 px-3 py-1 rounded-full text-sm text-gray-700 mt-2">
                        {user.subject}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddConnection(user)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Add Connection
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-5">
            Your Connections ({connections.length})
          </h2>
          {connections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="bg-gray-50 rounded-lg p-5 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                    {connection.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">{connection.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{connection.email}</p>
                  {connection.subject && (
                    <div className="inline-block bg-gray-200 px-3 py-1 rounded-full text-sm text-gray-700 mb-4">
                      {connection.subject}
                    </div>
                  )}
                  <button
                    onClick={() => removeConnection(connection.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors w-full"
                  >
                    Remove Connection
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-10 text-lg">
              No connections yet. Search above to add some!
            </p>
          )}
        </div>
      </div>
    </>
  );
}