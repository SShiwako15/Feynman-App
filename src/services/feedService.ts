const BACKEND_ENDPOINT = import.meta.env.VITE_CHIME_BACKEND_ENDPOINT;

export interface StudyPost {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  subject: string;
  message?: string;
  createdAt: string;
}

interface CreatePostInput {
  userId: string;
  authorName: string;
  authorAvatar?: string;
  subject: string;
  message?: string;
  isSubjectUpdate?: boolean;
}

const getBaseUrl = () => {
  if (!BACKEND_ENDPOINT) {
    console.error('Backend endpoint is not configured (VITE_CHIME_BACKEND_ENDPOINT). Study feed features are disabled.');
    return null;
  }

  return `${BACKEND_ENDPOINT}/feed`;
};

export async function fetchFeed(viewerId: string, connectionIds: string[]): Promise<StudyPost[]> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return [];

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'query',
        viewerId,
        connectionIds,
      }),
    });

    if (!response.ok) {
      console.error('Failed to fetch study feed:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.posts)) {
      console.error('Unexpected feed response shape', data);
      return [];
    }

    // Normalize posts: map postId to id to match StudyPost interface
    const posts = data.posts.map((post: any) => ({
      ...post,
      id: post.postId || post.id, // Use postId from backend, fallback to id if present
    })) as StudyPost[];

    // Posts should already be sorted by the backend, but ensure newest first
    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching study feed:', error);
    return [];
  }
}

export async function createStudyPost(input: CreatePostInput): Promise<StudyPost | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        ...input,
      }),
    });

    if (!response.ok) {
      console.error('Failed to create study post:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    if (!data || !data.post) {
      console.error('Unexpected create post response shape', data);
      return null;
    }

    // Normalize post: map postId to id to match StudyPost interface
    const post = {
      ...data.post,
      id: data.post.postId || data.post.id, // Use postId from backend, fallback to id if present
    } as StudyPost;

    return post;
  } catch (error) {
    console.error('Error creating study post:', error);
    return null;
  }
}

export async function createSubjectUpdatePost(
  userId: string,
  authorName: string,
  authorAvatar: string | undefined,
  subject: string
): Promise<void> {
  if (!subject.trim()) return;

  await createStudyPost({
    userId,
    authorName,
    authorAvatar,
    subject: subject.trim(),
    isSubjectUpdate: true,
  });
}


