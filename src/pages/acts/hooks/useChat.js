import { useCallback, useEffect, useRef, useState } from "react";

import { io } from "socket.io-client";

import api from "../../../shared/api/api";
import { useAuthStore } from "../../../shared/stores/authStore";

const useChat = (actId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!actId) return;

    console.log(`Подключение к чату для акта ${actId}...`);

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
        console.log("Подключен к чату актов, socket.id:", s.id);
        setIsConnected(true);
        setError(null);
        console.log(`Присоединение к комнате акта ${actId}...`);
        s.emit("joinStream", { actId: parseInt(actId) });
        // Надёжный HTTP-fallback: загружаем историю сразу после подключения
        api.get(`/chat/${actId}/messages`, { params: { limit: 50, offset: 0 } })
          .then(res => {
            const msgs = (res.data || []).filter(m => (m.content || m.message || '').trim());
            if (msgs.length > 0) setMessages(msgs);
          })
          .catch(() => {});
      });

      s.on("disconnect", (reason) => {
        console.log("Отключен от чата, причина:", reason);
        setIsConnected(false);
        // При серверном дисконнекте (auth fail) пересоздаём сокет со свежим токеном
        if (!destroyed && reason === "io server disconnect") {
          setTimeout(() => {
            if (destroyed) return;
            console.log("Переподключение к чату со свежим токеном...");
            const newSocket = createSocket();
            socketRef.current = newSocket;
            attachHandlers(newSocket);
          }, 1500);
        }
      });

      s.on("joinedStream", (data) => {
        console.log("Успешно присоединён к стриму:", data);
      });

      s.on("chatHistory", (data) => {
        const msgs = (data.messages || []).filter(
          (m) => (m.message || m.content || "").trim(),
        );
        console.log(`Загружено ${msgs.length} сообщений из истории`);
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
    };

    attachHandlers(socket);

    return () => {
      destroyed = true;
      console.log("Отключение от чата для акта", actId);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [actId]);

  // Fetch initial messages (HTTP - для истории)
  const fetchMessages = useCallback(
    async (limit = 50, offset = 0) => {
      if (!actId) return;

      try {
        setLoading(true);
        setError(null);

        console.log(`Загрузка начальных сообщений для акта ${actId}...`);
        const response = await api.get(`/chat/${actId}/messages`, {
          params: {
            limit,
            offset,
          },
        });

        const filteredMessages = response.data.filter((msg) => {
          const content = msg.content || msg.message || "";
          return content.trim() !== "";
        });

        console.log(
          `Загружено ${filteredMessages.length} сообщений из истории (из ${response.data.length} всего)`,
        );
        setMessages(filteredMessages);
      } catch (err) {
        console.error("Error fetching chat messages:", err);
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    },
    [actId],
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

        console.log("Отправка сообщения через WebSocket:", payload);

        socketRef.current.emit("sendMessage", payload);

        console.log("Сообщение отправлено через WebSocket:", message);
        console.log("Ожидаем событие newMessage от сервера...");

        // Добавляем таймер для проверки - если через 2 секунды не пришло событие,
        // перезагружаем сообщения через HTTP
        setTimeout(() => {
          console.log("Прошло 2 секунды, проверяем получение сообщения...");
        }, 2000);
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
      if (!actId) return;

      try {
        setLoading(true);

        const response = await api.get(`/chat/${actId}/messages`, {
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
    [actId],
  );

  useEffect(() => {
    if (actId) {
      console.log(`🔄 Загрузка истории сообщений для акта ${actId}`);
      fetchMessages();
    }
  }, [actId]); 

  useEffect(() => {
    if (!actId || !isConnected) return;

    console.log(
      "🔄 Запуск периодической проверки новых сообщений (каждые 5 сек)",
    );

    const interval = setInterval(() => {
      if (messages.length > 0) {
        const lastMessageId = messages[messages.length - 1].id;
        console.log(`🔍 Проверка новых сообщений после ID ${lastMessageId}...`);

        api
          .get(`/chat/${actId}/messages`, {
            params: { limit: 10, offset: 0 },
          })
          .then((response) => {
            const newMessages = response.data.filter((msg) => {
              const content = msg.content || msg.message || "";
              return (
                content.trim() !== "" && 
                msg.id > lastMessageId &&
                !messages.some((m) => m.id === msg.id)
              );
            });

            if (newMessages.length > 0) {
              console.log(
                `Найдено ${newMessages.length} новых сообщений через HTTP`,
              );
              setMessages((prev) => [...prev, ...newMessages]);
            }
          })
          .catch((err) => {
            console.error("Ошибка при проверке новых сообщений:", err);
          });
      }
    }, 5000); 

    return () => {
      console.log("Остановка периодической проверки сообщений");
      clearInterval(interval);
    };
  }, [actId, isConnected, messages, setMessages]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    fetchMessages,
    loadMoreMessages,
    setMessages,
    isConnected,
  };
};

export default useChat;
