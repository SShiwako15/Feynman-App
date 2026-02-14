import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConnections } from '../contexts/ConnectionsContext';
import { useChimeMeeting } from '../hooks/useChimeMeeting';
import type { ChatMessage } from '../hooks/useChimeMeeting';
import {
  sendConferenceInvite,
  getConferenceInvites,
  clearConferenceInvite,
  clearInvitesByMeetingId,
  type ConferenceInvite,
} from '../services/conferenceInviteService';
import Navigation from '../components/Navigation';
import Avatar from '../components/Avatar';
import Whiteboard from '../components/Whiteboard';

type Phase = 'lobby' | 'connecting' | 'in-meeting';
type RightPanel = 'participants' | 'chat' | 'invite' | null;

export default function VideoConference() {
  const { user } = useAuth();
  const { connections } = useConnections();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMeetingId = searchParams.get('meetingId') || '';

  const {
    meetingSession,
    participants,
    localAttendeeId,
    localVideoEnabled,
    localAudioEnabled,
    isScreenSharing,
    isConnecting,
    error,
    chatMessages,
    joinMeeting,
    leaveMeeting,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    bindVideoElement,
    unbindVideoElement,
    sendChatMessage,
    clearError,
  } = useChimeMeeting();

  // Phase management
  const [phase, setPhase] = useState<Phase>('lobby');
  const [activeMeetingId, setActiveMeetingId] = useState<string>(initialMeetingId);
  const [joinMeetingInput, setJoinMeetingInput] = useState<string>(initialMeetingId);

  // Lobby state
  const [invites, setInvites] = useState<ConferenceInvite[]>([]);
  const [lobbyCopyStatus, setLobbyCopyStatus] = useState<{ [key: string]: 'idle' | 'copied' | 'error' }>({});

  // Room state
  const [rightPanel, setRightPanel] = useState<RightPanel>('participants');
  const [chatInput, setChatInput] = useState('');
  const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
  const [isWhiteboardShared, setIsWhiteboardShared] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [roomInviteSent, setRoomInviteSent] = useState<Set<string>>(new Set());

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load invitations on mount, when returning to lobby, and poll every 10s
  useEffect(() => {
    if (phase !== 'lobby' || !user?.id) return;

    const loadInvites = async () => {
      const fetched = await getConferenceInvites(user.id);
      setInvites(fetched);
    };

    loadInvites();
    const interval = setInterval(loadInvites, 10000);
    return () => clearInterval(interval);
  }, [phase, user?.id]);

  // Sync isConnecting from hook to phase
  useEffect(() => {
    if (isConnecting && phase !== 'connecting') {
      setPhase('connecting');
    }
  }, [isConnecting, phase]);

  // When session is ready, move to in-meeting
  useEffect(() => {
    if (meetingSession && !isConnecting && phase === 'connecting') {
      setPhase('in-meeting');
    }
  }, [meetingSession, isConnecting, phase]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Bind video elements to Chime tiles
  useEffect(() => {
    if (!meetingSession) return;

    const audioVideo: any = meetingSession.audioVideo;

    // Bind local video tile
    const localTile = audioVideo.getLocalVideoTile();
    if (localTile && localVideoRef.current) {
      bindVideoElement(localTile.state().tileId, localVideoRef.current);
    }

    // Bind remote video tiles
    const observer = {
      videoTileDidUpdate: (tileState: any) => {
        if (!tileState.localTile && tileState.attendeeId) {
          const videoElement = remoteVideoRefs.current[tileState.attendeeId];
          if (videoElement) {
            bindVideoElement(tileState.tileId, videoElement);
          }
        }
      },
      videoTileWasRemoved: (tileId: number) => {
        unbindVideoElement(tileId);
      },
    };

    audioVideo.addObserver(observer);

    return () => {
      audioVideo.removeObserver(observer);
      if (localTile) {
        unbindVideoElement(localTile.state().tileId);
      }
    };
  }, [meetingSession, bindVideoElement, unbindVideoElement, localVideoEnabled]);

  // ─── Lobby handlers ───

  const handleStartConference = async () => {
    setPhase('connecting');
    try {
      // Create a new meeting — the backend generates the Chime MeetingId
      const meetingInfo = await joinMeeting('create', undefined, user?.name || user?.email);
      const chimeMeetingId = meetingInfo.Meeting.MeetingId;
      setActiveMeetingId(chimeMeetingId);
      navigate(`/video-conference?meetingId=${chimeMeetingId}`, { replace: true });
    } catch (err) {
      console.error('Failed to start conference:', err);
      setPhase('lobby');
    }
  };

  const handleJoinConference = async (meetingId?: string) => {
    const idToJoin = meetingId || extractMeetingId(joinMeetingInput);
    if (!idToJoin.trim()) return;

    setActiveMeetingId(idToJoin);
    navigate(`/video-conference?meetingId=${idToJoin}`, { replace: true });
    setPhase('connecting');
    try {
      // Join an existing meeting using the Chime MeetingId
      await joinMeeting('join', idToJoin, user?.name || user?.email);
      // Clear this invite from the list
      if (user?.id) {
        await clearConferenceInvite(user.id, idToJoin);
        const updatedInvites = await getConferenceInvites(user.id);
        setInvites(updatedInvites);
      }
    } catch (err) {
      console.error('Failed to join conference:', err);
      setPhase('lobby');
    }
  };

  const extractMeetingId = (input: string): string => {
    // If the input is a URL, extract the meetingId param
    try {
      const url = new URL(input);
      const mid = url.searchParams.get('meetingId');
      if (mid) return mid;
    } catch {
      // Not a URL, treat as raw ID
    }
    return input.trim();
  };

  const handleLobbyCopyLink = async (meetingId: string) => {
    try {
      const url = `${window.location.origin}/video-conference?meetingId=${meetingId}`;
      await navigator.clipboard.writeText(url);
      setLobbyCopyStatus((prev) => ({ ...prev, [meetingId]: 'copied' }));
      setTimeout(() => setLobbyCopyStatus((prev) => ({ ...prev, [meetingId]: 'idle' })), 2000);
    } catch {
      setLobbyCopyStatus((prev) => ({ ...prev, [meetingId]: 'error' }));
      setTimeout(() => setLobbyCopyStatus((prev) => ({ ...prev, [meetingId]: 'idle' })), 2000);
    }
  };

  const handleDismissInvite = async (meetingId: string) => {
    if (!user?.id) return;
    await clearConferenceInvite(user.id, meetingId);
    const updatedInvites = await getConferenceInvites(user.id);
    setInvites(updatedInvites);
  };

  // ─── Room handlers ───

  const handleLeaveConference = async () => {
    // Clear all invitations for this meeting since the conference is closing
    if (activeMeetingId) {
      clearInvitesByMeetingId(activeMeetingId);
    }
    try {
      await leaveMeeting();
    } catch (err) {
      console.error('Error leaving conference:', err);
    }
    clearError();
    setPhase('lobby');
    setActiveMeetingId('');
    setRoomInviteSent(new Set());
    navigate('/video-conference', { replace: true });
  };

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch (err) {
      console.error('Error toggling screen share:', err);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const handleCopyInvite = async () => {
    if (!activeMeetingId) return;
    try {
      const inviteUrl = `${window.location.origin}/video-conference?meetingId=${activeMeetingId}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleRoomInvite = async (connectionId: string) => {
    if (!user?.id || !activeMeetingId) return;
    await sendConferenceInvite(connectionId, activeMeetingId, user.id, user.name || '', user.avatar);
    setRoomInviteSent((prev) => new Set(prev).add(connectionId));
  };

  const toggleRightPanel = (panel: RightPanel) => {
    setRightPanel((prev) => (prev === panel ? null : panel));
  };

  // Helper: look up avatar from connections by name match
  const getAvatarForParticipant = (name: string): string | undefined => {
    const match = connections.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    return match?.avatar;
  };

  // Combine local user with remote participants for display (no duplicate)
  const allParticipants = useMemo(
    () => [
      {
        id: user?.id || 'local',
        attendeeId: 'local',
        name: user?.name || 'You',
        avatar: user?.avatar,
        videoEnabled: localVideoEnabled,
        audioEnabled: localAudioEnabled,
        isLocal: true,
        isScreenSharing,
      },
      ...participants.map((p) => ({
        id: p.attendeeId,
        attendeeId: p.attendeeId,
        name: p.name,
        avatar: getAvatarForParticipant(p.name),
        videoEnabled: p.videoEnabled,
        audioEnabled: p.audioEnabled,
        isLocal: false,
        isScreenSharing: false,
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, participants, localVideoEnabled, localAudioEnabled, isScreenSharing, connections]
  );

  // Connections not yet in the call (for in-room invite)
  const invitableConnections = useMemo(() => {
    const attendeeNames = new Set(participants.map((p) => p.name.toLowerCase()));
    return connections.filter(
      (c) => !attendeeNames.has(c.name.toLowerCase())
    );
  }, [connections, participants]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ─── Render: Connecting ───

  if (phase === 'connecting') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Joining meeting...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Error ───

  if (error && phase !== 'in-meeting') {
    return (
      <>
        <Navigation />
        <div className="max-w-2xl mx-auto px-5 py-20 text-center">
          <p className="text-xl text-red-500 mb-4">Error: {error}</p>
          <button
            onClick={() => {
              setPhase('lobby');
              navigate('/video-conference', { replace: true });
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all"
          >
            Back to Lobby
          </button>
        </div>
      </>
    );
  }

  // ─── Render: Lobby ───

  if (phase === 'lobby') {
    return (
      <>
        <Navigation />
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">Video Conference</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              &larr; Back to Dashboard
            </button>
          </div>

          {/* Start / Join */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Start Conference Card */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-white text-xl">
                  +
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Start Conference</h2>
                  <p className="text-gray-500 text-sm">Create a new meeting room</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Start a new video conference. You can invite your connections before or after starting.
              </p>
              <button
                onClick={handleStartConference}
                className="w-full px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Start New Conference
              </button>
            </div>

            {/* Join Conference Card */}
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl">
                  →
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Join Conference</h2>
                  <p className="text-gray-500 text-sm">Enter a meeting ID or invite link</p>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Paste meeting ID or invite link..."
                  value={joinMeetingInput}
                  onChange={(e) => setJoinMeetingInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinConference()}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={() => handleJoinConference()}
                  disabled={!joinMeetingInput.trim()}
                  className="w-full px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  Join Conference
                </button>
              </div>
            </div>
          </div>

          {/* Invitations */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center gap-2">
              Invitations
              {invites.length > 0 && (
                <span className="px-2.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold">
                  {invites.length}
                </span>
              )}
            </h2>
            {invites.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No conference invitations right now. When someone invites you to a conference, it will appear here.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {invites.map((invite, idx) => (
                  <div
                    key={`${invite.meetingId}-${idx}`}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Avatar
                      src={invite.fromUserAvatar}
                      name={invite.fromUserName}
                      size="md"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{invite.fromUserName}</h4>
                      <p className="text-gray-500 text-sm mt-1">
                        Invited you to a conference &middot;{' '}
                        {new Date(invite.createdAt).toLocaleString()}
                      </p>
                      <p className="text-gray-400 text-xs mt-1 font-mono">
                        Meeting: {invite.meetingId.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleJoinConference(invite.meetingId)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all"
                      >
                        Join
                      </button>
                      <button
                        onClick={() => handleLobbyCopyLink(invite.meetingId)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
                      >
                        {lobbyCopyStatus[invite.meetingId] === 'copied' ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button
                        onClick={() => handleDismissInvite(invite.meetingId)}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Render: In-Meeting Room ───

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Top bar */}
      <div className="flex justify-between items-center px-6 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold">Conference</h2>
          <div className="flex items-center gap-2">
            <code className="px-2 py-1 rounded bg-gray-700 text-xs text-gray-300 hidden sm:block">
              {activeMeetingId.slice(0, 12)}...
            </code>
            <button
              onClick={handleCopyInvite}
              className="px-2 py-1 text-xs rounded bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors"
            >
              {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Failed' : 'Copy Link'}
            </button>
          </div>
        </div>
        <div className="flex gap-3 items-center text-sm text-gray-300">
          <span>{allParticipants.length} participant{allParticipants.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid + whiteboard area */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
          <div
            className={`grid gap-3 mb-4 ${
              allParticipants.length === 1
                ? 'grid-cols-1 max-w-2xl mx-auto w-full'
                : allParticipants.length <= 4
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {allParticipants.map((participant) => (
              <div
                key={participant.id}
                className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video shadow-lg"
              >
                {/* Video element must always be rendered to ensure Chime SDK can bind streams.
                    The videoTileDidUpdate callback fires asynchronously and requires the DOM element
                    to be present when the stream becomes available. */}
                <video
                  ref={(el) => {
                    if (participant.isLocal) {
                      localVideoRef.current = el;
                    } else {
                      remoteVideoRefs.current[participant.attendeeId] = el;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted={participant.isLocal}
                  className={`absolute inset-0 w-full h-full object-cover ${!participant.videoEnabled ? 'hidden' : ''}`}
                />
                {/* Avatar fallback when video is disabled */}
                {!participant.videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                    <div className="text-center">
                      <Avatar
                        src={participant.avatar}
                        name={participant.name}
                        size="xl"
                        className="mx-auto mb-2"
                      />
                      <p className="text-gray-300 text-sm">{participant.name}</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-center gap-2 text-sm">
                  <span className="font-medium truncate">{participant.name}</span>
                  {participant.isLocal && (
                    <span className="bg-purple-500/80 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                      You
                    </span>
                  )}
                  {!participant.audioEnabled && <span className="text-red-400">🔇</span>}
                  {participant.isScreenSharing && <span>🖥️</span>}
                </div>
              </div>
            ))}
          </div>

          {isWhiteboardVisible && (
            <div className="bg-white rounded-xl p-4 mt-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-800 font-bold">Whiteboard</h3>
                <button
                  onClick={() => setIsWhiteboardShared(!isWhiteboardShared)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    isWhiteboardShared
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                >
                  {isWhiteboardShared ? 'Stop Sharing' : 'Share with Attendees'}
                </button>
              </div>
              <Whiteboard
                isShared={isWhiteboardShared}
                meetingSession={meetingSession}
                localAttendeeId={localAttendeeId}
              />
            </div>
          )}
        </div>

        {/* Right sidebar panels */}
        {rightPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-base font-bold">
                {rightPanel === 'participants' && `Participants (${allParticipants.length})`}
                {rightPanel === 'chat' && 'Chat'}
                {rightPanel === 'invite' && 'Invite People'}
              </h3>
              <button
                onClick={() => setRightPanel(null)}
                className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Participants panel */}
            {rightPanel === 'participants' && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  {allParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                    >
                      <Avatar
                        src={participant.avatar}
                        name={participant.name}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <span className="truncate">{participant.name}</span>
                          {participant.isLocal && (
                            <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-xs font-semibold flex-shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-xs mt-1">
                          <span>{participant.videoEnabled ? '📹' : '📹❌'}</span>
                          <span>{participant.audioEnabled ? '🎤' : '🎤❌'}</span>
                          {participant.isScreenSharing && <span>🖥️ Sharing</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat panel */}
            {rightPanel === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-8">
                      No messages yet. Start the conversation!
                    </p>
                  )}
                  {chatMessages.map((msg: ChatMessage) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.isLocal ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-xs font-medium ${msg.isLocal ? 'text-purple-400' : 'text-gray-400'}`}>
                          {msg.isLocal ? 'You' : msg.senderName}
                        </span>
                        <span className="text-xs text-gray-600">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg max-w-[85%] text-sm break-words ${
                          msg.isLocal
                            ? 'bg-purple-600 text-white rounded-br-sm'
                            : 'bg-gray-700 text-gray-100 rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendChat} className="p-3 border-t border-gray-700 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
              </>
            )}

            {/* Invite panel */}
            {rightPanel === 'invite' && (
              <div className="flex-1 overflow-y-auto p-4">
                {/* Copy link section */}
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">Share invite link</p>
                  <div className="flex gap-2">
                    <code className="flex-1 px-2 py-1.5 bg-gray-900 rounded text-xs text-gray-300 truncate">
                      ...?meetingId={activeMeetingId.slice(0, 16)}...
                    </code>
                    <button
                      onClick={handleCopyInvite}
                      className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs font-medium transition-colors flex-shrink-0"
                    >
                      {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">
                  Your Connections
                </p>

                {invitableConnections.length === 0 && connections.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No connections to invite.
                  </p>
                )}

                {invitableConnections.length === 0 && connections.length > 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    All connections are already in the call.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {invitableConnections.map((connection) => {
                    const isSent = roomInviteSent.has(connection.id);
                    return (
                      <div
                        key={connection.id}
                        className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                      >
                        <Avatar
                          src={connection.avatar}
                          name={connection.name}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{connection.name}</p>
                        </div>
                        <button
                          onClick={() => handleRoomInvite(connection.id)}
                          disabled={isSent}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex-shrink-0 ${
                            isSent
                              ? 'bg-green-600/30 text-green-400 cursor-default'
                              : 'bg-purple-500 hover:bg-purple-600 text-white'
                          }`}
                        >
                          {isSent ? 'Sent' : 'Invite'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex justify-center items-center gap-2 sm:gap-3 px-4 py-3 bg-gray-800 border-t border-gray-700 flex-wrap">
        <button
          onClick={toggleMute}
          disabled={!meetingSession || isConnecting}
          className={`px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
            !meetingSession || isConnecting
              ? 'bg-gray-600 cursor-not-allowed opacity-60'
              : localAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-500 hover:bg-red-600'
          } text-white`}
        >
          {localAudioEnabled ? '🎤 Mute' : '🔇 Unmute'}
        </button>
        <button
          onClick={toggleVideo}
          disabled={!meetingSession || isConnecting}
          className={`px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
            !meetingSession || isConnecting
              ? 'bg-gray-600 cursor-not-allowed opacity-60'
              : localVideoEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-500 hover:bg-red-600'
          } text-white`}
        >
          {localVideoEnabled ? '📹 Stop Video' : '📹 Start Video'}
        </button>
        <button
          onClick={handleScreenShare}
          disabled={!meetingSession || isConnecting}
          className={`px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
            !meetingSession || isConnecting
              ? 'bg-gray-600 cursor-not-allowed opacity-60'
              : isScreenSharing
                ? 'bg-purple-500 hover:bg-purple-600'
                : 'bg-gray-700 hover:bg-gray-600'
          } text-white`}
        >
          {isScreenSharing ? '🖥️ Stop Sharing' : '🖥️ Share Screen'}
        </button>
        <button
          onClick={() => setIsWhiteboardVisible(!isWhiteboardVisible)}
          className={`px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
            isWhiteboardVisible
              ? 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white`}
        >
          {isWhiteboardVisible ? '✏️ Hide Board' : '✏️ Whiteboard'}
        </button>

        <div className="w-px h-8 bg-gray-600 hidden sm:block" />

        <button
          onClick={() => toggleRightPanel('participants')}
          className={`px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
            rightPanel === 'participants'
              ? 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white`}
        >
          👥 Participants
        </button>
        <button
          onClick={() => toggleRightPanel('chat')}
          className={`px-4 py-2.5 rounded-lg font-medium transition-colors text-sm relative ${
            rightPanel === 'chat'
              ? 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white`}
        >
          💬 Chat
          {chatMessages.length > 0 && rightPanel !== 'chat' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-full" />
          )}
        </button>
        <button
          onClick={() => toggleRightPanel('invite')}
          className={`px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
            rightPanel === 'invite'
              ? 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white`}
        >
          🔗 Invite
        </button>

        <div className="w-px h-8 bg-gray-600 hidden sm:block" />

        <button
          onClick={handleLeaveConference}
          className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
        >
          📞 Leave
        </button>
      </div>
    </div>
  );
}
