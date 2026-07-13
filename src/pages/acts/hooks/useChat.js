import { useCallback, useEffect, useRef, useState } from "react";

import { io } from "socket.io-client";

import api from "../../../shared/api/api";
import { pollApi } from "../../../shared/api/pollApi";
import { useAuthStore } from "../../../shared/stores/authStore";

const STREAM_HISTORY_LIMIT = 500;

const useChat = (actId, chatId = null) => {
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [addedTask, setAddedTask] = useState(null);
  const [activePoll, setActivePoll] = useState(null);
  const [activePolls, setActivePolls] = useState([]);
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
        auth: token ? { token } : {},
        query: token ? { token } : {},
        // reconnection: false, // управляем вручную, чтобы брать свежий токен
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionMaxDelay: 5000,
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
        pollApi.getActivePolls(actId)
          .then((polls) => {
            const list = Array.isArray(polls) ? polls : [];
            setActivePolls(list);
            setActivePoll(list[0] || null);
          })
          .catch(() => {});
        // Надёжный HTTP-fallback: загружаем историю сразу после подключения
        const numericChatId = Number(chatId);
        if (!Number.isFinite(numericChatId) || numericChatId <= 0) return;
        api.get(`/chat/${chatId}/messages`, { params: { limit: STREAM_HISTORY_LIMIT, offset: 0 } })
          .then(res => {
            const rawMessages = Array.isArray(res.data) ? res.data : (res.data?.messages || []);
            const msgs = rawMessages.filter(m => (m.content || m.message || m.text || '').trim());
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
        setActivePolls((prev) => [poll, ...prev.filter((item) => item.id !== poll.id)]);
        setActivePoll(poll);
      });

      s.on("poll:update", (poll) => {
        setActivePolls((prev) => {
          const next = prev.map((item) => (item.id === poll.id ? poll : item));
          return next.some((item) => item.id === poll.id) ? next : [poll, ...next];
        });
        setActivePoll(poll);
      });

      s.on("poll:closed", (data) => {
        setActivePolls((prev) => prev.filter((poll) => poll.id !== data.pollId));
        setActivePoll((current) => (current?.id === data.pollId ? null : current));
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
    async (limit = STREAM_HISTORY_LIMIT, offset = 0) => {
      const numericChatId = Number(chatId);
      if (!actId || !Number.isFinite(numericChatId) || numericChatId <= 0) return;

      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/chat/${chatId}/messages`, {
          params: {
            limit,
            offset,
          },
        });

        const rawMessages = Array.isArray(response.data) ? response.data : (response.data?.messages || []);
        const filteredMessages = rawMessages.filter((msg) => {
          const content = msg.content || msg.message || msg.text || "";
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
      const numericChatId = Number(chatId);
      if (!actId || !Number.isFinite(numericChatId) || numericChatId <= 0) return;

      try {
        setLoading(true);

        const response = await api.get(`/chat/${chatId}/messages`, {
          params: {
            limit: STREAM_HISTORY_LIMIT,
            offset,
          },
        });

        const rawMessages = Array.isArray(response.data) ? response.data : (response.data?.messages || []);
        const filteredMessages = rawMessages.filter((msg) => {
          const content = msg.content || msg.message || msg.text || "";
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
    activePolls,
    clearActivePoll: () => setActivePoll(null),
    setActivePoll: (poll) => {
      setActivePoll(poll);
      if (poll) {
        setActivePolls((prev) => {
          const next = prev.map((item) => (item.id === poll.id ? poll : item));
          return next.some((item) => item.id === poll.id) ? next : [poll, ...next];
        });
      }
    },
    setActivePolls,
  };
};

export default useChat;

