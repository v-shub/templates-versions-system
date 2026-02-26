/**
 * Socket.io client for real-time template change notifications.
 * Connects to the backend WebSocket server and receives template-changed events.
 */

import { io, Socket } from 'socket.io-client';

/** Get WebSocket server URL from API base URL (strip /api suffix) */
function getSocketUrl(): string {
  const apiUrl = process.env.REACT_APP_API_URL ?? 'http://localhost:3000/api';
  if (apiUrl.startsWith('http')) {
    return apiUrl.replace(/\/api\/?$/, '');
  }
  // Relative URL (e.g. /api in production) - use current origin
  return window.location.origin;
}

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const url = getSocketUrl();
  socket = io(url, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('WebSocket connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    console.log('WebSocket disconnected');
  }
}

export type TemplateChangedPayload = {
  templateId: string;
  versionId?: string;
  event: 'created' | 'updated' | 'deleted' | 'version_created' | 'version_restored';
};

export function onTemplateChanged(handler: (payload: TemplateChangedPayload) => void): () => void {
  const s = connectSocket();
  s.on('template-changed', handler);
  return () => {
    s.off('template-changed', handler);
  };
}
