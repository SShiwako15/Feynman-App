import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConnections } from '../contexts/ConnectionsContext';
import Navigation from '../components/Navigation';
import Avatar from '../components/Avatar';
import { fetchFeed, createStudyPost, type StudyPost } from '../services/feedService';

export default function Dashboard() {
  const { user } = useAuth();
  const { connections, pendingRequestsReceived } = useConnections();
  const [feed, setFeed] = useState<StudyPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const loadFeed = async () => {
      if (!user?.id) return;
      
      setFeedLoading(true);
      setFeedError(null);
      try {
        const connectionIds = connections.map((c) => c.id);
        const posts = await fetchFeed(user.id, connectionIds);
        setFeed(posts);
      } catch (error: any) {
        console.error('Failed to load study feed', error);
        setFeedError('Failed to load study feed. Please try again later.');
      } finally {
        setFeedLoading(false);
      }
    };

    loadFeed();
  }, [user?.id, connections]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postText.trim()) return;

    setPosting(true);
    setFeedError(null);
    try {
      const newPost = await createStudyPost({
        userId: user.id,
        authorName: user.name,
        authorAvatar: user.avatar,
        subject: user.subject || 'Studying',
        message: postText.trim(),
      });

      if (newPost) {
        setFeed((prev) => [newPost, ...prev]);
        setPostText('');
      } else {
        setFeedError('Could not share your study update. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to create study post', error);
      setFeedError('Could not share your study update. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

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
              <Avatar src={user?.avatar} name={user?.name || 'User'} size="lg" />
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

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 relative">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center gap-2">
              Connections
              {pendingRequestsReceived.length > 0 && (
                <Link
                  to="/connections"
                  className="relative inline-block"
                  onClick={() => {
                    // Navigate and switch to pending tab
                    setTimeout(() => {
                      const pendingTab = document.querySelector('[data-tab="pending"]');
                      if (pendingTab) (pendingTab as HTMLElement).click();
                    }, 100);
                  }}
                >
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {pendingRequestsReceived.length}
                  </span>
                </Link>
              )}
            </h2>
            <p className="text-5xl font-bold text-purple-600 my-3">{connections.length}</p>
            <p className="text-gray-600 mb-5">Active connections</p>
            {pendingRequestsReceived.length > 0 && (
              <p className="text-sm text-red-600 mb-3 font-medium">
                {pendingRequestsReceived.length} pending request{pendingRequestsReceived.length !== 1 ? 's' : ''}
              </p>
            )}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">What are you studying?</h2>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder={
                    user?.subject
                      ? `Share an update about ${user.subject} with your connections...`
                      : 'Share what you’re studying with your connections...'
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500 transition-colors resize-none min-h-[90px]"
                />
                {feedError && (
                  <p className="text-red-600 text-sm">{feedError}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={posting || !postText.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {posting ? 'Sharing...' : 'Share with Connections'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Study Feed</h2>
              {feedLoading ? (
                <p className="text-gray-600">Loading what you and your connections are studying...</p>
              ) : feed.length === 0 ? (
                <p className="text-gray-600">
                  No study updates yet. Share what you&apos;re studying to get started!
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {feed.map((post) => (
                    <div
                      key={post.id}
                      className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Avatar
                        src={post.authorAvatar}
                        name={post.authorName}
                        size="md"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-800">{post.authorName}</h3>
                            {post.subject && (
                              <p className="text-sm text-purple-700 mt-1">
                                📚 {post.subject}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(post.createdAt)}
                          </span>
                        </div>
                        {post.message && (
                          <p className="text-gray-700 text-sm mt-2 whitespace-pre-line">
                            {post.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 h-fit">
            <h2 className="text-2xl font-bold text-gray-800 mb-5">Recent Connections</h2>
            {connections.length > 0 ? (
              <div className="flex flex-col gap-4">
                {connections
                  .slice(0, 5)
                  .map((connection: {
                    id: string;
                    name: string;
                    subject?: string;
                    avatar?: string;
                  }, index) => (
                    <div
                      key={connection.id || `connection-${index}`}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Avatar src={connection.avatar} name={connection.name} size="md" />
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
      </div>
    </>
  );
}