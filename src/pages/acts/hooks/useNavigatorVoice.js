import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuthStore } from "../../../shared/stores/authStore";

/**
 * Хук для управления голосовым переключением навигатором.
 *
 * Подключается к namespace /chat, джойнится к стриму и:
 * - слушает navigator:voice:permission → canSpeak / speakReason
 * - слушает navigator:voice:state     → текущее состояние канала
 * - предоставляет switchVoice(role, userId?) — для навигатора
 * - предоставляет getState()           — запросить актуальное состояние
 */
export function useNavigatorVoice(actId) {
  const [voiceState, setVoiceState]   = useState(null);
  const [canSpeak,   setCanSpeak]     = useState(true);
  const [speakReason, setSpeakReason] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!actId) return;

    const apiUrl  = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const wsBase  = apiUrl.replace(/\/api$/, "");
    const token   = useAuthStore.getState().getToken();

    const socket = io(`${wsBase}/chat`, {
      path: "/socket.io/",
      auth: token ? { token } : {},
      transports: ["websocket", "polling"],
      reconnection: false,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("joinStream", { actId: parseInt(actId) });
      socket.emit("navigator:voice:get-state", { actId: parseInt(actId) });
    });

    socket.on("navigator:voice:state", (data) => {
      setVoiceState(data);
    });

    socket.on("navigator:voice:permission", (data) => {
      setCanSpeak(!!data.canSpeak);
      setSpeakReason(data.reason || "");
    });

    // ack для навигатора — ничего дополнительно не делаем
    socket.on("navigator:voice:switched", () => {});

    socket.on("navigator:voice:error", (err) => {
      console.error("Navigator voice error:", err);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [actId]);

  /** Навигатор переключает, с кем говорит */
  const switchVoice = useCallback(
    (targetRole, targetUserId) => {
      if (!socketRef.current) return;
      socketRef.current.emit("navigator:voice:switch", {
        actId: parseInt(actId),
        targetRole,
        ...(targetUserId != null ? { targetUserId } : {}),
      });
    },
    [actId],
  );

  /** Запросить текущее состояние канала */
  const getState = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("navigator:voice:get-state", { actId: parseInt(actId) });
  }, [actId]);

  return { canSpeak, speakReason, voiceState, switchVoice, getState, isConnected };
}
