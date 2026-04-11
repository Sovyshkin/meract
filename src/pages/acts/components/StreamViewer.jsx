import React, { useEffect, useMemo, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from 'socket.io-client';
import api from "../../../shared/api/api";
import { useSpotAgent } from "../../../shared/hooks/useSpotAgent";
import { useAuthStore } from "../../../shared/stores/authStore";
import useChat from "../hooks/useChat";
import EmojiPicker from "./EmojiPicker";
import styles from "./StreamViewer.module.css";
import menu from '../../../images/guildmenu.png';
import back from '../../../images/arrow-left.png';
import tasks_image from '../../../images/tasks.png';
import messages from '../../../images/messages.png';
import geo from '../../../images/geo.png';
import { chatApi } from "../../../shared/api/chat";

import streaminfo from '../../../images/streaminfo.png';
import video_slash from '../../../images/video-slash.png';
import share from '../../../images/streamshare.png';

// Function to extract data from JWT token
const parseJWT = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error parsing JWT:", error);
    return null;
  }
};

const StreamViewer = ({ channelName, streamData, id, onClose }) => {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [streamDuration, setStreamDuration] = useState(0);
  const [chatMessage, setChatMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [userPosition, setUserPosition] = useState([55.751244, 37.618423]);
  const [locationGranted, setLocationGranted] = useState(false);
  const locationWatchRef = useRef(null);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());
  const [taskPositions, setTaskPositions] = useState({});
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [selectedTaskRouteId, setSelectedTaskRouteId] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);

  const [chatid, setChatId] = useState();
  const [showChatPanel, setShowChatPanel] = useState(false);
  const chatEndRef = useRef(null);
  // Team chat state
  const [teamChatId, setTeamChatId] = useState(null);
  const [teamMessages, setTeamMessages] = useState([]);
  const [teamChatMessage, setTeamChatMessage] = useState('');
  const [activeChat, setActiveChat] = useState('general');
  const teamChatSocketRef = useRef(null);
  const teamChatEndRef = useRef(null);
  // Состояния для записей
  const [recordings, setRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [showRecordingPlayer, setShowRecordingPlayer] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [recordingsExpanded, setRecordingsExpanded] = useState(false);

  // Состояния для стримера
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isStartingStream, setIsStartingStream] = useState(false);

  // WebSocket состояние
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef(null);

  console.log("StreamViewer - Initial streamData:", streamData);

  // Use chat hook
  const actId = streamData?.id || channelName?.replace("act_", "");
  const { user } = useAuthStore();
  const { messages: chatMessages, sendMessage: sendChatMessage, sending, fetchMessages: fetchChatMessages } = useChat(actId);

  // Spot Agent state
  const {
    candidates,
    assignedAgents,
    loading: spotAgentLoading,
    error: spotAgentError,
    fetchCandidates,
    fetchAssigned,
    apply,
  } = useSpotAgent(actId);

  const [actualStreamData, setActualStreamData] = useState(streamData);

  // Spot Agent computed values
  const currentUserId = user?.id || user?.sub;
  const isInitiator = currentUserId === actualStreamData?.userId;
  const isStreamer = currentUserId === actualStreamData?.userId; // Стример = инициатор
  const spotAgentCount = actualStreamData?.spotAgentCount || 0;
  const hasApplied = candidates.some((c) => c.userId === currentUserId);

  // Проверяем, является ли текущий пользователь навигатором
  const isNavigator = useMemo(() => {
    if (!currentUserId || !actualStreamData?.teams) return false;
    return actualStreamData.teams.some(team =>
      (team.roleConfigs || []).some(rc =>
        rc.role === 'navigator' &&
        (rc.candidates || []).some(c => (c.user?.id ?? c.userId) === currentUserId)
      )
    );
  }, [currentUserId, actualStreamData?.teams]);

  const isHero = useMemo(() => {
    if (!currentUserId || !actualStreamData?.teams) return false;
    return actualStreamData.teams.some(team =>
      (team.roleConfigs || []).some(rc =>
        rc.role === 'hero' &&
        (rc.candidates || []).some(c => (c.user?.id ?? c.userId) === currentUserId)
      )
    );
  }, [currentUserId, actualStreamData?.teams]);

  const isSpotAgent = useMemo(() => {
    if (!currentUserId || !actualStreamData?.teams) return false;
    return actualStreamData.teams.some(team =>
      (team.roleConfigs || []).some(rc =>
        rc.role === 'spot_agent' &&
        (rc.candidates || []).some(c => (c.user?.id ?? c.userId) === currentUserId)
      )
    );
  }, [currentUserId, actualStreamData?.teams]);

  const isTeamMember = isHero || isNavigator || isSpotAgent || isInitiator;

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const clientRef = useRef(null);
  const isConnectingRef = useRef(false);
  const streamStartTimeRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);

  const [isopenmenu, setisopenmenu] = useState(false);
  // Extract user ID
  const baseUserId = useMemo(() => {
    if (user?.id) {
      return user.id;
    } else if (user?.token) {
      const tokenData = useAuthStore.getState().getToken();
      return tokenData?.sub || tokenData?.id || 888888;
    }
    return 888888;
  }, [user]);

  // Extract stream ID
  const streamId = useMemo(() => {
    return channelName?.replace("act_", "") || streamData?.id || "default";
  }, [channelName, streamData]);

  // Create UNIQUE UID - для стримера используем фиксированный uid, для зрителей - динамический
  const userIdNum = useMemo(() => {
    if (isStreamer) {
      // Для стримера используем предсказуемый uid
      return parseInt(streamId) * 1000000 + (baseUserId % 100000);
    } else {
      // Для зрителей - уникальный uid
      const randomComponent = Math.floor(Math.random() * 1000);
      return parseInt(streamId) * 1000000 + (baseUserId % 100000) * 100 + randomComponent;
    }
  }, [streamId, baseUserId, isStreamer]);

  // Use passed channelName or create from streamData
  const actualChannelName = channelName?.startsWith("act_")
    ? channelName
    : `act_${channelName || streamData?.id || "default"}`;

  // ВАЖНО: WebSocket подключение к MainGateway
  useEffect(() => {
    if (!actId || !user?.id) {
      console.log("Waiting for actId and userId...");
      return;
    }

    console.log("🔌 Connecting to MainGateway WebSocket...");
    
    const socket = io('http://localhost:3000', {
      transports: ['websocket'],
      path: '/socket.io',
      query: {
        actId: actId,
        userId: user.id,
        token: useAuthStore.getState().getToken()
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to MainGateway');
      setWsConnected(true);
      
      // Присоединяемся к комнате акта
      socket.emit('joinAct', { actId: parseInt(actId) });
    });

    socket.on('streamStarted', (data) => {
      console.log('📡 Stream started event:', data);
      setActualStreamData(prev => ({ 
        ...prev, 
        status: 'ONLINE',
        ...data 
      }));
    });

    socket.on('streamStopped', (data) => {
      console.log('📡 Stream stopped event:', data);
      setActualStreamData(prev => ({ 
        ...prev, 
        status: 'OFFLINE' 
      }));
      
      // Если это стример и стрим остановлен
      if (isStreamer) {
        setIsStreamActive(false);
        setIsPublishing(false);
      }
    });

    socket.on('publisherJoined', (data) => {
      console.log('📡 Publisher joined:', data);
    });

    socket.on('streamUpdate', (data) => {
      console.log('📡 Stream update:', data);
      setActualStreamData(prev => ({ ...prev, ...data }));
    });

    socket.on('actUpdate', (data) => {
      console.log('📡 Act update:', data);
      if (data.status) {
        setActualStreamData(prev => ({ ...prev, status: data.status }));
      }
    });

    socket.on('taskToggled', ({ taskId, isCompleted }) => {
      setCompletedTaskIds(prev => {
        const next = new Set(prev);
        if (isCompleted) next.add(taskId); else next.delete(taskId);
        return next;
      });
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, isCompleted, completedAt: isCompleted ? new Date().toISOString() : null }
          : t
      ));
    });

    socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from MainGateway:', reason);
      setWsConnected(false);
    });

    return () => {
      console.log('🔌 Cleaning up WebSocket...');
      if (socketRef.current) {
        socketRef.current.emit('leaveAct', { actId: parseInt(actId) });
        socketRef.current.disconnect();
      }
    };
  }, [actId, user?.id, user?.token, isStreamer]);

  // Load actual stream data from server
  useEffect(() => {
    const loadStreamData = async () => {
      if (!actId) return;

      try {
        console.log("StreamViewer - Loading stream data for actId:", actId);
        const response = await api.get(`/act/find-by-id/${actId}`);
        console.log("StreamViewer - Loaded stream data:", response.data);
        setActualStreamData(response.data);
      } catch (error) {
        console.error("Error loading stream data:", error);
        setActualStreamData(streamData);
      }
    };

    loadStreamData();
  }, [actId, streamData]);

  // Fetch spot agent data when spotAgentCount > 0
  useEffect(() => {
    if (spotAgentCount > 0) {
      fetchCandidates();
      fetchAssigned();
    }
  }, [spotAgentCount, fetchCandidates, fetchAssigned]);

  // Загрузка записей
  useEffect(() => {
    const fetchRecordings = async () => {
      if (!actId) return;
      
      setLoadingRecordings(true);
      try {
        const response = await api.get(`/agora-recording/recordings/act/${actId}`);
        setRecordings(response.data || []);
      } catch (err) {
        console.error('Error fetching recordings:', err);
        setRecordings([]);
      } finally {
        setLoadingRecordings(false);
      }
    };

    if (actId) {
      fetchRecordings();
    }
  }, [actId]);

  // Handle apply as spot agent
  const handleApplyAsSpotAgent = async () => {
    try {
      await apply();
      toast.success("Spot Agent application submitted successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to submit application");
    }
  };

  // Initialize Leaflet icons
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);

  // Функция запроса геолокации — должна вызываться по действию пользователя (user gesture)
  // чтобы браузер показал диалог разрешения
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    const applyPosition = (position) => {
      const coords = [position.coords.latitude, position.coords.longitude];
      setUserPosition(coords);
      setLocationGranted(true);
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
      // watchPosition без высокой точности — работает везде
      locationWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error('Watch error:', err),
        { enableHighAccuracy: false, maximumAge: 10000 }
      );
    };

    // Сначала пробуем без GPS (быстро, работает на всех устройствах)
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (error) => {
        console.error('Geolocation error code:', error.code, error.message);
        if (error.code === 1 /* PERMISSION_DENIED */) {
          toast.error('Location access denied. Please allow location in your browser settings.');
        } else {
          // Пробуем ещё раз без высокой точности и без таймаута
          navigator.geolocation.getCurrentPosition(
            applyPosition,
            (err2) => {
              console.error('Geolocation retry error code:', err2.code, err2.message);
              toast.error(`Location error (${err2.code}): ${err2.message}`);
            },
            { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
          );
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  };

  // Очистка watchPosition при размонтировании
  useEffect(() => {
    return () => {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, []);

  // Функция для начала стрима (только для стримера)
  const startStream = async () => {
    if (!isStreamer) {
      toast.error("Only streamer can start the stream");
      return;
    }

    if (isStartingStream || isStreamActive) {
      return;
    }

    setIsStartingStream(true);
    setError(null);

    try {
      console.log(`🎥 Starting stream for ${isStreamer ? 'publisher' : 'subscriber'}:`, actualChannelName);
      console.log("🎥 User ID:", userIdNum);
      const chats = await chatApi.getAll();
      const currentchat = chats.find(c => c.actId == actId);
      if (currentchat) setChatId(currentchat.id);
      const role = 'publisher';
      const response = await api.get(
        `/act/token/${actualChannelName}/${role}/uid?uid=0&expiry=3600`
      );
      
      const token = response.data.token;
      console.log("🎥 Token received:", token ? "✅" : "❌");

      if (!token) {
        throw new Error("No token received");
      }

      console.log("🎥 Creating Agora client...");
      const client = AgoraRTC.createClient({ 
        mode: "live", 
        codec: "vp8" 
      });
      
      // Устанавливаем роль host для стримера
      await client.setClientRole("host");
      clientRef.current = client;

      // Обработчики событий
      client.on("user-published", async (user, mediaType) => {
        console.log("🎥 User published:", user.uid, mediaType);
        
        // Стример не подписывается на других
        console.log("Streamer ignoring other publishers");
        return;
      });

      client.on("user-unpublished", (user) => {
        console.log("🎥 User unpublished:", user.uid);
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      console.log("🎥 Joining channel with App ID:", import.meta.env.VITE_AGORA_APP_ID);
      
      await client.join(
        import.meta.env.VITE_AGORA_APP_ID,
        actualChannelName,
        token,
        userIdNum
      );

      console.log("🎥 Successfully joined channel!");
      
      // Начинаем публикацию
      await startPublishing(client);

    } catch (err) {
      console.error("🎥 Error starting stream:", err);
      setError(err.response?.data?.message || err.message);
      toast.error("Failed to start stream: " + (err.response?.data?.message || err.message));
    } finally {
      setIsStartingStream(false);
    }
  };

  // Очистка Agora для стримера без остановки бэкенд-стрима (при уходе со страницы)
  const cleanupStreamerAgora = async () => {
    try {
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }
    } catch (e) {
      console.warn('Ошибка при очистке Agora стримера:', e);
    }
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    setIsPublishing(false);
    setIsStreamActive(false);
    isConnectingRef.current = false;
  };

  // Cleanup стримера при размонтировании (без остановки стрима на бэкенде)
  useEffect(() => {
    if (!isStreamer) return;
    return () => {
      // Размонтирование: тихо отключаемся от Agora, стрим остаётся ONLINE
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (clientRef.current) {
        clientRef.current.leave().catch(() => {});
        clientRef.current = null;
      }
    };
  }, [isStreamer]);

  // Переподключение стримера без повторного /act/start-act
  const reconnectAsStreamer = async () => {
    if (isConnectingRef.current || clientRef.current) return;
    isConnectingRef.current = true;
    setIsStartingStream(true);
    setError(null);

    try {
      const role = 'publisher';
      const response = await api.get(
        `/act/token/${actualChannelName}/${role}/uid?uid=0&expiry=3600`
      );
      const token = response.data.token;
      if (!token) throw new Error('No token received');

      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      await client.setClientRole('host');
      clientRef.current = client;

      client.on('user-unpublished', (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      await client.join(
        import.meta.env.VITE_AGORA_APP_ID,
        actualChannelName,
        token,
        userIdNum
      );

      // Захватываем камеру и микрофон заново
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

      localVideoTrackRef.current = videoTrack;
      localAudioTrackRef.current = audioTrack;
      setLocalVideoTrack(videoTrack);
      setLocalAudioTrack(audioTrack);

      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current, { mirror: false });
      }

      await client.publish([videoTrack, audioTrack]);

      setIsPublishing(true);
      setIsStreamActive(true);
      setIsConnected(true);
      streamStartTimeRef.current = Date.now();

      console.log('✅ Стример переподключился!');
    } catch (err) {
      console.error('Ошибка переподключения стримера:', err);
      setError(err.message);
      toast.error('Failed to reconnect to stream: ' + err.message);
    } finally {
      setIsStartingStream(false);
      isConnectingRef.current = false;
    }
  };

  // Функция для начала публикации стрима (для стримера)
  const startPublishing = async (client) => {
    try {
      console.log("🎥 Starting to publish stream...");
      
      // Захватываем камеру и микрофон
      const videoTrack = await AgoraRTC.createCameraVideoTrack();
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      
      setLocalVideoTrack(videoTrack);
      setLocalAudioTrack(audioTrack);

      // Синхронизируем в ref для корректной очистки
      localVideoTrackRef.current = videoTrack;
      localAudioTrackRef.current = audioTrack;

      // Показываем превью стримеру
      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current, { mirror: false });
      }

      // Публикуем стрим
      await client.publish([videoTrack, audioTrack]);
      
      setIsPublishing(true);
      setIsStreamActive(true);
      setIsConnected(true);
      streamStartTimeRef.current = Date.now();
      
      console.log("🎥 Stream published successfully!");
      
      // Уведомляем бэкенд о начале стрима
      await api.post(`/act/start-act?id=${actId}`);
      
      // Отправляем событие через WebSocket
      if (socketRef.current) {
        socketRef.current.emit('streamStarted', { actId: parseInt(actId) });
      }
      
      toast.success("Stream started successfully!");
      
    } catch (err) {
      console.error("Error publishing stream:", err);
      setError("Failed to start streaming: " + err.message);
      toast.error("Failed to start streaming");
      throw err;
    }
  };

  // Функция для остановки стрима (для стримера)
  const stopStreaming = async () => {
    if (!clientRef.current || !isStreamer) return;
    
    try {
      console.log("🛑 Stopping stream...");

      const vTrack = localVideoTrackRef.current || localVideoTrack;
      const aTrack = localAudioTrackRef.current || localAudioTrack;
      
      if (vTrack || aTrack) {
        const toUnpublish = [vTrack, aTrack].filter(Boolean);
        await clientRef.current.unpublish(toUnpublish);
        vTrack?.close();
        aTrack?.close();
        localVideoTrackRef.current = null;
        localAudioTrackRef.current = null;
        setLocalVideoTrack(null);
        setLocalAudioTrack(null);
      }
      
      await clientRef.current.leave();
      clientRef.current = null;
      
      setIsPublishing(false);
      setIsStreamActive(false);
      setIsConnected(false);
      streamStartTimeRef.current = null;
      
      console.log("🛑 Stream stopped successfully");
      
      // Уведомляем бэкенд
      await api.post(`/act/stop-act?id=${actId}`);
      
      // Отправляем событие через WebSocket
      if (socketRef.current) {
        socketRef.current.emit('streamStopped', { actId: parseInt(actId) });
      }
      
      toast.success("Stream stopped");
      
    } catch (err) {
      console.error("Error stopping stream:", err);
      toast.error("Failed to stop stream");
    }
  };

  // Подключение к стриму для зрителей
  useEffect(() => {
    const connectAsViewer = async () => {
      // Только для зрителей и только если стрим онлайн
      if (isStreamer || !actualStreamData || actualStreamData.status !== 'ONLINE' || isConnectingRef.current) {
        return;
      }

      isConnectingRef.current = true;
      setError(null);

      try {
        console.log("👀 Connecting as viewer to channel:", actualChannelName);
        console.log("👀 User ID:", userIdNum);

        const role = 'subscriber';
        const response = await api.get(
          `/act/token/${actualChannelName}/${role}/uid?uid=0&expiry=3600`
        );
        
        const token = response.data.token;
        console.log("👀 Token received:", token ? "✅" : "❌");

        if (!token) {
          throw new Error("No token received");
        }

        console.log("👀 Creating Agora client...");
        const client = AgoraRTC.createClient({ 
          mode: "live", 
          codec: "vp8" 
        });
        
        // Устанавливаем роль audience для зрителя
        await client.setClientRole("audience");
        clientRef.current = client;

        // Обработчики событий
        client.on("user-published", async (user, mediaType) => {
          console.log("👀 User published:", user.uid, mediaType);
          
          try {
            await client.subscribe(user, mediaType);
            console.log("👀 Subscribed to", mediaType);

            if (mediaType === "video") {
              if (remoteVideoRef.current) {
                user.videoTrack?.play(remoteVideoRef.current);
                console.log("👀 Playing video");
              }
            }
            
            if (mediaType === "audio") {
              user.audioTrack?.play();
              console.log("👀 Playing audio");
            }

            setRemoteUsers((prev) => [
              ...prev.filter((u) => u.uid !== user.uid),
              user,
            ]);
          } catch (err) {
            console.error("👀 Error subscribing:", err);
          }
        });

        client.on("user-unpublished", (user) => {
          console.log("👀 User unpublished:", user.uid);
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        console.log("👀 Joining channel with App ID:", import.meta.env.VITE_AGORA_APP_ID);
        
        await client.join(
          import.meta.env.VITE_AGORA_APP_ID,
          actualChannelName,
          token,
          userIdNum
        );

        console.log("👀 Successfully joined channel as viewer!");
        setIsConnected(true);
        streamStartTimeRef.current = Date.now();

      } catch (err) {
        console.error("👀 Connection error:", err);
        setError(err.response?.data?.message || err.message);
        setIsConnected(false);
      } finally {
        isConnectingRef.current = false;
      }
    };

    connectAsViewer();

    return () => {
      if (!isStreamer) {
        console.log("👀 Cleaning up viewer connection...");
        cleanupAgora();
      }
    };
  }, [actualStreamData?.status, actualChannelName, userIdNum, isStreamer]);

  // Очистка Agora соединения
  const cleanupAgora = () => {
    if (clientRef.current) {
      // Если это стример, сначала останавливаем публикацию
      if (isStreamer && localVideoTrack && localAudioTrack) {
        localVideoTrack.close();
        localAudioTrack.close();
      }

      // Для зрителей останавливаем аудио/видео треки удалённых пользователей
      if (!isStreamer) {
        remoteUsers.forEach((u) => {
          u.audioTrack?.stop();
          u.videoTrack?.stop();
        });
      }

      clientRef.current.leave();
      clientRef.current = null;
    }
    
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    setIsPublishing(false);
    setIsStreamActive(false);
    isConnectingRef.current = false;
  };

  // Timer for stream duration
  useEffect(() => {
    if (!isConnected) return;

    if (!streamStartTimeRef.current) {
      streamStartTimeRef.current = Date.now();
    }

    const timer = setInterval(() => {
      if (streamStartTimeRef.current) {
        const elapsed = Math.floor(
          (Date.now() - streamStartTimeRef.current) / 1000,
        );
        setStreamDuration(elapsed);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isConnected]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest(`.${styles.chatInput}`)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Reset timer on disconnect
  useEffect(() => {
    if (!isConnected) {
      streamStartTimeRef.current = null;
      setStreamDuration(0);
    }
  }, [isConnected]);

  // Загружаем chatId для зрителей
  useEffect(() => {
    if (isStreamer || !actId) return;
    const loadViewerChatId = async () => {
      try {
        const chats = await chatApi.getAll();
        const currentchat = chats.find((c) => c.actId == actId);
        if (currentchat) setChatId(currentchat.id);
      } catch (err) {
        console.error('Error loading chat ID for viewer:', err);
      }
    };
    loadViewerChatId();
  }, [actId, isStreamer]);

  // Настраиваем командный чат (только для членов команды)
  useEffect(() => {
    if (!isTeamMember || !actId || !actualStreamData) return;
    const setupTeamChat = async () => {
      try {
        const chats = await chatApi.getAll();
        const existing = chats.find(c => c.actId == actId && c.type === 'group');
        if (existing) {
          try {
            // Ensure current user is a member of the existing team chat on the backend
            await chatApi.joinActTeam(actId);
          } catch (joinErr) {
            console.warn('Failed to join existing act team chat:', joinErr);
            // proceed anyway; subsequent getMessages will surface 403 if not a member
          }
          setTeamChatId(existing.id);
          return;
        }
        // Собираем ID участников команды
        const memberSet = new Set([currentUserId]);
        if (actualStreamData.userId) memberSet.add(actualStreamData.userId);
        (actualStreamData.teams || []).forEach(team => {
          (team.roleConfigs || []).forEach(rc => {
            if (['hero', 'navigator', 'spot_agent'].includes(rc.role)) {
              (rc.candidates || []).forEach(c => {
                const uid = c.user?.id ?? c.userId;
                if (uid) memberSet.add(uid);
              });
            }
          });
        });
        const otherIds = [...memberSet].filter(uid => uid !== currentUserId);
        const chat = await chatApi.createChatGroup('Team Chat', otherIds, null, String(actId));
        setTeamChatId(chat.id);
      } catch (err) {
        console.error('Error setting up team chat:', err);
      }
    };
    setupTeamChat();
  }, [isTeamMember, actId, actualStreamData?.userId]);

  // WebSocket для командного чата
  useEffect(() => {
    if (!teamChatId) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const wsBase = apiUrl.replace(/\/api$/, '');
    const token = useAuthStore.getState().getToken();
    const socket = io(`${wsBase}/chat`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      query: token ? { token } : {},
    });
    teamChatSocketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('chat:join', { chatId: teamChatId });
      api.get(`/chat/${teamChatId}/messages`, { params: { limit: 50 } })
        .then(res => {
          const msgs = (res.data?.messages || []).filter(m => (m.text || '').trim());
          setTeamMessages(msgs);
        })
        .catch(() => {});
    });
    socket.on('chat:message', (message) => {
      if (message.chatId !== teamChatId) return;
      setTeamMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });
    return () => {
      socket.disconnect();
      teamChatSocketRef.current = null;
    };
  }, [teamChatId]);

  // При открытии панели чата — принудительно загрузить историю
  useEffect(() => {
    if (showChatPanel && chatMessages.length === 0) {
      fetchChatMessages();
    }
  }, [showChatPanel]);

  // Auto-show chat overlay for streamer when publishing starts
  useEffect(() => {
    if (isStreamer && (isPublishing || isStreamActive)) {
      setShowChatPanel(true);
    }
  }, [isStreamer, isPublishing, isStreamActive]);

  // Auto-scroll chat overlay to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-scroll team chat overlay to bottom on new messages
  useEffect(() => {
    teamChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [teamMessages]);

  // Построение маршрута до задания через OSRM
  const buildRouteToTask = async (taskId) => {
    const pos = taskPositions[taskId];
    if (!pos) return;
    // Тоггл: клик по уже выбранному маркеру снимает маршрут
    if (selectedTaskRouteId === taskId) {
      setSelectedTaskRouteId(null);
      setRouteCoordinates(null);
      return;
    }

    const currentPosition = userPosition;
    const [fromLat, fromLng] = currentPosition;
    const [toLat, toLng] = pos;
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRouteCoordinates(coords);
        setSelectedTaskRouteId(taskId);
      }
    } catch {
      // Фолбэк: прямая линия
      setRouteCoordinates([[...currentPosition], [...pos]]);
      setSelectedTaskRouteId(taskId);
    }
  };

  // Fetch tasks when modal is opened
  const fetchTasks = () => {
    if (!actualStreamData) return;
    const teamTasks = (actualStreamData.teams ?? []).flatMap(t => t.tasks ?? []);
    setTasks(teamTasks);
    // Build positions map directly from lat/lng (no geocoding needed)
    const positions = {};
    teamTasks.forEach(task => {
      if (task.lat != null && task.lng != null) {
        positions[task.id] = [task.lat, task.lng];
      }
    });
    setTaskPositions(positions);
    // Sync server isCompleted into local set
    setCompletedTaskIds(new Set(teamTasks.filter(t => t.isCompleted).map(t => t.id)));
  };

  const toggleTaskLocal = async (taskId) => {
    // Только герой, навигатор или инициатор акта могут менять статус задания
    if (!isHero && !isNavigator && !isInitiator) return;
    // Optimistic update
    setCompletedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? new Date().toISOString() : null }
        : t
    ));
    try {
      const updated = await api.patch(`/act/${actId}/team-tasks/${taskId}/toggle`);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated.data } : t));
      // Оповещаем всех зрителей через WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('taskToggle', { actId: parseInt(actId), taskId, isCompleted: updated.data.isCompleted });
      }
    } catch (err) {
      // Rollback on error
      setCompletedTaskIds(prev => {
        const next = new Set(prev);
        if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
        return next;
      });
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? new Date().toISOString() : null }
          : t
      ));
      toast.error('Не удалось обновить статус задания');
    }
  };

  useEffect(() => {
    if (isTasksModalOpen) {
      fetchTasks();
    }
  }, [isTasksModalOpen, actId]);

  // Fetch route data from actualStreamData
  useEffect(() => {
    const fetchRouteData = async () => {
      if (actualStreamData?.startLatitude && actualStreamData?.startLongitude) {
        setStartLocation({
          latitude: actualStreamData.startLatitude,
          longitude: actualStreamData.startLongitude,
        });
      }

      if (actualStreamData?.destinationLatitude && actualStreamData?.destinationLongitude) {
        setDestinationLocation({
          latitude: actualStreamData.destinationLatitude,
          longitude: actualStreamData.destinationLongitude,
        });
      }
    };

    if (actualStreamData) {
      fetchRouteData();
    }
  }, [actualStreamData]);

  const disconnectFromStream = async () => {
    try {
      console.log("Disconnecting from stream:", streamData?.id);

      if (isStreamer) {
        await stopStreaming();
      } else if (clientRef.current) {
        await clientRef.current.leave();
      }

      clientRef.current = null;
      setIsConnected(false);
      setRemoteUsers([]);
      streamStartTimeRef.current = null;

      console.log("Disconnected from stream successfully");
    } catch (err) {
      console.error("Error disconnecting from stream:", err);
      setError("Failed to disconnect from stream: " + err.message);
    }
  };

  const handleClose = async () => {
    await disconnectFromStream();

    if (onClose) {
      onClose();
    }

    navigate("/acts");
  };

  const handleSendMessage = () => {
    if (chatMessage.trim() && !sending) {
      sendChatMessage(chatMessage);
      setChatMessage("");
    }
  };

  const handleSendTeamMessage = () => {
    if (!teamChatMessage.trim() || !teamChatId || !teamChatSocketRef.current) return;
    teamChatSocketRef.current.emit('chat:send', { chatId: teamChatId, text: teamChatMessage });
    setTeamChatMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Автореконнект стримера: если он вернулся на страницу, а стрим уже ONLINE
  const autoReconnectDoneRef = useRef(false);
  useEffect(() => {
    if (
      isStreamer &&
      actualStreamData?.status === 'ONLINE' &&
      !isPublishing &&
      !isConnectingRef.current &&
      !autoReconnectDoneRef.current &&
      !clientRef.current
    ) {
      autoReconnectDoneRef.current = true;
      reconnectAsStreamer();
    }
  }, [isStreamer, actualStreamData?.status, isPublishing]);

  const handleEmojiClick = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiSelect = (emoji) => {
    // if (!sending) {
    //   sendMessage(emoji);
    //   setShowEmojiPicker(false);
    // }
  };

  const handleCloseEmojiPicker = () => {
    setShowEmojiPicker(false);
  };

  // Обработчики для записей
  const handlePlayRecording = async (recording) => {
    try {
      const response = await api.get(`/agora-recording/recordings/stream/${recording.key}`);
      setRecordingUrl(response.data.url);
      setSelectedRecording(recording);
      setShowRecordingPlayer(true);
    } catch (err) {
      console.error('Error getting stream URL:', err);
      toast.error('Failed to load recording');
    }
  };

  const handleDownloadRecording = async (recording) => {
    try {
      const response = await api.get(`/agora-recording/recordings/download-url/${recording.key}`);
      window.open(response.data.url, '_blank');
    } catch (err) {
      console.error('Error getting download URL:', err);
      toast.error('Failed to download recording');
    }
  };

  const handleDeleteRecording = async (recording) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) return;
    
    try {
      await api.delete(`/agora-recording/recordings/${recording.key}`);
      setRecordings(prev => prev.filter(r => r.key !== recording.key));
      toast.success('Recording deleted');
    } catch (err) {
      console.error('Error deleting recording:', err);
      toast.error('Failed to delete recording');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  useEffect(() => {
      const closeMenu = () => setisopenmenu(false);
      if (isopenmenu) {
        window.addEventListener('click', closeMenu);
      }
      return () => window.removeEventListener('click', closeMenu);
    }, [setisopenmenu]);

  const copyShareLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl)
      .then(() => {
        toast.success("Link copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
    setisopenmenu(false);
  };

  return (
    <div className={styles.container}>
     
      {isStreamer && actualStreamData?.status == 'ONLINE' && !isPublishing && (
        <div className={styles.startstream}>
          <button 
            className={styles.startStreamButton}
            onClick={startStream}
            disabled={isStartingStream}
          >
            {isStartingStream ? 'Starting...' : 'Start stream'}
          </button>
        </div>
      )}
      {actualStreamData?.status === 'ONLINE' || (isStreamer && (isPublishing || actualStreamData?.status === 'ONLINE')) ? (
        <>
       
          <div className={styles.header}>
            <div className={styles.header_cont}>
              <img src={back} alt="Back" 
                onClick={async () => {
                  if (!isStreamer) {
                    await disconnectFromStream();
                  }
                  navigate(`/acts/${actId}`);
                }}
              />
              {!isStreamer ?
                <div className={styles.online}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="5" fill="white" />
                  </svg>
                  <p className={styles.live}>LIVE</p>
                </div>
              : 
                <div className={styles.menuContainer}>
                  <img 
                    src={menu} 
                    alt="Menu" 
                    className={styles.menuIcon} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setisopenmenu(!isopenmenu);
                    }} 
                  />
                  
                  {isopenmenu && (
                    <div 
                      className={styles.dropdown} 
                      onClick={(e) => e.stopPropagation()} 
                    >
                      <div className={styles.dpopitem}>
                        <img src={streaminfo} alt="" />
                        <div className={styles.menuItem} onClick={() => navigate(`/acts/${actId}`)}>
                          information about the act
                        </div>
                      </div>
                      
                      <div className={styles.dpopitem}>
                        <img src={video_slash} alt="" />
                        <div className={styles.menuItem} onClick={stopStreaming}>
                          end the broadcast
                        </div>
                      </div>
                     
                      <div className={styles.dpopitem}>
                        <img src={share} alt="" />
                        <div className={styles.menuItem} onClick={copyShareLink}>
                          Share
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              }
            </div>

            {(streamData?.navigator ||
              streamData?.hero ||
              streamData?.initiator) && (
              <div className={styles.rolesNavigation}>
                {streamData?.navigator && (
                  <span>Navigator: {streamData.navigator}</span>
                )}
                {streamData?.navigator && streamData?.hero && (
                  <span className={styles.roleSeparator}>;</span>
                )}
                {streamData?.hero && <span>Hero: {streamData.hero}</span>}
                {streamData?.hero && streamData?.initiator && (
                  <span className={styles.roleSeparator}>;</span>
                )}
                {streamData?.initiator && (
                  <span>Initiator: {streamData.initiator}</span>
                )}
              </div>
            )}
          </div>

          <div className={styles.videoContainer}>
            {/* Для стримера показываем локальное видео */}
            {isStreamer ? (
              <div 
                ref={localVideoRef} 
                className={styles.videoElement}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#1a1a1a',
                }}
              />
            ) : (
              // Для зрителей показываем удаленное видео
              <div 
                ref={remoteVideoRef} 
                className={styles.videoElement}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#1a1a1a',
                }}
              />
            )}
            
            {!isConnected && !error && !isStreamer && (
              <div className={styles.connectingOverlay}>
                <p>Connecting to stream...</p>
              </div>
            )}
            
            {error && (
              <div className={styles.errorOverlay}>
                <p>Error: {error}</p>
                <button onClick={() => window.location.reload()}>
                  Retry
                </button>
              </div>
            )}
            
            {isConnected && !isStreamer && remoteUsers.length === 0 && (
              <div className={styles.waitingOverlay}>
                <p>Waiting for streamer...</p>
              </div>
            )}
            
            {isConnected && (
              <div className={styles.connectedOverlay}>
                {isStreamer ? (
                  <p>Streaming - {remoteUsers.length} viewer(s)</p>
                ) : (
                  <p>Connected - {remoteUsers.length} publisher(s)</p>
                )}
              </div>
            )}
          </div>
          
          {(isPublishing || isStreamActive || (!isStreamer && isConnected)) && (
            <div className={styles.chatContainer}>
              {showChatPanel && (
                <div className={styles.chatOverlay}>
                  {/* Таб-переключатель General / Team */}
                  {isTeamMember && teamChatId && (
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                      <button
                        onClick={() => setActiveChat('general')}
                        style={{
                          flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: '12px',
                          background: activeChat === 'general' ? 'rgba(0,157,255,0.15)' : 'none',
                          color: activeChat === 'general' ? '#009DFF' : '#888',
                          fontWeight: activeChat === 'general' ? 600 : 400,
                        }}
                      >General</button>
                      <button
                        onClick={() => setActiveChat('team')}
                        style={{
                          flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: '12px',
                          background: activeChat === 'team' ? 'rgba(0,157,255,0.15)' : 'none',
                          color: activeChat === 'team' ? '#009DFF' : '#888',
                          fontWeight: activeChat === 'team' ? 600 : 400,
                        }}
                      >Team</button>
                    </div>
                  )}

                  {/* General chat */}
                  {activeChat === 'general' && (
                    <>
                      <div className={styles.chatOverlayMessages}>
                        {chatMessages.filter(m => (m.message || m.content || '').trim()).map((m, i) => (
                          <div key={m.id || i} className={styles.chatOverlayMsg}>
                            <span className={styles.chatOverlayUsername}>{m.user?.username || m.username || 'User'}</span>
                            <p className={styles.chatOverlayText}>{m.message || m.content}</p>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className={styles.chatOverlayInput}>
                        <input
                          className={styles.messageInput}
                          value={chatMessage}
                          onChange={e => setChatMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder="Message..."
                          disabled={sending}
                        />
                        <button
                          className={styles.chatOverlaySendBtn}
                          onClick={handleSendMessage}
                          disabled={sending || !chatMessage.trim()}
                        >
                          ➤
                        </button>
                      </div>
                    </>
                  )}

                  {/* Team chat (только для членов команды) */}
                  {activeChat === 'team' && isTeamMember && (
                    <>
                      <div className={styles.chatOverlayMessages}>
                        {teamMessages.filter(m => (m.text || '').trim()).map((m, i) => (
                          <div key={m.id || i} className={styles.chatOverlayMsg}>
                            <span className={styles.chatOverlayUsername}>{m.sender?.login || m.sender?.email || 'User'}</span>
                            <p className={styles.chatOverlayText}>{m.text}</p>
                          </div>
                        ))}
                        <div ref={teamChatEndRef} />
                      </div>
                      <div className={styles.chatOverlayInput}>
                        <input
                          className={styles.messageInput}
                          value={teamChatMessage}
                          onChange={e => setTeamChatMessage(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendTeamMessage()}
                          placeholder="Team message..."
                        />
                        <button
                          className={styles.chatOverlaySendBtn}
                          onClick={handleSendTeamMessage}
                          disabled={!teamChatMessage.trim()}
                        >
                          ➤
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className={styles.chatActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => { requestLocation(); setShowMap(true); }}
                >
                  <img src={geo} alt="Location" />
                </button>
                <button
                  className={styles.actionButton}
                  onClick={() => setIsTasksModalOpen(true)}
                >
                  <img src={tasks_image} alt="Tasks" />
                </button>
                <button
                  className={`${styles.actionButton} ${showChatPanel ? styles.active : ''}`}
                  onClick={() => setShowChatPanel(v => !v)}
                >
                  <img src={messages} alt="Chat" />
                </button>
                
                {/* Кнопка для Spot Agent (только для зрителей, не для стримера) */}
                {!isStreamer && !isInitiator &&
                  spotAgentCount > 0 &&
                  assignedAgents.length < spotAgentCount && (
                    <button
                      className={`${styles.actionButton} ${hasApplied ? styles.spotAgentApplied : styles.spotAgentButton}`}
                      onClick={handleApplyAsSpotAgent}
                      disabled={spotAgentLoading || hasApplied}
                    >
                      {hasApplied ? (
                        <span className={styles.spotAgentIcon}>✓</span>
                      ) : (
                        <span className={styles.spotAgentIcon}>🙋</span>
                      )}
                    </button>
                  )}

                {/* Кнопка мута микрофона (только для стримера) */}
                {isStreamer && (
                  <button
                    className={styles.actionButton}
                    onClick={() => {
                      const newMuted = !isMicMuted;
                      setIsMicMuted(newMuted);
                      if (localAudioTrackRef.current) {
                        localAudioTrackRef.current.setEnabled(!newMuted);
                      }
                    }}
                    title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    <span style={{ fontSize: '22px', lineHeight: 1 }}>
                      {isMicMuted ? '🔇' : '🎙️'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Блок записей (доступен всем) */}
          {!loadingRecordings && recordings.length > 0 && (
            <div className={styles.recordingsContainer}>
              <div 
                className={styles.recordingsHeader}
                onClick={() => setRecordingsExpanded(!recordingsExpanded)}
              >
                <span>📹 Recordings ({recordings.length})</span>
                <span className={styles.expandIcon}>{recordingsExpanded ? '▼' : '▶'}</span>
              </div>

              {recordingsExpanded && (
                <div className={styles.recordingsList}>
                  {recordings.map((recording) => (
                    <div key={recording.key} className={styles.recordingItem}>
                      <div className={styles.recordingInfo}>
                        <span className={styles.recordingDate}>
                          {formatDate(recording.createdAt)}
                        </span>
                        <span className={styles.recordingSize}>
                          {recording.size ? formatSize(recording.size) : 'Unknown size'}
                        </span>
                        <span className={styles.recordingDuration}>
                          {recording.duration || 'Unknown duration'}
                        </span>
                      </div>
                      
                      <div className={styles.recordingActions}>
                        <button
                          className={styles.recordingButton}
                          onClick={() => handlePlayRecording(recording)}
                          title="Play"
                        >
                          ▶️
                        </button>
                        <button
                          className={styles.recordingButton}
                          onClick={() => handleDownloadRecording(recording)}
                          title="Download"
                        >
                          ⬇️
                        </button>
                        <button
                          className={`${styles.recordingButton} ${styles.deleteButton}`}
                          onClick={() => handleDeleteRecording(recording)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showMap && (
            <div className={styles.mapOverlay}>
              <button
                className={styles.closeMapButton}
                onClick={() => setShowMap(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back
              </button>

              {!locationGranted && (
                <button
                  className={styles.locateMeButton}
                  onClick={requestLocation}
                >
                  📍 Allow my location
                </button>
              )}

              <MapContainer
                center={
                  startLocation
                    ? [startLocation.latitude, startLocation.longitude]
                    : userPosition
                }
                zoom={15}
                style={{
                  width: "100%",
                  height: "100%",
                  filter: "grayscale(100%) invert(1)",
                }}
                zoomControl={true}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                />
                {locationGranted && (
                  <CircleMarker
                    center={userPosition}
                    radius={10}
                    pathOptions={{
                      color: '#005ce6',
                      fillColor: '#0080ff',
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  />
                )}
                {startLocation && (
                  <Circle
                    center={[startLocation.latitude, startLocation.longitude]}
                    radius={50}
                    pathOptions={{
                      color: "black",
                      fillColor: "black",
                      fillOpacity: 0.8,
                      weight: 2,
                    }}
                  />
                )}
                {routeCoordinates && routeCoordinates.length > 0 && (
                  <Polyline
                    positions={routeCoordinates}
                    pathOptions={{
                      color: "#0092FE",
                      weight: 4,
                      opacity: 0.85,
                      dashArray: "8 6",
                    }}
                  />
                )}
                {Object.entries(taskPositions).map(([taskId, pos]) => {
                  const task = tasks.find(t => t.id === parseInt(taskId));
                  const done = completedTaskIds.has(parseInt(taskId));
                  const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId)) + 1;
                  const taskIcon = L.divIcon({
                    className: 'custom-marker-icon',
                    html: `<div style="
                      background-color: ${done ? '#555' : (selectedTaskRouteId === parseInt(taskId) ? '#FF6B00' : '#0092FE')};
                      color: white;
                      border-radius: 50%;
                      width: 32px;
                      height: 32px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-weight: bold;
                      font-size: 15px;
                      border: 2px solid white;
                      box-sizing: border-box;
                    ">${done ? '✓' : taskIdx}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  });
                  return (
                    <Marker
                      key={`task-marker-${taskId}`}
                      position={pos}
                      icon={taskIcon}
                      eventHandlers={{ click: () => buildRouteToTask(parseInt(taskId)) }}
                    />
                  );
                })}

                {actualStreamData?.routePoints &&
                  actualStreamData.routePoints.length > 0 &&
                  actualStreamData.routePoints
                    .slice()
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((pt) => {
                      const isStartPoint =
                        startLocation &&
                        Math.abs(pt.latitude - startLocation.latitude) < 0.0001 &&
                        Math.abs(pt.longitude - startLocation.longitude) < 0.0001;

                      if (isStartPoint) return null;

                      const icon = L.divIcon({
                        className: "custom-marker-icon",
                        html: `<div style="
                          background-color: black;
                          color: white;
                          border-radius: 50%;
                          width: 32px;
                          height: 32px;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-weight: bold;
                          font-size: 14px;
                          border: 2px solid white;
                        ">${(pt.order != null ? pt.order : 0) + 1}</div>`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 16],
                      });

                      return (
                        <Marker
                          key={`point-${pt.id}`}
                          position={[pt.latitude, pt.longitude]}
                          icon={icon}
                        />
                      );
                    })}
              </MapContainer>
            </div>
          )}

          {isTasksModalOpen && (
            <div
              className={styles.modalOverlay}
              style={{padding:'15px'}}
              onClick={() => setIsTasksModalOpen(false)}
            >
              <div className={styles.header} style={{backdropFilter: 'none', background:'none'}}>
                <div className={styles.header_cont}>
                  <div className={styles.backButton} onClick={() => setIsTasksModalOpen(false)}>
                    <img src={back} alt="Back" className={styles.backIcon} />
                  </div>
                  <h2 className="name" style={{color:'white'}}>Act's tasks</h2>
                  <div></div>
                </div>
              </div>
              <div className={styles.none}>
                {loadingTasks ? (
                  <div className={styles.loadingTasks}>Loading tasks...</div>
                ) : tasks.length === 0 ? (
                  <div className={styles.noTasks}>No tasks available</div>
                ) : (
                  <div className={styles.cardcont} style={{marginTop:'100px'}}>
                    {tasks.map((task) => {
                      const done = completedTaskIds.has(task.id);
                      return (
                        <div
                          key={task.id}
                          className={`${styles.taskItem} ${styles.card}`}
                          style={{ opacity: done ? 0.6 : 1 }}
                          onClick={(e) => { e.stopPropagation(); toggleTaskLocal(task.id); }}
                        >
                          {(isHero || isNavigator || isInitiator) && (
                            <div className={styles.taskCheckbox}>
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() => toggleTaskLocal(task.id)}
                                onClick={e => e.stopPropagation()}
                                style={{ width: 18, height: 18, accentColor: '#0092FE', cursor: 'pointer', flexShrink: 0 }}
                              />
                            </div>
                          )}
                          <div className={styles.taskContent}>
                            <div className={styles.taskTitle} style={{ textDecoration: done ? 'line-through' : 'none' }}>{task.description}</div>
                            {task.address && (
                              <div className={styles.taskCompletedTime}>📍 {task.address}</div>
                            )}
                          </div>
                          {taskPositions[task.id] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                buildRouteToTask(task.id);
                                setIsTasksModalOpen(false);
                                setShowMap(true);
                              }}
                              style={{
                                background: selectedTaskRouteId === task.id ? '#FF6B00' : '#0092FE',
                                border: 'none',
                                color: 'white',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {selectedTaskRouteId === task.id ? 'Route ✓' : 'Route'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {showRecordingPlayer && selectedRecording && (
            <div className={styles.modalOverlay}>
              <div className={styles.recordingPlayer}>
                <div className={styles.recordingPlayerHeader}>
                  <h3>Recording Playback</h3>
                  <button 
                    onClick={() => setShowRecordingPlayer(false)} 
                    className={styles.closePlayerButton}
                  >
                    ×
                  </button>
                </div>
                
                <video
                  src={recordingUrl}
                  controls
                  autoPlay
                  className={styles.recordingVideo}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.header}>
            <div className={styles.header_cont}>
              <img src={back} alt="Back" onClick={handleClose} />
            </div>
          </div>
          <div className={styles.waitingContainer}>
            <h2 style={{color:'white', textAlign:'center', position:'relative', zIndex:'9999',}}>
              {
                actualStreamData?.liveIn ? 
                  `Stream starts in ${actualStreamData.liveIn}` : 
                   "Stream will start soon"
              }
            </h2>
          </div>
        </>
      )}
    </div>
  );
};

export default StreamViewer;