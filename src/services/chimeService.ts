import {
  DefaultMeetingSession,
  MeetingSessionConfiguration,
  ConsoleLogger,
  LogLevel,
  DefaultDeviceController,
} from 'amazon-chime-sdk-js';
import { getCurrentUser } from 'aws-amplify/auth';

const BACKEND_ENDPOINT = import.meta.env.VITE_CHIME_BACKEND_ENDPOINT;

export interface MeetingInfo {
  Meeting: {
    MeetingId: string;
    MediaPlacement: {
      AudioHostUrl: string;
      AudioFallbackUrl: string;
      ScreenDataUrl: string;
      ScreenSharingUrl: string;
      ScreenViewingUrl: string;
      SignalingUrl: string;
      TurnControlUrl: string;
    };
    MediaRegion: string;
  };
  Attendee: {
    AttendeeId: string;
    ExternalUserId: string;
    JoinToken: string;
  };
}

class ChimeService {
  private meetingSession: DefaultMeetingSession | null = null;
  private logger: ConsoleLogger;
  private deviceController: DefaultDeviceController | null = null;

  constructor() {
    this.logger = new ConsoleLogger('ChimeSDK', LogLevel.INFO);
  }

  /**
   * Create or join a meeting
   * @param meetingId
   * @param attendeeName
   */
  async createOrJoinMeeting(meetingId?: string, attendeeName?: string): Promise<MeetingInfo> {
    try {
      const user = await getCurrentUser();
      const userName = attendeeName || user.username || 'User';

      const response = await fetch(`${BACKEND_ENDPOINT}/chime/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId,
          attendeeName: userName,
          userId: user.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create/join meeting: ${response.statusText}`);
      }

      const meetingInfo: MeetingInfo = await response.json();
      return meetingInfo;
    } catch (error) {
      console.error('Error creating/joining meeting:', error);
      throw error;
    }
  }

  async initializeMeetingSession(meetingInfo: MeetingInfo): Promise<DefaultMeetingSession> {
    try {
      const configuration = new MeetingSessionConfiguration(meetingInfo.Meeting, meetingInfo.Attendee);

      // Create device controller
      this.deviceController = new DefaultDeviceController(this.logger);

      // Create meeting session
      this.meetingSession = new DefaultMeetingSession(
        configuration,
        this.logger,
        this.deviceController
      );

      return this.meetingSession;
    } catch (error) {
      console.error('Error initializing meeting session:', error);
      throw error;
    }
  }


  getMeetingSession(): DefaultMeetingSession | null {
    return this.meetingSession;
  }


  async listAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (!this.deviceController) {
        throw new Error('Device controller not initialized');
      }
      return await this.deviceController.listAudioInputDevices();
    } catch (error) {
      console.error('Error listing audio input devices:', error);
      return [];
    }
  }

  async listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (!this.deviceController) {
        throw new Error('Device controller not initialized');
      }
      return await this.deviceController.listVideoInputDevices();
    } catch (error) {
      console.error('Error listing video input devices:', error);
      return [];
    }
  }


  async startVideoInput(deviceId?: string): Promise<void> {
    try {
      if (!this.meetingSession) {
        throw new Error('Meeting session not initialized');
      }

      const videoInputDevices = await this.listVideoInputDevices();
      const chosenDeviceId =
        deviceId ?? (videoInputDevices[0] ? videoInputDevices[0].deviceId : undefined);

      if (!chosenDeviceId) {
        throw new Error('No video input device available');
      }

      const audioVideo = this.meetingSession.audioVideo as any;
      await audioVideo.startVideoInput(chosenDeviceId);
    } catch (error) {
      console.error('Error starting video input:', error);
      throw error;
    }
  }


  async startScreenShare(): Promise<void> {
    try {
      if (!this.meetingSession) {
        throw new Error('Meeting session not initialized');
      }

      // Stop current video input first
      this.meetingSession.audioVideo.stopLocalVideoTile();

      const screenShareStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        } as MediaTrackConstraints,
        audio: true,
      });

      const videoTrack = screenShareStream.getVideoTracks()[0];
      const screenStream = new MediaStream([videoTrack]);
      const audioVideo = this.meetingSession.audioVideo as any;
      await audioVideo.startVideoInput(screenStream);
      audioVideo.startLocalVideoTile();

      // Handle when user stops sharing
      videoTrack.onended = async () => {
        await this.stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }


  async stopScreenShare(): Promise<void> {
    try {
      if (!this.meetingSession) {
        return;
      }

      await this.startVideoInput();
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }


  async toggleMute(): Promise<boolean> {
    try {
      if (!this.meetingSession) {
        throw new Error('Meeting session not initialized');
      }

      const audioVideo = this.meetingSession.audioVideo as any;
      const currentlyMuted = audioVideo.realtimeIsLocalAudioMuted();

      if (currentlyMuted) {
        audioVideo.realtimeUnmuteLocalAudio();
      } else {
        audioVideo.realtimeMuteLocalAudio();
      }

      return !currentlyMuted;
    } catch (error) {
      console.error('Error toggling mute:', error);
      throw error;
    }
  }


  async toggleVideo(): Promise<boolean> {
    try {
      if (!this.meetingSession) {
        throw new Error('Meeting session not initialized');
      }

      const isVideoEnabled = this.meetingSession.audioVideo.hasStartedLocalVideoTile();
      if (isVideoEnabled) {
        this.meetingSession.audioVideo.stopLocalVideoTile();
      } else {
        await this.startVideoInput();
        this.meetingSession.audioVideo.startLocalVideoTile();
      }
      return !isVideoEnabled;
    } catch (error) {
      console.error('Error toggling video:', error);
      throw error;
    }
  }


  async leaveMeeting(): Promise<void> {
    try {
      if (this.meetingSession) {
        this.meetingSession.audioVideo.stop();
        this.meetingSession = null;
      }

      if (this.deviceController) {
        this.deviceController.destroy();
        this.deviceController = null;
      }
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  }

  getSession(): DefaultMeetingSession | null {
    return this.meetingSession;
  }
}

export default new ChimeService();

