const BACKEND_ENDPOINT = import.meta.env.VITE_CHIME_BACKEND_ENDPOINT;

export interface RemoteUser {
  id: string;
  name: string;
  email: string;
  subject?: string;
  avatar?: string;
}


export async function searchUsersApi(query: string): Promise<RemoteUser[]> {
  if (!query.trim()) return [];

  if (!BACKEND_ENDPOINT) {
    console.error('Chime backend endpoint is not set');
    return [];
  }

  try {
    const url = `${BACKEND_ENDPOINT}/users?query=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to search users:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.users)) {
      console.error('Unexpected users response shape', data);
      return [];
    }

    return data.users as RemoteUser[];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}


