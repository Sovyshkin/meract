import { io } from 'socket.io-client';
import { useNotificationStore } from '../stores/notificationStore';

class NotificationSocket {
  constructor() {
    this.socket = null;
    this.currentUserId = null;
  }

  connect(userId) {
    if (this.socket?.connected && this.currentUserId === userId) return;
    if (this.socket) this.disconnect();

    this.currentUserId = userId;
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    this.socket = io(`${socketUrl}/notifications`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('Notification socket connected');
    });

    this.socket.on('notification:new', (notification) => {
      useNotificationStore.getState().addNotification(notification);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Notification socket disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Notification socket connect_error:', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUserId = null;
  }
}

export const notificationSocket = new NotificationSocket();
