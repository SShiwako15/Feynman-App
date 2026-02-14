import { useState, useEffect, useRef, useCallback } from 'react';
import { DefaultMeetingSession } from 'amazon-chime-sdk-js';
import chimeService from '../services/chimeService';
import type { MeetingInfo } from '../services/chimeService';

export interface ChimeParticipant {
  attendeeId: string;
  externalUserId: string;
  name: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  videoStream?: MediaStream;
}

export interface ChatMessage {
  id: string;
  senderAttendeeId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
}

export interface UseChimeMeetingReturn {
  meetingSession: DefaultMeetingSession | null;
  participants: ChimeParticipant[];
  localVideoEnabled: boolean;
  localAudioEnabled: boolean;
  isScreenSharing: boolean;
  isConnecting: boolean;
  error: string | null;
  localAttendeeId: string | null;
  chatMessages: ChatMessage[];
  joinMeeting: (meetingId?: string, attendeeName?: string) => Promise<void>;
  leaveMeeting: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  bindVideoElement: (tileId: number, videoElement: HTMLVideoElement | null) => void;
  unbindVideoElement: (tileId: number) => void;
  sendChatMessage: (text: string) => void;
  clearError: () => void;
}

export const useChimeMeeting = (): UseChimeMeetingReturn => {
  const [meetingSession, setMeetingSession] = useState<DefaultMeetingSession | null>(null);
  const [participants, setParticipants] = useState<ChimeParticipant[]>([]);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAttendeeId, setLocalAttendeeId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const videoElementMap = useRef<Map<number, HTMLVideoElement>>(new Map());
  const participantMap = useRef<Map<string, ChimeParticipant>>(new Map());
  const localAttendeeIdRef = useRef<string | null>(null);
  const localNameRef = useRef<string>('You');

  // Setup meeting session observers
  const setupObservers = useCallback((session: DefaultMeetingSession) => {
    const audioVideo = session.audioVideo as any;

    // Video tile observer
    audioVideo.addObserver({
      videoTileDidUpdate: (tileState: any) => {
        const videoElement = videoElementMap.current.get(tileState.tileId);
        
        if (videoElement && tileState.boundVideoStream) {
          videoElement.srcObject = tileState.boundVideoStream;
        }

        if (tileState.localTile) {
          setLocalVideoEnabled(!!tileState.boundVideoStream);
        } else {
          // Remote video tile
          const attendeeId = tileState.attendeeId;
          const participant = participantMap.current.get(attendeeId);
          if (participant) {
            participant.videoEnabled = !!tileState.boundVideoStream;
            participant.videoStream = tileState.boundVideoStream;
            setParticipants(Array.from(participantMap.current.values()));
          }
        }
      },
      videoTileWasRemoved: (tileId: number) => {
        const videoElement = videoElementMap.current.get(tileId);
        if (videoElement) {
          videoElement.srcObject = null;
          videoElementMap.current.delete(tileId);
        }

        const localTile = audioVideo.getLocalVideoTile();
        if (localTile && tileId === localTile.state().tileId) {
          setLocalVideoEnabled(false);
        }
      },
    });

    // Attendee presence — skip the local attendee to avoid duplicate
    audioVideo.realtimeSubscribeToAttendeeIdPresence(
      (attendeeId: string, present: boolean, externalUserId?: string) => {
        // Skip local attendee — they are rendered separately in the UI
        if (attendeeId === localAttendeeIdRef.current) return;

        if (present) {
          const participant: ChimeParticipant = {
            attendeeId,
            externalUserId: externalUserId || attendeeId,
            name: (externalUserId || attendeeId).split('@')[0] || 'User',
            videoEnabled: false,
            audioEnabled: true,
          };
          participantMap.current.set(attendeeId, participant);
        } else {
          participantMap.current.delete(attendeeId);
        }
        setParticipants(Array.from(participantMap.current.values()));
      }
    );

    // Chat data messages
    audioVideo.realtimeSubscribeToReceiveDataMessage(
      'chat',
      (dataMessage: any) => {
        try {
          const payload = JSON.parse(new TextDecoder().decode(dataMessage.data));
          const msg: ChatMessage = {
            id: `${dataMessage.senderAttendeeId}-${Date.now()}-${Math.random()}`,
            senderAttendeeId: dataMessage.senderAttendeeId,
            senderName: payload.senderName || 'Unknown',
            text: payload.text || '',
            timestamp: dataMessage.timestampMs || Date.now(),
            isLocal: dataMessage.senderAttendeeId === localAttendeeIdRef.current,
          };
          setChatMessages((prev) => [...prev, msg]);
        } catch (e) {
          console.error('Error parsing chat message:', e);
        }
      }
    );
  }, []);

  // Send a chat message via Chime data messaging
  const sendChatMessage = useCallback(
    (text: string) => {
      if (!meetingSession || !text.trim()) return;

      const audioVideo = meetingSession.audioVideo as any;
      const payload = JSON.stringify({
        senderName: localNameRef.current,
        text: text.trim(),
      });

      try {
        audioVideo.realtimeSendDataMessage('chat', payload);

        // Also add the message locally since realtimeSendDataMessage
        // does not echo back to the sender via the subscription
        const localMsg: ChatMessage = {
          id: `local-${Date.now()}-${Math.random()}`,
          senderAttendeeId: localAttendeeIdRef.current || 'local',
          senderName: localNameRef.current,
          text: text.trim(),
          timestamp: Date.now(),
          isLocal: true,
        };
        setChatMessages((prev) => [...prev, localMsg]);
      } catch (err) {
        console.error('Error sending chat message:', err);
      }
    },
    [meetingSession]
  );

  // Join meeting
  const joinMeeting = useCallback(async (meetingId?: string, attendeeName?: string) => {
    try {
      setIsConnecting(true);
      setError(null);

      // Create or join meeting
      const meetingInfo: MeetingInfo = await chimeService.createOrJoinMeeting(meetingId, attendeeName);

      // Store local attendee ID to prevent duplicate in participant list
      const myAttendeeId = meetingInfo.Attendee.AttendeeId;
      localAttendeeIdRef.current = myAttendeeId;
      setLocalAttendeeId(myAttendeeId);
      localNameRef.current = attendeeName || 'You';

      // Initialize meeting session
      const session = await chimeService.initializeMeetingSession(meetingInfo);
      setMeetingSession(session);

      // Setup observers
      setupObservers(session);

      // Start audio (let Chime/browser use default devices; we'll enable video on demand)
      await session.audioVideo.start();

      // We'll start local video only when the user explicitly toggles it
      setLocalVideoEnabled(false);
      setLocalAudioEnabled(true);
    } catch (err: any) {
      console.error('Error joining meeting:', err);
      setError(err.message || 'Failed to join meeting');
    } finally {
      setIsConnecting(false);
    }
  }, [setupObservers]);

  // Leave meeting
  const leaveMeeting = useCallback(async () => {
    try {
      await chimeService.leaveMeeting();
      setMeetingSession(null);
      setParticipants([]);
      setLocalVideoEnabled(false);
      setLocalAudioEnabled(false);
      setIsScreenSharing(false);
      setLocalAttendeeId(null);
      setChatMessages([]);
      localAttendeeIdRef.current = null;
      participantMap.current.clear();
    } catch (err: any) {
      console.error('Error leaving meeting:', err);
      setError(err.message || 'Failed to leave meeting');
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    try {
      if (!meetingSession) return;

      const audioVideo = meetingSession.audioVideo as any;
      const currentlyMuted = audioVideo.realtimeIsLocalAudioMuted();

      if (currentlyMuted) {
        audioVideo.realtimeUnmuteLocalAudio();
      } else {
        audioVideo.realtimeMuteLocalAudio();
      }

      setLocalAudioEnabled(!currentlyMuted);
    } catch (err: any) {
      console.error('Error toggling mute:', err);
      setError(err.message || 'Failed to toggle mute');
    }
  }, [meetingSession]);

  // Clear error (e.g. when returning to lobby)
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Toggle video (start/stop local camera)
  const toggleVideo = useCallback(async () => {
    try {
      if (!meetingSession) return;

      const audioVideo = meetingSession.audioVideo as any;
      const isVideoEnabled = audioVideo.hasStartedLocalVideoTile();

      if (isVideoEnabled) {
        audioVideo.stopLocalVideoTile();
        setLocalVideoEnabled(false);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        await audioVideo.startVideoInput(stream);
        audioVideo.startLocalVideoTile();
        setLocalVideoEnabled(true);
      }
    } catch (err: any) {
      console.error('Error toggling video:', err);
      // Don't set global error for camera issues — user can still participate
      // in the meeting without video. The global error would cause them to be
      // kicked to the error page when leaving.
    }
  }, [meetingSession]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    try {
      if (!meetingSession) return;

      const audioVideo = meetingSession.audioVideo as any;
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      await audioVideo.startVideoInput(screenStream);
      audioVideo.startLocalVideoTile();
      setIsScreenSharing(true);
    } catch (err: any) {
      console.error('Error starting screen share:', err);
      setError(err.message || 'Failed to start screen share');
    }
  }, [meetingSession]);

  // Stop screen share (and stop local video)
  const stopScreenShare = useCallback(async () => {
    try {
      if (!meetingSession) return;

      const audioVideo = meetingSession.audioVideo as any;
      audioVideo.stopLocalVideoTile();
      setIsScreenSharing(false);
      setLocalVideoEnabled(false);
    } catch (err: any) {
      console.error('Error stopping screen share:', err);
      setError(err.message || 'Failed to stop screen share');
    }
  }, [meetingSession]);

  // Bind video element to tile
  const bindVideoElement = useCallback((tileId: number, videoElement: HTMLVideoElement | null) => {
    if (videoElement) {
      videoElementMap.current.set(tileId, videoElement);
      if (meetingSession) {
        meetingSession.audioVideo.bindVideoElement(tileId, videoElement);
      }
    } else {
      videoElementMap.current.delete(tileId);
      if (meetingSession) {
        meetingSession.audioVideo.unbindVideoElement(tileId);
      }
    }
  }, [meetingSession]);

  // Unbind video element
  const unbindVideoElement = useCallback((tileId: number) => {
    videoElementMap.current.delete(tileId);
    if (meetingSession) {
      meetingSession.audioVideo.unbindVideoElement(tileId);
    }
  }, [meetingSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meetingSession) {
        chimeService.leaveMeeting();
      }
    };
  }, [meetingSession]);

  return {
    meetingSession,
    participants,
    localVideoEnabled,
    localAudioEnabled,
    isScreenSharing,
    isConnecting,
    error,
    localAttendeeId,
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
  };
};

// Export refs helper
export const useChimeVideoRefs = () => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const setLocalVideoRef = (ref: HTMLVideoElement | null) => {
    localVideoRef.current = ref;
  };

  const setRemoteVideoRef = (attendeeId: string, ref: HTMLVideoElement | null) => {
    remoteVideoRefs.current[attendeeId] = ref;
  };

  return {
    localVideoRef,
    remoteVideoRefs,
    setLocalVideoRef,
    setRemoteVideoRef,
  };
};
