import { useEffect, useRef, useState } from 'react';
import type { DefaultMeetingSession } from 'amazon-chime-sdk-js';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

interface WhiteboardProps {
  isShared?: boolean;
  meetingSession: DefaultMeetingSession | null;
  localAttendeeId: string | null;
}

interface WhiteboardDiffPayload {
  kind: 'diff';
  senderAttendeeId: string;
  diff: {
    added: Record<string, unknown>;
    updated: Record<string, [unknown, unknown]>;
    removed: Record<string, unknown>;
  };
}

interface WhiteboardChunkPayload {
  kind: 'chunk';
  senderAttendeeId: string;
  messageId: string;
  chunkIndex: number;
  totalChunks: number;
  chunk: string;
}

const DATA_TOPIC = 'whiteboard';
const MAX_MESSAGE_BYTES = 1900;
const MAX_CHUNK_DATA_BYTES = 1100;
const FLUSH_INTERVAL_MS = 120;
const CHUNK_TTL_MS = 15000;

const textEncoder = new TextEncoder();

const emptyDiff = () => ({
  added: {} as Record<string, unknown>,
  updated: {} as Record<string, [unknown, unknown]>,
  removed: {} as Record<string, unknown>,
});

const sizeInBytes = (value: string) => textEncoder.encode(value).length;

const splitByByteSize = (value: string, maxBytes: number): string[] => {
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const char of value) {
    const charBytes = sizeInBytes(char);
    if (currentBytes + charBytes > maxBytes && current) {
      parts.push(current);
      current = char;
      currentBytes = charBytes;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }

  if (current) parts.push(current);
  return parts;
};

const mergeDiff = (
  target: ReturnType<typeof emptyDiff>,
  incoming: {
    added?: Record<string, unknown>;
    updated?: Record<string, [unknown, unknown]>;
    removed?: Record<string, unknown>;
  }
) => {
  Object.entries(incoming.removed || {}).forEach(([id, record]) => {
    delete target.added[id];
    delete target.updated[id];
    target.removed[id] = record;
  });

  Object.entries(incoming.added || {}).forEach(([id, record]) => {
    delete target.removed[id];
    delete target.updated[id];
    target.added[id] = record;
  });

  Object.entries(incoming.updated || {}).forEach(([id, pair]) => {
    delete target.removed[id];
    if (target.added[id]) {
      target.added[id] = pair[1];
    } else {
      target.updated[id] = pair;
    }
  });
};

