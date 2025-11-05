import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Whiteboard from '../components/Whiteboard';

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isHost: boolean;
  isScreenSharing: boolean;
}

export default function VideoConference() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
  const [isWhiteboardShared, setIsWhiteboardShared] = useState(false);
  const [isHost] = useState(true); // First user is host

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    // Initialize local video stream
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Add self as participant
        const selfParticipant: Participant = {
          id: user?.id || 'self',
          name: user?.name || 'You',
          stream,
          isHost,
          isScreenSharing: false,
        };
        setParticipants([selfParticipant]);
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    initLocalStream();

    return () => {
      // Cleanup
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing and return to camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);

        // Handle end of screen share
        stream.getVideoTracks()[0].onended = () => {
          handleScreenShare();
        };
      }
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  const handleLeaveConference = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    navigate('/dashboard');
  };

  const handleToggleWhiteboard = () => {
    setIsWhiteboardVisible(!isWhiteboardVisible);
  };

  const handleShareWhiteboard = () => {
    if (isHost) {
      setIsWhiteboardShared(!isWhiteboardShared);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <div className="flex justify-between items-center px-8 py-5 bg-gray-800 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Video Conference</h1>
        <div className="flex gap-5 items-center">
          <span>Participants: {participants.length}</span>
          {isHost && (
            <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold">
              Host
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col p-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video"
              >
                <video
                  ref={(el) => {
                    remoteVideoRefs.current[participant.id] = el;
                  }}
                  autoPlay
                  playsInline
                  muted={participant.id === user?.id}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center gap-2 text-sm">
                  <span>{participant.name}</span>
                  {participant.isHost && <span>👑</span>}
                  {participant.isScreenSharing && <span>🖥️</span>}
                </div>
              </div>
            ))}
          </div>

          {isWhiteboardVisible && (
            <div className="bg-white rounded-lg p-4 mt-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-800 font-bold">Whiteboard</h3>
                {isHost && (
                  <button
                    onClick={handleShareWhiteboard}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isWhiteboardShared
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {isWhiteboardShared ? 'Stop Sharing' : 'Share with Attendees'}
                  </button>
                )}
              </div>
              <Whiteboard isShared={isWhiteboardShared} />
            </div>
          )}
        </div>

        <div className="w-72 bg-gray-800 border-l border-gray-700 p-5 overflow-y-auto">
          <h3 className="text-lg font-bold mb-5">Participants ({participants.length})</h3>
          <div className="flex flex-col gap-3">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    {participant.name}
                    {participant.isHost && (
                      <span className="bg-yellow-500 text-black px-2 py-0.5 rounded-full text-xs font-semibold">
                        Host
                      </span>
                    )}
                  </div>
                  {participant.isScreenSharing && (
                    <div className="text-gray-400 text-sm mt-1">Sharing screen</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4 p-5 bg-gray-800 border-t border-gray-700">
        <button
          onClick={handleScreenShare}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isScreenSharing
              ? 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white`}
        >
          {isScreenSharing ? '🖥️ Stop Sharing' : '🖥️ Share Screen'}
        </button>
        <button
          onClick={handleToggleWhiteboard}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isWhiteboardVisible
              ? 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white`}
        >
          {isWhiteboardVisible ? '✏️ Hide Whiteboard' : '✏️ Show Whiteboard'}
        </button>
        <button
          onClick={handleLeaveConference}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
        >
          📞 Leave Conference
        </button>
      </div>
    </div>
  );
}