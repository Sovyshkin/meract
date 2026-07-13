import { io } from 'socket.io-client';
import { useNotificationStore } from '../stores/notificationStore';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // First tone (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Second tone (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
    gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn('Failed to play notification sound:', e);
  }
};

class NotificationSocket {
  constructor() {
    this.socket = null;
    this.currentUserId = null;
  }

  connect(userId) {
    if (this.socket?.connected && this.currentUserId === userId) return;
    if (this.socket) this.disconnect();

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => console.warn('Error requesting notification permission:', err));
    }

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
      playNotificationSound();
      
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(notification.title || 'Новое уведомление', {
            body: notification.body || '',
            icon: '/logo192.png',
          });
        } catch (e) {
          console.warn('Failed to display native notification:', e);
        }
      }
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
