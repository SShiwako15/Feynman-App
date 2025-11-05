import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConnections } from '../contexts/ConnectionsContext';
import Whiteboard from '../components/Whiteboard';
import '../styles/VideoConference.css';

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isHost: boolean;
  isScreenSharing: boolean;
}

export default function VideoConference() {
  const { user } = useAuth();
  const { connections } = useConnections();
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
    <div className="video-conference-container">
      <div className="conference-header">
        <h1>Video Conference</h1>
        <div className="conference-info">
          <span>Participants: {participants.length}</span>
          {isHost && <span className="host-badge">Host</span>}
        </div>
      </div>

      <div className="conference-main">
        <div className="video-section">
          <div className="video-grid">
            {participants.map((participant) => (
              <div key={participant.id} className="video-participant">
                <video
                  ref={(el) => {
                    remoteVideoRefs.current[participant.id] = el;
                  }}
                  autoPlay
                  playsInline
                  muted={participant.id === user?.id}
                  className="video-element"
                />
                <div className="participant-info">
                  <span>{participant.name}</span>
                  {participant.isHost && <span className="host-indicator">👑</span>}
                  {participant.isScreenSharing && (
                    <span className="screen-share-indicator">🖥️</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isWhiteboardVisible && (
            <div className="whiteboard-section">
              <div className="whiteboard-header">
                <h3>Whiteboard</h3>
                {isHost && (
                  <button
                    onClick={handleShareWhiteboard}
                    className={`share-whiteboard-btn ${isWhiteboardShared ? 'active' : ''}`}
                  >
                    {isWhiteboardShared ? 'Stop Sharing' : 'Share with Attendees'}
                  </button>
                )}
              </div>
              <Whiteboard isShared={isWhiteboardShared} />
            </div>
          )}
        </div>

        <div className="participants-sidebar">
          <h3>Participants ({participants.length})</h3>
          <div className="participants-list">
            {participants.map((participant) => (
              <div key={participant.id} className="participant-item">
                <div className="avatar-small">{participant.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="participant-name">
                    {participant.name}
                    {participant.isHost && <span className="host-badge-small">Host</span>}
                  </div>
                  {participant.isScreenSharing && (
                    <div className="screen-share-text">Sharing screen</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="conference-controls">
        <button onClick={handleScreenShare} className={`control-btn ${isScreenSharing ? 'active' : ''}`}>
          {isScreenSharing ? '🖥️ Stop Sharing' : '🖥️ Share Screen'}
        </button>
        <button onClick={handleToggleWhiteboard} className={`control-btn ${isWhiteboardVisible ? 'active' : ''}`}>
          {isWhiteboardVisible ? '✏️ Hide Whiteboard' : '✏️ Show Whiteboard'}
        </button>
        <button onClick={handleLeaveConference} className="control-btn leave-btn">
          📞 Leave Conference
        </button>
      </div>
    </div>
  );
}