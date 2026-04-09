import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  chatUnreadCount: 0,

  setNotifications: (notifications) => {
    const unread = notifications.filter((n) => !n.isRead);
    set({
      notifications,
      unreadCount: unread.length,
      chatUnreadCount: unread.filter((n) => n.type === 'new_message').length,
    });
  },

  addNotification: (notification) => {
    set((state) => {
      // Avoid duplicate if already in list
      if (state.notifications.some((n) => n.id === notification.id)) return state;
      const isUnread = !notification.isRead;
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + (isUnread ? 1 : 0),
        chatUnreadCount:
          state.chatUnreadCount +
          (isUnread && notification.type === 'new_message' ? 1 : 0),
      };
    });
  },

  markRead: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      if (!notification || notification.isRead) return state;
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        chatUnreadCount:
          notification.type === 'new_message'
            ? Math.max(0, state.chatUnreadCount - 1)
            : state.chatUnreadCount,
      };
    });
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
      chatUnreadCount: 0,
    }));
  },

  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      const wasUnread = notification && !notification.isRead;
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        chatUnreadCount:
          wasUnread && notification.type === 'new_message'
            ? Math.max(0, state.chatUnreadCount - 1)
            : state.chatUnreadCount,
      };
    });
  },
}));
