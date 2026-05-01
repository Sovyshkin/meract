import { useCallback, useEffect, useRef, useState } from "react";

import { io } from "socket.io-client";

import api from "../../../shared/api/api";
import { useAuthStore } from "../../../shared/stores/authStore";

const useChat = (actId, chatId = null) => {
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [addedTask, setAddedTask] = useState(null);
  const [activePoll, setActivePoll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!actId) return;

    // VITE_API_URL может содержать /api — убираем для socket.io
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const wsBase = apiUrl.replace(/\/api$/, "");

    const createSocket = () => {
      const token = useAuthStore.getState().getToken();
      return io(`${wsBase}/chat`, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        query: token ? { token } : {},
        reconnection: false, // управляем вручную, чтобы брать свежий токен
      });
    };

    let socket = createSocket();
    socketRef.current = socket;
    let destroyed = false;

    const attachHandlers = (s) => {
      s.on("connect", () => {
        setIsConnected(true);
        setError(null);
        s.emit("joinStream", { actId: parseInt(actId) });
        // Надёжный HTTP-fallback: загружаем историю сразу после подключения
        if (!chatId) return;
        api.get(`/chat/${chatId}/messages`, { params: { limit: 50, offset: 0 } })
          .then(res => {
            const msgs = (res.data || []).filter(m => (m.content || m.message || '').trim());
            if (msgs.length > 0) setMessages(msgs);
          })
          .catch(() => {});
      });

      s.on("disconnect", (reason) => {
        setIsConnected(false);
        // При серверном дисконнекте (auth fail) пересоздаём сокет со свежим токеном
        if (!destroyed && reason === "io server disconnect") {
          setTimeout(() => {
            if (destroyed) return;
            const newSocket = createSocket();
            socketRef.current = newSocket;
            attachHandlers(newSocket);
          }, 1500);
        }
      });

      s.on("joinedStream", (data) => {
        void data;
      });

      s.on("chatHistory", (data) => {
        const msgs = (data.messages || []).filter(
          (m) => (m.message || m.content || "").trim(),
        );
        setMessages(msgs);
      });

      s.on("connect_error", (err) => {
        console.error("Ошибка подключения к чату:", err.message);
        setError("Failed to connect to chat");
        setIsConnected(false);
      });

      s.on("newMessage", (message) => {
        const content = message.content || message.message || "";
        if (!content.trim()) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      });

      s.on("stream:message", (message) => {
        const content = message.content || message.message || "";
        if (!content.trim()) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      });

      s.on("stream:messages:pinned", (data) => {
        setPinnedMessages(data.messages || []);
      });

      s.on("stream:message:pinned", (message) => {
        setPinnedMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== message.id);
          return [...filtered, message];
        });
      });

      s.on("stream:message:unpinned", (data) => {
        setPinnedMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      });

      s.on("task:added", (task) => {
        setAddedTask(task);
      });

      s.on("poll:new", (poll) => {
        setActivePoll(poll);
      });

      s.on("poll:update", (poll) => {
        setActivePoll(poll);
      });

      s.on("poll:closed", (data) => {
        setActivePoll(null);
      });
    };

    attachHandlers(socket);

    return () => {
      destroyed = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [actId]);

  // Fetch initial messages (HTTP - для истории)
  const fetchMessages = useCallback(
    async (limit = 50, offset = 0) => {
      if (!actId || !chatId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/chat/${chatId}/messages`, {
          params: {
            limit,
            offset,
          },
        });

        const filteredMessages = response.data.filter((msg) => {
          const content = msg.content || msg.message || "";
          return content.trim() !== "";
        });

        setMessages(filteredMessages);
      } catch (err) {
        console.error("Error fetching chat messages:", err);
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    },
    [actId, chatId],
  );

  // Send message через WebSocket
  const sendMessage = useCallback(
    (message) => {
      if (!actId || !message?.trim()) {
        console.warn(
          "Невозможно отправить сообщение: пустое сообщение или нет actId",
        );
        return;
      }

      if (!socketRef.current) {
        console.warn(
          "Невозможно отправить сообщение: сокет не инициализирован",
        );
        return;
      }

      if (!socketRef.current?.connected) {
        // Пробуем переподключиться и поставить сообщение в очередь
        console.warn("Невозможно отправить сообщение: сокет не подключен, ожидаем подключения...");
        if (socketRef.current) {
          socketRef.current.once("connect", () => {
            socketRef.current.emit("sendMessage", {
              actId: parseInt(actId),
              content: message.trim(),
            });
          });
          socketRef.current.connect();
        }
        return;
      }

      try {
        setSending(true);
        setError(null);

        const payload = {
          actId: parseInt(actId),
          content: message.trim(),
        };

        socketRef.current.emit("sendMessage", payload);
      } catch (err) {
        console.error("Error sending message:", err);
        setError("Failed to send message");
      } finally {
        setSending(false);
      }
    },
    [actId],
  );

  // Load more messages (for pagination)
  const loadMoreMessages = useCallback(
    async (offset) => {
      if (!actId || !chatId) return;

      try {
        setLoading(true);

        const response = await api.get(`/chat/${chatId}/messages`, {
          params: {
            limit: 50,
            offset,
          },
        });

        const filteredMessages = response.data.filter((msg) => {
          const content = msg.content || msg.message || "";
          return content.trim() !== "";
        });

        setMessages((prevMessages) => [...filteredMessages, ...prevMessages]);
      } catch (err) {
        console.error("Error loading more messages:", err);
        setError("Failed to load more messages");
      } finally {
        setLoading(false);
      }
    },
    [actId, chatId],
  );

  const pinMessage = useCallback((messageId) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("stream:pin", { messageId });
  }, []);

  const unpinMessage = useCallback((messageId) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("stream:unpin", { messageId });
  }, []);

  const proposeTask = useCallback((data) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("task:propose", data);
  }, []);

  const addTask = useCallback((data) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("task:add", data);
  }, []);

  useEffect(() => {
    if (actId && chatId) {
      fetchMessages();
    }
  }, [actId, chatId, fetchMessages]);

  return {
    messages,
    pinnedMessages,
    loading,
    error,
    sending,
    sendMessage,
    fetchMessages,
    loadMoreMessages,
    setMessages,
    isConnected,
    pinMessage,
    unpinMessage,
    proposeTask,
    addTask,
    addedTask,
    clearAddedTask: () => setAddedTask(null),
    activePoll,
    clearActivePoll: () => setActivePoll(null),
  };
};

export default useChat;
