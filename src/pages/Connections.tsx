import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnections } from '../contexts/ConnectionsContext';
import type { Connection } from '../contexts/ConnectionsContext';
import Navigation from '../components/Navigation';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';

export default function Connections() {
  const { user } = useAuth();
  const {
    connections,
    pendingRequestsReceived,
    pendingRequestsSent,
    sendConnectionRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeConnection,
    searchUsers,
    isLoading,
  } = useConnections();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Connection[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'connections' | 'pending' | 'sent'>('connections');
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      // Filter out: already connected users, users with pending requests
      const filtered = results.filter((resultUser) => {
        const isConnected = connections.find((c) => c.id === resultUser.id);
        const hasPendingSent = pendingRequestsSent.find(
          (req) => req.toUserId === resultUser.id
        );
        const hasPendingReceived = pendingRequestsReceived.find(
          (req) => req.fromUserId === resultUser.id
        );
        const isSelf = resultUser.id === user?.id;
        return !isConnected && !hasPendingSent && !hasPendingReceived && !isSelf;
      });
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetUser: typeof searchResults[0]) => {
    // Double-check that we're not sending to someone we're already connected to or have a pending request with
    const isConnected = connections.find((c) => c.id === targetUser.id);
    const hasPendingSent = pendingRequestsSent.find(
      (req) => req.toUserId === targetUser.id && req.status === 'pending'
    );
    const hasPendingReceived = pendingRequestsReceived.find(
      (req) => req.fromUserId === targetUser.id && req.status === 'pending'
    );
    
    if (isConnected || hasPendingSent || hasPendingReceived) {
      alert('You already have a connection or pending request with this user.');
      return;
    }
    
    setSendingRequest(targetUser.id);
    try {
      const success = await sendConnectionRequest(targetUser.id);
      if (success) {
        setSearchQuery('');
        setSearchResults([]);
        // Reload requests to update the UI
        // This will be handled by the context's loadRequests
      }
    } catch (error: any) {
      alert(error.message || 'Failed to send connection request');
    } finally {
      setSendingRequest(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    await acceptRequest(requestId);
  };

  const handleRejectRequest = async (requestId: string) => {
    await rejectRequest(requestId);
  };

  const handleCancelRequest = async (requestId: string) => {
    await cancelRequest(requestId);
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
          <h2 className="text-2xl font-bold text-gray-800 mb-5">Search Users</h2>
          <input
            type="text"
            placeholder="Search by name, email, or subject..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500 transition-colors"
          />

          {isSearching && (
            <p className="mt-3 text-gray-600 text-sm">Searching...</p>
          )}

          {searchResults.length > 0 && (
            <div className="mt-5 flex flex-col gap-3">
              {searchResults.map((resultUser, index) => (
                <div
                  key={resultUser.id || `search-result-${index}`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Avatar src={resultUser.avatar} name={resultUser.name} size="md" />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{resultUser.name}</h4>
                    <p className="text-gray-600 text-sm mt-1">{resultUser.email}</p>
                    {resultUser.subject && (
                      <span className="inline-block bg-gray-200 px-3 py-1 rounded-full text-sm text-gray-700 mt-2">
                        {resultUser.subject}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleSendRequest(resultUser)}
                    disabled={sendingRequest === resultUser.id}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {sendingRequest === resultUser.id ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex gap-4 border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('connections')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'connections'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              My Connections ({connections.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 px-4 font-medium transition-colors relative ${
                activeTab === 'pending'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pending Requests
              {pendingRequestsReceived.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingRequestsReceived.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`pb-3 px-4 font-medium transition-colors ${
                activeTab === 'sent'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Sent Requests ({pendingRequestsSent.length})
            </button>
          </div>

          {/* Pending Requests Tab */}
          {activeTab === 'pending' && (
            <div>
              {pendingRequestsReceived.length === 0 ? (
                <p className="text-center text-gray-600 py-10 text-lg">
                  No pending connection requests.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {pendingRequestsReceived.map((request, index) => (
                    <div
                      key={request.requestId || `received-request-${index}`}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Avatar
                        src={request.fromUserAvatar}
                        name={request.fromUserName}
                        size="md"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{request.fromUserName}</h4>
                        <p className="text-gray-600 text-sm mt-1">
                          Sent {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.requestId)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.requestId)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sent Requests Tab */}
          {activeTab === 'sent' && (
            <div>
              {pendingRequestsSent.length === 0 ? (
                <p className="text-center text-gray-600 py-10 text-lg">
                  No sent connection requests.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {pendingRequestsSent.map((request, index) => (
                    <div
                      key={request.requestId || `sent-request-${index}`}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Avatar
                        src={request.toUserAvatar}
                        name={request.toUserName || request.toUserId}
                        size="md"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">
                          {request.toUserName || `User ID: ${request.toUserId}`}
                        </h4>
                        <p className="text-gray-600 text-sm mt-1">
                          Sent {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm mt-2">
                          Pending
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(request.requestId)}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-5">
              Your Connections ({connections.length})
            </h2>
            {isLoading ? (
              <p className="text-center text-gray-600 py-10 text-lg">Loading connections...</p>
            ) : connections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {connections.map((connection, index) => (
                  <div
                    key={connection.id || `connection-${index}`}
                    className="bg-gray-50 rounded-lg p-5 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                  >
                    <Avatar src={connection.avatar} name={connection.name} size="xl" className="mx-auto mb-4" />
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
                No connections yet. Search above to send connection requests!
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}