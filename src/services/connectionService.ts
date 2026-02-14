const BACKEND_ENDPOINT = import.meta.env.VITE_CHIME_BACKEND_ENDPOINT;

export interface ConnectionRequest {
  requestId: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  toUserName?: string;
  toUserAvatar?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Connection {
  id: string;
  name: string;
  email: string;
  subject?: string;
  avatar?: string;
}

const getBaseUrl = () => {
  if (!BACKEND_ENDPOINT) {
    console.error('Backend endpoint is not configured (VITE_CHIME_BACKEND_ENDPOINT). Connection features are disabled.');
    return null;
  }
  return `${BACKEND_ENDPOINT}/connections`;
};

export async function sendConnectionRequest(
  toUserId: string,
  fromUserId: string,
  fromUserName: string,
  fromUserAvatar?: string
): Promise<ConnectionRequest | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  const requestBody = {
    toUserId,
    fromUserId,
    fromUserName,
    fromUserAvatar,
  };

  try {
    const response = await fetch(`${baseUrl}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send connection request:', response.status, response.statusText, errorText);
      return null;
    }

    const data = await response.json();
    return data.request as ConnectionRequest;
  } catch (error) {
    console.error('Error sending connection request:', error);
    return null;
  }
}

export async function getConnectionRequests(
  userId: string,
  type?: 'sent' | 'received' | 'all'
): Promise<ConnectionRequest[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return [];

  try {
    const url = type
      ? `${baseUrl}/requests?userId=${encodeURIComponent(userId)}&type=${type}`
      : `${baseUrl}/requests?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('Failed to fetch connection requests:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.requests)) {
      console.error('Unexpected requests response shape', data);
      return [];
    }

    return data.requests as ConnectionRequest[];
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    return [];
  }
}

export async function acceptConnectionRequest(requestId: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return false;

  try {
    const response = await fetch(`${baseUrl}/requests/${requestId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
      console.error('Failed to accept connection request:', response.status, response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error accepting connection request:', error);
    return false;
  }
}

export async function rejectConnectionRequest(requestId: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return false;

  try {
    const response = await fetch(`${baseUrl}/requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
      console.error('Failed to reject connection request:', response.status, response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error rejecting connection request:', error);
    return false;
  }
}

export async function cancelConnectionRequest(requestId: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return false;

  try {
    const response = await fetch(`${baseUrl}/requests/${requestId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId }),
    });

    if (!response.ok) {
      console.error('Failed to cancel connection request:', response.status, response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error cancelling connection request:', error);
    return false;
  }
}

export async function getAcceptedConnections(userId: string): Promise<Connection[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return [];

  try {
    const response = await fetch(`${baseUrl}?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('Failed to fetch connections:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.connections)) {
      console.error('Unexpected connections response shape', data);
      return [];
    }

    return data.connections as Connection[];
  } catch (error) {
    console.error('Error fetching connections:', error);
    return [];
  }
}

/**
 * Remove a connection between the current user and a connection.
 * @param currentUserId - the logged-in user's ID
 * @param connectionId - the ID of the connection to remove
 */
export async function removeConnection(currentUserId: string, connectionId: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return false;

  try {
    const response = await fetch(
      `${baseUrl}/${encodeURIComponent(currentUserId)}?connectionId=${encodeURIComponent(connectionId)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      console.error('Failed to remove connection:', response.status, response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing connection:', error);
    return false;
  }
}
