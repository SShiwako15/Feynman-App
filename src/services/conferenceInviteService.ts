const BACKEND_ENDPOINT = import.meta.env.VITE_CHIME_BACKEND_ENDPOINT;

export interface ConferenceInvite {
  meetingId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  createdAt: string;
}

const getBaseUrl = () => {
  if (!BACKEND_ENDPOINT) {
    console.error('Backend endpoint is not configured (VITE_CHIME_BACKEND_ENDPOINT). Conference invite features are disabled.');
    return null;
  }
  return `${BACKEND_ENDPOINT}/conference-invites`;
};


export async function sendConferenceInvite(
  toUserId: string,
  meetingId: string,
  fromUserId: string,
  fromUserName: string,
  fromUserAvatar?: string
): Promise<void> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return;

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId, meetingId, fromUserId, fromUserName, fromUserAvatar }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send conference invite:', response.status, errorText);
    }
  } catch (err) {
    console.error('Error sending conference invite:', err);
  }
}


export async function getConferenceInvites(userId: string): Promise<ConferenceInvite[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return [];

  try {
    const response = await fetch(`${baseUrl}?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.invites || []) as ConferenceInvite[];
  } catch (err) {
    console.error('Error getting conference invites:', err);
    return [];
  }
}


export async function clearConferenceInvite(userId: string, meetingId: string): Promise<void> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return;

  try {
    await fetch(`${baseUrl}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, meetingId }),
    });
  } catch (err) {
    console.error('Error dismissing conference invite:', err);
  }
}

//Remove all invitations for a specific meeting across all users
//Called when a conference is closed / has no participants left
export async function clearInvitesByMeetingId(meetingId: string): Promise<void> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return;

  try {
    await fetch(`${baseUrl}/clear-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    });
  } catch (err) {
    console.error('Error clearing meeting invites:', err);
  }
}