export default function Whiteboard({
  isShared = false,
  meetingSession,
  localAttendeeId,
}: WhiteboardProps) {
  const editorRef = useRef<any>(null);
  const [editorReady, setEditorReady] = useState(false);
  const applyingRemoteDiffRef = useRef(false);
  const isSharedRef = useRef(isShared);
  const pendingDiffRef = useRef<ReturnType<typeof emptyDiff>>(emptyDiff());
  const flushTimerRef = useRef<number | null>(null);
  const incomingChunksRef = useRef<
    Map<string, { createdAt: number; totalChunks: number; parts: string[] }>
  >(new Map());

  useEffect(() => {
    isSharedRef.current = isShared;
  }, [isShared]);

  useEffect(() => {
    if (!meetingSession || !editorRef.current || !editorReady) return;

    const audioVideo = meetingSession.audioVideo as any;
    const store = editorRef.current.store;

    const sendPayload = (payload: WhiteboardDiffPayload) => {
      const raw = JSON.stringify(payload);
      if (sizeInBytes(raw) <= MAX_MESSAGE_BYTES) {
        audioVideo.realtimeSendDataMessage(DATA_TOPIC, raw);
        return;
      }

      const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const chunks = splitByByteSize(raw, MAX_CHUNK_DATA_BYTES);

      chunks.forEach((chunk, chunkIndex) => {
        const envelope: WhiteboardChunkPayload = {
          kind: 'chunk',
          senderAttendeeId: payload.senderAttendeeId,
          messageId,
          chunkIndex,
          totalChunks: chunks.length,
          chunk,
        };
        audioVideo.realtimeSendDataMessage(DATA_TOPIC, JSON.stringify(envelope));
      });
    };

    const flushPendingDiff = () => {
      flushTimerRef.current = null;
      if (!localAttendeeId || !isSharedRef.current) return;

      const diffToSend = pendingDiffRef.current;
      if (
        Object.keys(diffToSend.added).length === 0 &&
        Object.keys(diffToSend.updated).length === 0 &&
        Object.keys(diffToSend.removed).length === 0
      ) {
        return;
      }

      pendingDiffRef.current = emptyDiff();
      try {
        sendPayload({
          kind: 'diff',
          senderAttendeeId: localAttendeeId,
          diff: diffToSend,
        });
      } catch (error) {
        console.error('Failed to send whiteboard update:', error);
      }
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current !== null) return;
      flushTimerRef.current = window.setTimeout(flushPendingDiff, FLUSH_INTERVAL_MS);
    };

    const publishLocalDiff = (entry: any) => {
      if (!localAttendeeId || !isSharedRef.current || applyingRemoteDiffRef.current) return;
      mergeDiff(pendingDiffRef.current, entry.changes || {});
      scheduleFlush();
    };

    const applyDiff = (payload: WhiteboardDiffPayload) => {
      const addedRecords = Object.values(payload.diff.added || {}) as any[];
      const updatedRecords = Object.values(payload.diff.updated || {})
        .map((pair: any) => pair?.[1])
        .filter(Boolean) as any[];
      const removedIds = Object.keys(payload.diff.removed || {});

      if (addedRecords.length === 0 && updatedRecords.length === 0 && removedIds.length === 0) return;

      applyingRemoteDiffRef.current = true;
      try {
        store.mergeRemoteChanges(() => {
          if (addedRecords.length > 0 || updatedRecords.length > 0) {
            store.put([...addedRecords, ...updatedRecords]);
          }
          if (removedIds.length > 0) {
            store.remove(removedIds as any[]);
          }
        });
      } finally {
        applyingRemoteDiffRef.current = false;
      }
    };

    const rebuildChunkedPayload = (payload: WhiteboardChunkPayload): WhiteboardDiffPayload | null => {
      const now = Date.now();
      incomingChunksRef.current.forEach((value, key) => {
        if (now - value.createdAt > CHUNK_TTL_MS) incomingChunksRef.current.delete(key);
      });

      const key = `${payload.senderAttendeeId}:${payload.messageId}`;
      const existing = incomingChunksRef.current.get(key) || {
        createdAt: now,
        totalChunks: payload.totalChunks,
        parts: new Array(payload.totalChunks).fill(''),
      };

      existing.totalChunks = payload.totalChunks;
      if (existing.parts.length !== payload.totalChunks) {
        existing.parts = new Array(payload.totalChunks).fill('');
      }
      existing.parts[payload.chunkIndex] = payload.chunk;
      incomingChunksRef.current.set(key, existing);

      const isComplete = existing.parts.every(Boolean);
      if (!isComplete) return null;

      incomingChunksRef.current.delete(key);
      return JSON.parse(existing.parts.join('')) as WhiteboardDiffPayload;
    };

    const removeStoreListener = store.listen(publishLocalDiff, {
      source: 'user',
      scope: 'document',
    });

    const onWhiteboardMessage = (dataMessage: any) => {
      try {
        const incoming = JSON.parse(new TextDecoder().decode(dataMessage.data)) as
          | WhiteboardDiffPayload
          | WhiteboardChunkPayload;

        if (incoming.kind === 'chunk') {
          const rebuilt = rebuildChunkedPayload(incoming);
          if (!rebuilt) return;
          if (rebuilt.senderAttendeeId === localAttendeeId) return;
          applyDiff(rebuilt);
          return;
        }

        const payload = incoming;
        if (payload.kind !== 'diff') return;
        if (payload.senderAttendeeId === localAttendeeId) return;
        applyDiff(payload);
      } catch (error) {
        console.error('Failed to apply whiteboard update:', error);
      }
    };

    audioVideo.realtimeSubscribeToReceiveDataMessage(DATA_TOPIC, onWhiteboardMessage);

    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      removeStoreListener();
      incomingChunksRef.current.clear();
      audioVideo.realtimeUnsubscribeFromReceiveDataMessage(DATA_TOPIC);
    };
  }, [meetingSession, localAttendeeId, editorReady]);

  return (
    <div className="flex flex-col h-[500px]">
      {isShared && (
        <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium self-end mb-2">
          🔗 Shared with attendees
        </div>
      )}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-200">
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor;
            setEditorReady(true);
          }}
        />
      </div>
    </div>
  );
}
