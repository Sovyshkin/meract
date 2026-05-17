import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useMapEvents,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from 'socket.io-client';
import api from "../../../shared/api/api";
import { actApi } from "../../../shared/api/act";
import { useSpotAgent } from "../../../shared/hooks/useSpotAgent";
import { useRecordings } from "../../../shared/hooks/useRecordings";
import { useAuthStore } from "../../../shared/stores/authStore";
import { stopHeroStreamRequest } from "../../../shared/api/recordings";
import { parseApiError } from "../../../shared/utils/apiError";
import useChat from "../hooks/useChat";
import EmojiPicker from "./EmojiPicker";
import styles from "./StreamViewer.module.css";
import menu from '../../../images/guildmenu.png';
import back from '../../../images/arrow-left.png';
import tasks_image from '../../../images/tasks.png';
import messages from '../../../images/messages.png';
import geo from '../../../images/geo.png';
import { chatApi } from "../../../shared/api/chat";
import { pollApi } from "../../../shared/api/pollApi";

import streaminfo from '../../../images/streaminfo.png';
import video_slash from '../../../images/video-slash.png';
import share from '../../../images/streamshare.png';

const SHOULD_DEBUG_STREAM_LOGS =
  import.meta.env.DEV &&
  (import.meta.env.VITE_DEBUG_STREAMS === 'true' ||
    (typeof window !== 'undefined' && window.localStorage?.getItem('debug-streams') === '1'));

const debugLog = (...args) => {
  if (SHOULD_DEBUG_STREAM_LOGS) {
    console.log(...args);
  }
};

function MapClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

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

  const [showChatPanel, setShowChatPanel] = useState(false);
  const chatEndRef = useRef(null);
  // Team chat state
  const [teamChatId, setTeamChatId] = useState(null);
  const [hasTeamChatAccess, setHasTeamChatAccess] = useState(false);
  const [teamMessages, setTeamMessages] = useState([]);
  const [teamChatMessage, setTeamChatMessage] = useState('');
  const [activeChat, setActiveChat] = useState('general');
  const [showChatQuickActions, setShowChatQuickActions] = useState(false);
  const [showFullscreenChat, setShowFullscreenChat] = useState(false);
  const [selectedStreamerId, setSelectedStreamerId] = useState(null);
  const [heroStreams, setHeroStreams] = useState([]);
  const [showHeroPicker, setShowHeroPicker] = useState(false);
  const [isSelectedHeroEnded, setIsSelectedHeroEnded] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const teamChatSocketRef = useRef(null);
  const teamChatEndRef = useRef(null);
  // Состояния для записей
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
  const [isFacingFront, setIsFacingFront] = useState(true);

  // Состояния для оценки акта
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(8);
  const [hasRated, setHasRated] = useState(false);
  const [currentRating, setCurrentRating] = useState(null);
  const [currentRatingsCount, setCurrentRatingsCount] = useState(0);
  const watchedTimeRef = useRef(0);
  const ratingTimerRef = useRef(null);

  // WebSocket состояние
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showProposeTaskModal, setShowProposeTaskModal] = useState(false);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAddress, setNewTaskAddress] = useState('');
  const [newTaskLat, setNewTaskLat] = useState(null);
  const [newTaskLng, setNewTaskLng] = useState(null);
  const [newTaskGettingLocation, setNewTaskGettingLocation] = useState(false);
  const [addTaskLocationInit, setAddTaskLocationInit] = useState(false);
  const [proposeTaskLocationInit, setProposeTaskLocationInit] = useState(false);

  useEffect(() => {
    if (showAddTaskModal && !addTaskLocationInit && newTaskLat == null) {
      setAddTaskLocationInit(true);
      const tryGeolocation = () => {
        const geo = navigator.geolocation;
        if (!geo) {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          try {
            const win = iframe.contentWindow;
            if (win?.navigator?.geolocation) {
              win.navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setNewTaskLat(pos.coords.latitude);
                  setNewTaskLng(pos.coords.longitude);
                  document.body.removeChild(iframe);
                },
                () => { document.body.removeChild(iframe); },
                { enableHighAccuracy: false, timeout: 15000 }
              );
            } else { document.body.removeChild(iframe); }
          } catch { try { document.body.removeChild(iframe); } catch {} }
        } else {
          geo.getCurrentPosition(
            (pos) => {
              setNewTaskLat(pos.coords.latitude);
              setNewTaskLng(pos.coords.longitude);
            },
            () => {},
            { enableHighAccuracy: false, timeout: 15000 }
          );
        }
      };
      tryGeolocation();
    }
    if (!showAddTaskModal) setAddTaskLocationInit(false);
  }, [showAddTaskModal, addTaskLocationInit, newTaskLat]);

  useEffect(() => {
    if (showProposeTaskModal && !proposeTaskLocationInit && newTaskLat == null) {
      setProposeTaskLocationInit(true);
      const tryGeolocation = () => {
        const geo = navigator.geolocation;
        if (!geo) {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          try {
            const win = iframe.contentWindow;
            if (win?.navigator?.geolocation) {
              win.navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setNewTaskLat(pos.coords.latitude);
                  setNewTaskLng(pos.coords.longitude);
                  document.body.removeChild(iframe);
                },
                () => { document.body.removeChild(iframe); },
                { enableHighAccuracy: false, timeout: 15000 }
              );
            } else { document.body.removeChild(iframe); }
          } catch { try { document.body.removeChild(iframe); } catch {} }
        } else {
          geo.getCurrentPosition(
            (pos) => {
              setNewTaskLat(pos.coords.latitude);
              setNewTaskLng(pos.coords.longitude);
            },
            () => {},
            { enableHighAccuracy: false, timeout: 15000 }
          );
        }
      };
      tryGeolocation();
    }
    if (!showProposeTaskModal) setProposeTaskLocationInit(false);
  }, [showProposeTaskModal, proposeTaskLocationInit, newTaskLat]);

  debugLog("StreamViewer - Initial streamData:", streamData);

  // `actRef` can be public UUID or numeric id from URL/state.
  const actRef = id || streamData?.publicId || streamData?.id || channelName?.replace("act_", "");
  // Numeric id is still required by sockets and some chat payloads.
  const numericActId = useMemo(() => {
    const raw = actualStreamData?.id ?? streamData?.id;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [actualStreamData?.id, streamData?.id]);
  const { user } = useAuthStore();
  const { messages: chatMessages, sendMessage: sendChatMessage, sending, fetchMessages: fetchChatMessages, pinnedMessages, pinMessage, unpinMessage, proposeTask, addTask, addedTask, clearAddedTask, activePoll, clearActivePoll, setActivePoll } = useChat(numericActId);

  // Spot Agent state
  const {
    candidates,
    assignedAgents,
    loading: spotAgentLoading,
    error: spotAgentError,
    fetchCandidates,
    fetchAssigned,
    apply,
  } = useSpotAgent(numericActId);

  const [actualStreamData, setActualStreamData] = useState(streamData);

  // Spot Agent computed values
  const currentUserId = useMemo(() => {
    if (user?.id || user?.userId || user?.sub) {
      return user.id || user.userId || user.sub;
    }

    const token = useAuthStore.getState().getToken();
    if (typeof token === 'string' && token) {
      const payload = parseJWT(token);
      return payload?.sub || payload?.id || payload?.userId || null;
    }

    return null;
  }, [user]);
  const currentUserLogin = useMemo(() => {
    if (user?.login || user?.email) return user.login || user.email;
    const token = useAuthStore.getState().getToken();
    if (typeof token === 'string' && token) {
      const payload = parseJWT(token);
      return payload?.login || payload?.email || null;
    }
    return null;
  }, [user]);
  const isInitiator = currentUserId === actualStreamData?.userId;
  const spotAgentCount = actualStreamData?.spotAgentCount || 0;
  const hasApplied = candidates.some((c) => c.userId === currentUserId);

  // Проверяем, является ли текущий пользователь навигатором
  const hasRoleInTeamConfig = useCallback((role) => {
    if (!actualStreamData?.teams) return false;
    return actualStreamData.teams.some((team) =>
      (team.roleConfigs || []).some((rc) => {
        if (rc.role !== role) return false;
        return (rc.candidates || []).some((c) => {
          const candidateId = c.user?.id ?? c.userId;
          const candidateLogin = c.user?.login || c.user?.email || null;
          const byId =
            currentUserId != null &&
            candidateId != null &&
            String(candidateId) === String(currentUserId);
          const byLogin =
            currentUserLogin &&
            candidateLogin &&
            String(candidateLogin).toLowerCase() ===
              String(currentUserLogin).toLowerCase();
          return byId || byLogin;
        });
      }),
    );
  }, [actualStreamData?.teams, currentUserId, currentUserLogin]);

  const isNavigator = useMemo(
    () => hasRoleInTeamConfig('navigator'),
    [hasRoleInTeamConfig],
  );

  const isHero = useMemo(
    () => hasRoleInTeamConfig('hero'),
    [hasRoleInTeamConfig],
  );

  const isSpotAgent = useMemo(
    () => hasRoleInTeamConfig('spot_agent'),
    [hasRoleInTeamConfig],
  );

  const isTeamMember = isHero || isNavigator || isSpotAgent || isInitiator;
  const mergedHeroStreamers = useMemo(
    () => (heroStreams || []).map((h) => ({ ...h, source: 'backend' })),
    [heroStreams],
  );

  const selectedHeroStream = useMemo(
    () => mergedHeroStreamers.find((h) => String(h.heroUserId) === String(selectedStreamerId)) || null,
    [mergedHeroStreamers, selectedStreamerId],
  );

  const isCurrentUserAllowedToStream = Boolean(
    currentUserId && selectedStreamerId &&
    (String(currentUserId) === String(selectedStreamerId) || isInitiator),
  );

  const isSelectedStreamer = Boolean(
    selectedStreamerId &&
      currentUserId &&
      String(selectedStreamerId) === String(currentUserId) &&
      isCurrentUserAllowedToStream,
  );

  const getHeroDisplayStatus = useCallback((hero) => {
    if (!hero) return 'OFFLINE';

    const isHeroCurrentUser = currentUserId && String(hero.heroUserId) === String(currentUserId);
    const isHeroSelected = selectedStreamerId && String(hero.heroUserId) === String(selectedStreamerId);

    // Local publishing state is the most reliable source for current streamer.
    if (isHeroCurrentUser && (isStartingStream || isPublishing || isStreamActive)) {
      return 'ONLINE';
    }

    // If viewer is connected to selected hero channel, treat it as online even when backend status lags.
    if (!isSelectedStreamer && isHeroSelected && isConnected) {
      return 'ONLINE';
    }

    return hero.status || 'OFFLINE';
  }, [currentUserId, selectedStreamerId, isStartingStream, isPublishing, isStreamActive, isSelectedStreamer, isConnected]);

  const selectedHeroStatus = getHeroDisplayStatus(selectedHeroStream);
  const isSelectedHeroOnline = selectedHeroStatus === 'ONLINE';

  const {
    items: recordings,
    loading: loadingRecordings,
    error: recordingsError,
    reload: reloadRecordings,
  } = useRecordings(numericActId, selectedStreamerId ? Number(selectedStreamerId) : undefined);

  useEffect(() => {
    if (selectedStreamerId) {
      return;
    }

    if (mergedHeroStreamers.length === 0) {
      if (currentUserId && (isHero || isInitiator)) {
        setSelectedStreamerId(currentUserId);
      }
      return;
    }

    const selfHero = mergedHeroStreamers.find((h) => String(h.heroUserId) === String(currentUserId));
    if (selfHero) {
      setSelectedStreamerId(selfHero.heroUserId);
      return;
    }
    const onlineHero = mergedHeroStreamers.find((h) => h.status === 'ONLINE');
    if (onlineHero) {
      setSelectedStreamerId(onlineHero.heroUserId);
      return;
    }
    setSelectedStreamerId(mergedHeroStreamers[0].heroUserId);
  }, [mergedHeroStreamers, currentUserId, selectedStreamerId, isStartingStream, isPublishing, isStreamActive, isHero, isInitiator]);

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const clientRef = useRef(null);
  const isConnectingRef = useRef(false);
  const streamStartTimeRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const retryStartTimerRef = useRef(null);
  const startRetryCountRef = useRef(0);
  const MAX_START_RETRIES = 3;
  const reconnectRetryTimerRef = useRef(null);
  const reconnectRetryCountRef = useRef(0);
  const MAX_RECONNECT_RETRIES = 4;
  const viewerRetryTimerRef = useRef(null);
  const viewerRetryCountRef = useRef(0);
  const MAX_VIEWER_CONNECT_RETRIES = 4;
  const viewerSubscribeInFlightRef = useRef(new Set());
  const heroAutoSelectedRef = useRef(false);

  const [isopenmenu, setisopenmenu] = useState(false);
  const forceResetAgoraClient = useCallback(async () => {
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
      debugLog('forceResetAgoraClient failed:', e);
    } finally {
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
      setIsConnected(false);
      setRemoteUsers([]);
      isConnectingRef.current = false;
    }
  }, []);
  // Extract user ID
  const baseUserId = useMemo(() => {
    if (user?.id || user?.sub) {
      return user.id || user.sub;
    }

    const token = useAuthStore.getState().getToken();
    if (typeof token === 'string' && token) {
      const payload = parseJWT(token);
      const tokenUserId = payload?.sub || payload?.id || payload?.userId;
      if (tokenUserId) {
        return tokenUserId;
      }
    }

    return null;
  }, [user]);

  // Hero-stream token is issued for requesterId on backend, so Agora join UID must match that ID.
  const userIdNum = useMemo(() => {
    const parsed = Number(baseUserId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [baseUserId]);

  // Use passed channelName or create from streamData
  const actualChannelName = selectedHeroStream?.channelName
    ? selectedHeroStream.channelName
    : (selectedStreamerId
      ? `act_${numericActId || actRef}_hero_${selectedStreamerId}`
    : (channelName?.startsWith("act_")
      ? channelName
      : `act_${channelName || numericActId || actRef || "default"}`));

  // ВАЖНО: WebSocket подключение к MainGateway
  useEffect(() => {
    if (!numericActId || !currentUserId) {
      debugLog("Waiting for actId and userId...");
      return;
    }

    debugLog("🔌 Connecting to MainGateway WebSocket...");
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const wsUrl = apiUrl.replace(/\/api$/, '');
    const socket = io(wsUrl, {
      transports: ['websocket'],
      path: '/socket.io',
      query: {
        actId: numericActId,
        userId: currentUserId,
        token: useAuthStore.getState().getToken()
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      debugLog('✅ Connected to MainGateway');
      setWsConnected(true);
      if (isSelectedStreamer) {
        toast.success('Connection restored');
      }

      socket.emit('joinAct', { actId: numericActId });
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      debugLog(`🔄 Reconnection attempt #${attemptNumber}`);
      if (isSelectedStreamer) {
        toast.warning(`Reconnecting... attempt ${attemptNumber}`);
      }
    });

    socket.on('reconnect_error', (error) => {
      debugLog('❌ Reconnection error:', error);
      if (isSelectedStreamer) {
        toast.error('Connection error. Please check your internet.');
      }
    });

    socket.on('streamStarted', (data) => {
      debugLog('📡 Stream started event:', data);
      setActualStreamData(prev => ({ 
        ...prev, 
        status: 'ONLINE',
        ...data 
      }));
    });

    socket.on('streamStopped', (data) => {
      debugLog('📡 Stream stopped event:', data);
      setActualStreamData(prev => ({ 
        ...prev, 
        status: 'OFFLINE' 
      }));
      
      // Если это стример и стрим остановлен
      if (isSelectedStreamer) {
        setIsStreamActive(false);
        setIsPublishing(false);
      }
    });

    socket.on('publisherJoined', (data) => {
      debugLog('📡 Publisher joined:', data);
    });

    socket.on('streamUpdate', (data) => {
      debugLog('📡 Stream update:', data);
      setActualStreamData(prev => ({ ...prev, ...data }));
    });

    socket.on('actUpdate', (data) => {
      debugLog('📡 Act update:', data);
      if (data.status) {
        setActualStreamData(prev => ({ ...prev, status: data.status }));
      }
    });

    socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    socket.on('disconnect', (reason) => {
      debugLog('❌ Disconnected from MainGateway:', reason);
      setWsConnected(false);
      if (isSelectedStreamer) {
        toast.error('Connection lost! Trying to reconnect...');
      }
    });

    return () => {
      debugLog('🔌 Cleaning up WebSocket...');
      if (socketRef.current) {
        socketRef.current.emit('leaveAct', { actId: numericActId });
        socketRef.current.disconnect();
      }
    };
  }, [numericActId, currentUserId, user?.token, isSelectedStreamer]);

  // Load actual stream data from server
  useEffect(() => {
    const loadStreamData = async () => {
      if (!actRef) return;

      try {
        debugLog("StreamViewer - Loading stream data for actRef:", actRef);
        const response = await api.get(`/act/find-by-id/${actRef}`);
        debugLog("StreamViewer - Loaded stream data:", response.data);
        setActualStreamData(response.data);
      } catch (error) {
        console.error("Error loading stream data:", error);
        setActualStreamData(streamData);
      }
    };

    loadStreamData();
  }, [actRef, streamData]);

  const loadHeroStreams = useCallback(async () => {
    if (!actRef) return;
    try {
      const data = await actApi.getHeroStreams(actRef);
      setHeroStreams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading hero streams:', err);
      // Keep last known state to avoid UI fallback to "Stream will start soon".
    }
  }, [actRef]);

  useEffect(() => {
    if (!actRef) return;
    loadHeroStreams();
    const timer = setInterval(() => {
      loadHeroStreams();
    }, 2500);
    return () => clearInterval(timer);
  }, [actRef, loadHeroStreams]);

  useEffect(() => {
    if (!actRef || !selectedStreamerId || !isSelectedHeroOnline) {
      setViewerCount(0);
      return;
    }

    let active = true;
    const loadViewersCount = async () => {
      try {
        const data = await actApi.getHeroStreamViewersCount(actRef, selectedStreamerId);
        if (!active) return;
        const count = Number(data?.viewersCount ?? 0);
        setViewerCount(Number.isFinite(count) ? Math.max(0, count) : 0);
      } catch {
        if (active) {
          setViewerCount(0);
        }
      }
    };

    loadViewersCount();
    const timer = setInterval(loadViewersCount, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [actRef, selectedStreamerId, isSelectedHeroOnline]);

  const heroStatusSocketRef = useRef(null);
  useEffect(() => {
    if (!numericActId) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const wsBase = apiUrl.replace(/\/api$/, '');
    const token = useAuthStore.getState().getToken();
    const socket = io(`${wsBase}/chat`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      query: token ? { token } : {},
    });
    heroStatusSocketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinStream', { actId: numericActId });
    });

    const applyHeroStatus = (payload, status) => {
      if (payload?.actId && String(payload.actId) !== String(numericActId)) return;
      const heroUserId = payload?.heroUserId;
      if (!heroUserId) return;
      setHeroStreams((prev) =>
        prev.map((item) =>
          String(item.heroUserId) === String(heroUserId)
            ? {
                ...item,
                status,
                channelName: payload?.channelName || item.channelName,
                startedAt: payload?.startedAt ?? item.startedAt,
              }
            : item,
        ),
      );

      if (selectedStreamerId && String(selectedStreamerId) === String(heroUserId)) {
        if (status === 'ENDED' || status === 'FAILED') {
          setIsSelectedHeroEnded(true);
        }
        if (status === 'ONLINE') {
          setIsSelectedHeroEnded(false);
        }
      }
    };

    socket.on('heroStreamStarted', (payload) => applyHeroStatus(payload, 'ONLINE'));
    socket.on('heroStreamStopped', (payload) => applyHeroStatus(payload, 'ENDED'));
    socket.on('heroStreamFailed', (payload) => applyHeroStatus(payload, 'FAILED'));

    socket.on('taskToggled', async ({ actId: payloadActId, taskId, isCompleted, completedAt, updatedBy }) => {
      void updatedBy;
      if (payloadActId && String(payloadActId) !== String(numericActId)) return;
      const normalizedTaskId = Number(taskId);
      const normalizedCompleted = Boolean(isCompleted);

      setCompletedTaskIds((prev) => {
        const next = new Set(prev);
        if (normalizedCompleted) next.add(normalizedTaskId); else next.delete(normalizedTaskId);
        return next;
      });
      setTasks((prev) => prev.map((t) =>
        Number(t.id) === normalizedTaskId
          ? { ...t, isCompleted: normalizedCompleted, completedAt: completedAt ?? (normalizedCompleted ? new Date().toISOString() : null) }
          : t,
      ));

      // Ensure viewers see fresh status even if backend emits partial payload.
      if (isTasksModalOpen) {
        try {
          const response = await api.get(`/act/find-by-id/${actRef}`);
          const freshAct = response?.data;
          const teamTasks = (freshAct?.teams ?? []).flatMap((t) => t.tasks ?? []);
          setTasks(teamTasks);
          setCompletedTaskIds(new Set(teamTasks.filter(t => t.isCompleted).map(t => t.id)));
        } catch (_e) {
          // no-op: keep optimistic state
        }
      }
    });

    socket.on('tasksSnapshotUpdated', ({ actId: payloadActId, tasks: snapshotTasks }) => {
      if (String(payloadActId) !== String(numericActId)) return;
      const nextTasks = Array.isArray(snapshotTasks) ? snapshotTasks : [];
      setTasks(nextTasks);
      setCompletedTaskIds(new Set(nextTasks.filter((t) => t.isCompleted).map((t) => t.id)));
    });

    return () => {
      socket.disconnect();
      heroStatusSocketRef.current = null;
    };
  }, [numericActId, actRef, selectedStreamerId, isTasksModalOpen]);

  // Fetch spot agent data when spotAgentCount > 0
  useEffect(() => {
    if (spotAgentCount > 0) {
      fetchCandidates();
      fetchAssigned();
    }
  }, [spotAgentCount, fetchCandidates, fetchAssigned]);

  // Handle apply as spot agent
  const handleApplyAsSpotAgent = async () => {
    try {
      await apply();
      toast.success("Spot Agent application submitted successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to submit application");
    }
  };

  const handleVote = async (optionId) => {
    if (!activePoll) return;
    try {
      const updated = await pollApi.vote(activePoll.id, optionId);
      setActivePoll(updated);
      toast.success("Vote cast!");
    } catch (err) {
      const apiMsg = err?.response?.data?.message || '';
      const msg = apiMsg.toLowerCase();
      if (msg.includes('already voted') || msg.includes('already vote')) {
        toast.warning("You have already voted in this poll");
      } else if (apiMsg) {
        toast.error(apiMsg);
      } else {
        toast.error("Failed to vote");
      }
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
      if (retryStartTimerRef.current) {
        clearTimeout(retryStartTimerRef.current);
        retryStartTimerRef.current = null;
      }
      if (reconnectRetryTimerRef.current) {
        clearTimeout(reconnectRetryTimerRef.current);
        reconnectRetryTimerRef.current = null;
      }
      if (viewerRetryTimerRef.current) {
        clearTimeout(viewerRetryTimerRef.current);
        viewerRetryTimerRef.current = null;
      }
      startRetryCountRef.current = 0;
      reconnectRetryCountRef.current = 0;
      viewerRetryCountRef.current = 0;
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, []);

  // Функция для начала стрима (только для стримера)
  const startStream = async () => {
    if (!selectedStreamerId) {
      toast.error('Hero stream is unavailable for this account');
      return;
    }
    if (!isSelectedStreamer) {
      toast.error("Only streamer can start the stream");
      return;
    }

    if (isStartingStream || isStreamActive || isConnectingRef.current) {
      return;
    }

    // Cancel stale scheduled retry before a fresh start attempt.
    if (retryStartTimerRef.current) {
      clearTimeout(retryStartTimerRef.current);
      retryStartTimerRef.current = null;
    }

    // If backend already marks selected hero stream as online, reconnect without creating a new session.
    if (selectedHeroStream?.status === 'ONLINE' && !isPublishing && !clientRef.current) {
      await reconnectAsStreamer();
      return;
    }

    // Pin to current hero while starting to prevent unintended switch to waiting state.
    if (currentUserId) {
      setSelectedStreamerId(currentUserId);
    }

    setIsStartingStream(true);
    isConnectingRef.current = true;
    setError(null);
    let backendStarted = false;

    try {
      await forceResetAgoraClient();
      await actApi.startHeroStream(actRef, selectedStreamerId);
      backendStarted = true;

      debugLog(`🎥 Starting stream for ${isSelectedStreamer ? 'publisher' : 'subscriber'}:`, actualChannelName);
      debugLog("🎥 User ID:", userIdNum);
      const role = 'publisher';
      const token = (await actApi.getHeroStreamToken(actRef, selectedStreamerId, role, 3600))?.token;
      debugLog("🎥 Token received:", token ? "✅" : "❌");

      if (!token) {
        throw new Error("No token received");
      }

      debugLog("🎥 Creating Agora client...");
      const client = AgoraRTC.createClient({ 
        mode: "live", 
        codec: "vp8" 
      });
      
      // Устанавливаем роль host для стримера
      await client.setClientRole("host");
      clientRef.current = client;

      // Обработчики событий
      client.on("user-published", async (user, mediaType) => {
        debugLog("🎥 User published:", user.uid, mediaType);
        
        // Стример не подписывается на других
        debugLog("Streamer ignoring other publishers");
        return;
      });

      client.on("user-unpublished", (user) => {
        debugLog("🎥 User unpublished:", user.uid);
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      debugLog("🎥 Joining channel with App ID:", import.meta.env.VITE_AGORA_APP_ID);
      
      await client.join(
        import.meta.env.VITE_AGORA_APP_ID,
        actualChannelName,
        token,
        userIdNum
      );

      debugLog("🎥 Successfully joined channel!");
      
      // Начинаем публикацию
      await startPublishing(client);

      setHeroStreams((prev) =>
        prev.map((item) =>
          String(item.heroUserId) === String(selectedStreamerId)
            ? { ...item, status: 'ONLINE', startedAt: new Date().toISOString() }
            : item,
        ),
      );

      // Successful start clears retry state.
      startRetryCountRef.current = 0;

    } catch (err) {
      console.error("🎥 Error starting stream:", err);
      await forceResetAgoraClient();

      const errorCode = err?.response?.data?.errorCode;
      const errorMessage = String(err?.response?.data?.message || err?.message || '');
      const isUidConflict = errorMessage.includes('UID_CONFLICT');
      const isRestartInProgress = errorCode === 'STREAM_RESTART_IN_PROGRESS';
      const isTransientStartConflict = isUidConflict || isRestartInProgress;

      // Do not show blocking overlay for transient restart/uid conflict cases.
      if (!isTransientStartConflict) {
        setError(err.response?.data?.message || err.message);
      }

      if (backendStarted && !isTransientStartConflict) {
        try {
          await actApi.stopHeroStream(actRef, selectedStreamerId);
        } catch (rollbackErr) {
          console.error('Rollback stop hero stream failed:', rollbackErr);
        }
      }
      if (err?.response?.status === 403) {
        toast.error('Недостаточно прав');
      } else if (isRestartInProgress) {
        startRetryCountRef.current += 1;
        if (startRetryCountRef.current > MAX_START_RETRIES) {
          if (retryStartTimerRef.current) {
            clearTimeout(retryStartTimerRef.current);
            retryStartTimerRef.current = null;
          }
          startRetryCountRef.current = 0;
          toast.error('Failed to restart stream automatically. Please try again.');
          return;
        }
        const retryAfterSec = Number(err?.response?.data?.retryAfterSec ?? 2);
        const delayMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : 2000;
        if (retryStartTimerRef.current) {
          clearTimeout(retryStartTimerRef.current);
        }
        retryStartTimerRef.current = setTimeout(() => {
          retryStartTimerRef.current = null;
          if (backendStarted) {
            void reconnectAsStreamer();
            return;
          }
          void startStream();
        }, delayMs);
        toast.info(`Restart in progress, retrying in ${Math.round(delayMs / 1000)}s`);
      } else if (isUidConflict) {
        startRetryCountRef.current += 1;
        if (startRetryCountRef.current > MAX_START_RETRIES) {
          if (retryStartTimerRef.current) {
            clearTimeout(retryStartTimerRef.current);
            retryStartTimerRef.current = null;
          }
          startRetryCountRef.current = 0;
          toast.error('UID conflict persists. Please wait a few seconds and try again.');
          return;
        }
        const delayMs = 1500;
        if (retryStartTimerRef.current) {
          clearTimeout(retryStartTimerRef.current);
        }
        retryStartTimerRef.current = setTimeout(() => {
          retryStartTimerRef.current = null;
          if (backendStarted) {
            void reconnectAsStreamer();
            return;
          }
          void startStream();
        }, delayMs);
        toast.info('Previous stream session is still closing. Retrying...');
      } else {
        if (retryStartTimerRef.current) {
          clearTimeout(retryStartTimerRef.current);
          retryStartTimerRef.current = null;
        }
        startRetryCountRef.current = 0;
        toast.error("Failed to start stream: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setIsStartingStream(false);
      isConnectingRef.current = false;
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
    if (!isSelectedStreamer) return;
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
  }, [isSelectedStreamer]);

  // Переподключение стримера без повторного /act/start-act
  const reconnectAsStreamer = async () => {
    if (!selectedHeroStream || !selectedStreamerId) return;
    if (isConnectingRef.current || clientRef.current) return;

    if (reconnectRetryTimerRef.current) {
      clearTimeout(reconnectRetryTimerRef.current);
      reconnectRetryTimerRef.current = null;
    }

    isConnectingRef.current = true;
    setIsStartingStream(true);
    setError(null);

    try {
      // Ensure local old client/tracks are fully dropped before rejoin with same UID.
      await forceResetAgoraClient();

      const role = 'publisher';
      const token = (await actApi.getHeroStreamToken(actRef, selectedStreamerId, role, 3600))?.token;
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
      // Mobile-friendly video constraints for better browser permission compatibility
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: isMobile ? '480p_1' : { width: 640, height: 480 },
        optimizationMode: 'detail',
      });
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
      });

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
      reconnectRetryCountRef.current = 0;

      debugLog('✅ Стример переподключился!');
    } catch (err) {
      console.error('Ошибка переподключения стримера:', err);
      await forceResetAgoraClient();

      const errorMessage = String(err?.response?.data?.message || err?.message || '');
      const isUidConflict = errorMessage.includes('UID_CONFLICT');

      if (isUidConflict) {
        reconnectRetryCountRef.current += 1;
        if (reconnectRetryCountRef.current > MAX_RECONNECT_RETRIES) {
          reconnectRetryCountRef.current = 0;
          setError('UID conflict persists while reconnecting. Please close duplicate stream sessions and try again.');
          toast.error('Reconnect failed: duplicate stream session is still active');
        } else {
          const delayMs = 2000;
          reconnectRetryTimerRef.current = setTimeout(() => {
            reconnectRetryTimerRef.current = null;
            void reconnectAsStreamer();
          }, delayMs);
          toast.info(`Reconnecting in ${Math.round(delayMs / 1000)}s...`);
        }
      } else {
        reconnectRetryCountRef.current = 0;
        setError(err.message);
        toast.error('Failed to reconnect to stream: ' + err.message);
      }
    } finally {
      setIsStartingStream(false);
      isConnectingRef.current = false;
    }
  };

  // Функция для начала публикации стрима (для стримера)
  const startPublishing = async (client) => {
    try {
      debugLog("🎥 Starting to publish stream...");
      
      // Mobile-friendly video constraints for better browser permission compatibility
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Захватываем камеру и микрофон
      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: isMobile ? '480p_1' : { width: 640, height: 480 },
        optimizationMode: 'detail',
      });
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
      });
      
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
      
      debugLog("🎥 Stream published successfully!");
      
      toast.success("Stream started successfully!");
      
    } catch (err) {
      console.error("Error publishing stream:", err);
      setError("Failed to start streaming: " + err.message);
      toast.error("Failed to start streaming");
      throw err;
    }
  };

  // Переключение камеры (передняя/задняя)
  const switchCamera = useCallback(async () => {
    if (!localVideoTrackRef.current || !clientRef.current) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');

      if (cameras.length < 2) {
        toast.info('Only one camera available');
        return;
      }

      const currentDeviceId = localVideoTrackRef.current.getCurrentDeviceInfo?.()?.deviceId;
      const targetFacing = isFacingFront ? 'back' : 'front';

      const targetCamera = cameras.find(c => {
        const label = c.label?.toLowerCase() || '';
        return targetFacing === 'front'
          ? label.includes('front') || label.includes('facing front')
          : label.includes('back') || label.includes('rear') || label.includes('facing back');
      });

      const newCamera = targetCamera || cameras.find(c => c.deviceId !== currentDeviceId);
      if (!newCamera) {
        toast.info('Target camera not found');
        return;
      }

      const newVideoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: { width: 640, height: 480 },
        cameraId: newCamera.deviceId,
      });

      newVideoTrack.play(localVideoRef.current, { mirror: false });

      await clientRef.current.unpublish([localVideoTrackRef.current]);
      await clientRef.current.publish([newVideoTrack]);

      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = newVideoTrack;
      setLocalVideoTrack(newVideoTrack);
      setIsFacingFront(!isFacingFront);

      debugLog(`📷 Camera switched to ${isFacingFront ? 'back' : 'front'}`);
      toast.success(`Camera: ${isFacingFront ? 'back' : 'front'}`);
    } catch (err) {
      console.error('Camera switch failed:', err);
      toast.error('Failed to switch camera');
    }
  }, [isFacingFront]);

  // Функция для остановки стрима (для стримера)
  const stopStreaming = async () => {
    if (!isSelectedStreamer) return;

    wasManuallyStoppedRef.current = true;

    try {
      debugLog("🛑 Stopping stream...");

      let localCleanupError = null;

      const vTrack = localVideoTrackRef.current || localVideoTrack;
      const aTrack = localAudioTrackRef.current || localAudioTrack;

      if (clientRef.current && (vTrack || aTrack)) {
        const toUnpublish = [vTrack, aTrack].filter(Boolean);
        try {
          await clientRef.current.unpublish(toUnpublish);
        } catch (unpublishErr) {
          localCleanupError = unpublishErr;
          console.warn('Stream unpublish failed:', unpublishErr);
        }
      }

      try {
        vTrack?.close();
        aTrack?.close();
      } catch (closeErr) {
        if (!localCleanupError) localCleanupError = closeErr;
        console.warn('Track close failed:', closeErr);
      }

      localVideoTrackRef.current = null;
      localAudioTrackRef.current = null;
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);

      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (leaveErr) {
          if (!localCleanupError) localCleanupError = leaveErr;
          console.warn('Client leave failed:', leaveErr);
        }
        clientRef.current = null;
      }
      
      setIsPublishing(false);
      setIsStreamActive(false);
      setIsConnected(false);
      streamStartTimeRef.current = null;
      
      debugLog("🛑 Stream stopped successfully");

      const activeStatus = selectedHeroStream?.status;
      if (activeStatus && activeStatus !== 'ONLINE') {
        // Stream is already ended/failed on backend state; skip stop endpoint call.
        setHeroStreams((prev) =>
          prev.map((item) =>
            String(item.heroUserId) === String(selectedStreamerId)
              ? { ...item, status: item.status === 'FAILED' ? 'FAILED' : 'ENDED' }
              : item,
          ),
        );
        toast.success('Stream already stopped');
        return;
      }

      const primaryHeroId = selectedStreamerId;
      let stoppedHeroId = primaryHeroId;
      try {
        const stopResult = await stopHeroStreamRequest(actRef, primaryHeroId);
        setHeroStreams((prev) =>
          prev.map((item) =>
            String(item.heroUserId) === String(primaryHeroId)
              ? {
                  ...item,
                  status: stopResult?.status || 'ENDED',
                  endedAt: stopResult?.endedAt ?? item.endedAt,
                }
              : item,
          ),
        );
      } catch (primaryErr) {
        const fallbackHeroId = currentUserId;
        if (!fallbackHeroId || String(fallbackHeroId) === String(primaryHeroId)) {
          throw primaryErr;
        }
        // Fallback for stale selected hero id on UI side.
        const stopResult = await stopHeroStreamRequest(actRef, fallbackHeroId);
        setHeroStreams((prev) =>
          prev.map((item) =>
            String(item.heroUserId) === String(fallbackHeroId)
              ? {
                  ...item,
                  status: stopResult?.status || 'ENDED',
                  endedAt: stopResult?.endedAt ?? item.endedAt,
                }
              : item,
          ),
        );
        stoppedHeroId = fallbackHeroId;
      }

      setHeroStreams((prev) =>
        prev.map((item) =>
          String(item.heroUserId) === String(stoppedHeroId)
            ? { ...item, status: item.status || 'ENDED' }
            : item,
        ),
      );

      if (localCleanupError) {
        toast.warning('Stream stopped on server, but local device cleanup had an issue');
      }
      toast.success("Stream stopped");
      
    } catch (err) {
      console.error("Error stopping stream:", err);
      const apiErr = parseApiError(err);
      const msg = String(apiErr?.message || '').toLowerCase();
      const stopAsEnded = apiErr?.status === 400 && (msg.includes('404') || msg.includes('not found') || msg.includes('already'));

      if (stopAsEnded) {
        setHeroStreams((prev) =>
          prev.map((item) =>
            String(item.heroUserId) === String(selectedStreamerId)
              ? { ...item, status: 'ENDED' }
              : item,
          ),
        );
        toast.success('Stream stopped');
        return;
      }

      const backendMessage = apiErr?.message;
      if (backendMessage) {
        toast.error(Array.isArray(backendMessage) ? backendMessage.join(', ') : String(backendMessage));
      } else if (apiErr?.status === 403) {
        toast.error('Not enough permissions to stop this stream');
      } else {
        toast.error("Failed to stop stream");
      }
    }
  };

  // Подключение к стриму для зрителей
  useEffect(() => {
    let isViewerEffectActive = true;

    const subscribeWithRetry = async (client, user, mediaType) => {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (!isViewerEffectActive || clientRef.current !== client) {
          return false;
        }

        try {
          await client.subscribe(user, mediaType);
          return true;
        } catch (err) {
          const message = String(err?.message || '');
          const isExchangeSdpFailed =
            message.includes('EXCHANGE_SDP_FAILED') ||
            message.includes('remoteSDP created');

          if (!isExchangeSdpFailed || attempt === maxAttempts) {
            throw err;
          }

          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        }
      }

      return false;
    };

    const connectAsViewer = async () => {
      if (!isViewerEffectActive) {
        return;
      }

      // Только для зрителей и только если стрим онлайн
      if (
        !selectedHeroStream ||
        !selectedStreamerId ||
        !isSelectedHeroOnline ||
        isSelectedStreamer ||
        isConnectingRef.current ||
        clientRef.current
      ) {
        return;
      }

      if (userIdNum <= 0) {
        return;
      }

      if (viewerRetryTimerRef.current) {
        clearTimeout(viewerRetryTimerRef.current);
        viewerRetryTimerRef.current = null;
      }

      isConnectingRef.current = true;
      setError(null);

      try {
        debugLog("👀 Connecting as viewer to channel:", actualChannelName);
        debugLog("👀 User ID:", userIdNum);

        const role = 'subscriber';
        const token = (await actApi.getHeroStreamToken(actRef, selectedStreamerId, role, 3600))?.token;
        debugLog("👀 Token received:", token ? "✅" : "❌");

        if (!token) {
          throw new Error("No token received");
        }

        debugLog("👀 Creating Agora client...");
        const client = AgoraRTC.createClient({ 
          mode: "live", 
          codec: "vp8" 
        });
        
        // Устанавливаем роль audience для зрителя
        await client.setClientRole("audience");
        clientRef.current = client;

        // Обработчики событий
        client.on("user-published", async (user, mediaType) => {
          debugLog("👀 User published:", user.uid, mediaType);

          const subscribeKey = `${String(user.uid)}:${mediaType}`;
          if (viewerSubscribeInFlightRef.current.has(subscribeKey)) {
            return;
          }
          viewerSubscribeInFlightRef.current.add(subscribeKey);
          
          try {
            const subscribed = await subscribeWithRetry(client, user, mediaType);
            if (!subscribed || !isViewerEffectActive || clientRef.current !== client) {
              return;
            }
            debugLog("👀 Subscribed to", mediaType);

            if (mediaType === "video") {
              if (remoteVideoRef.current) {
                user.videoTrack?.play(remoteVideoRef.current);
                debugLog("👀 Playing video");
              }
            }
            
            if (mediaType === "audio") {
              user.audioTrack?.play();
              debugLog("👀 Playing audio");
            }

            setRemoteUsers((prev) => [
              ...prev.filter((u) => u.uid !== user.uid),
              user,
            ]);
          } catch (err) {
            console.error("👀 Error subscribing:", err);
          } finally {
            viewerSubscribeInFlightRef.current.delete(subscribeKey);
          }
        });

        client.on("user-unpublished", (user) => {
          debugLog("👀 User unpublished:", user.uid);
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        debugLog("👀 Joining channel with App ID:", import.meta.env.VITE_AGORA_APP_ID);
        
        await client.join(
          import.meta.env.VITE_AGORA_APP_ID,
          actualChannelName,
          token,
          userIdNum
        );

        debugLog("👀 Successfully joined channel as viewer!");
        viewerRetryCountRef.current = 0;
        setIsConnected(true);
        setIsSelectedHeroEnded(false);
        streamStartTimeRef.current = Date.now();

      } catch (err) {
        console.error("👀 Connection error:", err);
        const errorMessage = String(err?.response?.data?.message || err?.message || '');
        const isUidConflict = errorMessage.includes('UID_CONFLICT');

        if (isUidConflict) {
          await forceResetAgoraClient();
          viewerRetryCountRef.current += 1;

          if (viewerRetryCountRef.current > MAX_VIEWER_CONNECT_RETRIES) {
            viewerRetryCountRef.current = 0;
            setError('Failed to connect as viewer: duplicate session conflict');
            toast.error('Viewer connection conflict persists. Try reloading the page.');
          } else {
            const delayMs = 1800;
            viewerRetryTimerRef.current = setTimeout(() => {
              viewerRetryTimerRef.current = null;
              if (isViewerEffectActive) {
                void connectAsViewer();
              }
            }, delayMs);
          }
        } else {
          viewerRetryCountRef.current = 0;
          setError(err.response?.data?.message || err.message);
        }

        setIsConnected(false);
      } finally {
        isConnectingRef.current = false;
      }
    };

    connectAsViewer();

    return () => {
      isViewerEffectActive = false;
      if (!isSelectedStreamer) {
        if (viewerRetryTimerRef.current) {
          clearTimeout(viewerRetryTimerRef.current);
          viewerRetryTimerRef.current = null;
        }
        debugLog("👀 Cleaning up viewer connection...");
        cleanupAgora();
      }
    };
  }, [
    actualChannelName,
    userIdNum,
    isSelectedStreamer,
    selectedStreamerId,
    isSelectedHeroOnline,
  ]);

  // Очистка Agora соединения
  const cleanupAgora = () => {
    if (clientRef.current) {
      // Если это стример, сначала останавливаем публикацию
      if (isSelectedStreamer && localVideoTrack && localAudioTrack) {
        localVideoTrack.close();
        localAudioTrack.close();
      }

      // Для зрителей останавливаем аудио/видео треки удалённых пользователей
      if (!isSelectedStreamer) {
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
    setIsConnected(false);
    setRemoteUsers([]);
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

  // Timer for rating prompt - track if user watched for 10+ seconds
  useEffect(() => {
    if (!isConnected || hasRated) return;

    watchedTimeRef.current = 0;
    
    ratingTimerRef.current = setInterval(() => {
      watchedTimeRef.current += 1;
    }, 1000);

    return () => {
      if (ratingTimerRef.current) {
        clearInterval(ratingTimerRef.current);
        ratingTimerRef.current = null;
      }
    };
  }, [isConnected, hasRated]);

  // Show rating modal when user leaves after 10+ seconds of watching
  useEffect(() => {
    if (!showRatingModal || hasRated) return;

    const handleBeforeUnload = () => {
      if (watchedTimeRef.current >= 10 && !hasRated) {
        setShowRatingModal(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showRatingModal, hasRated]);

  const handleRateAct = async () => {
    if (hasRated) return;
    try {
      const response = await actApi.rateAct(actRef, ratingValue);
      if (response) {
        setCurrentRating(response.rating);
        setCurrentRatingsCount(response.ratingsCount);
        setHasRated(true);
      }
    } catch (err) {
      console.error('Failed to submit rating:', err);
    }
    setShowRatingModal(false);
  };

  const handleRatingClose = () => {
    if (watchedTimeRef.current >= 10 && !hasRated) {
      setShowRatingModal(true);
    } else {
      onClose?.();
    }
  };

  // Настраиваем командный чат (только для членов команды)
  useEffect(() => {
    if (!actRef) return;
    const setupTeamChat = async () => {
      try {
        // Always use backend find-or-create to avoid duplicated team chats between users.
        const teamChat = await chatApi.joinActTeam(actRef);
        if (teamChat?.id) {
          setTeamChatId(teamChat.id);
          setHasTeamChatAccess(true);
          return;
        }
        throw new Error('Team chat id is missing in joinActTeam response');
      } catch (err) {
        setHasTeamChatAccess(false);
        setTeamChatId(null);
        setTeamMessages([]);
        setActiveChat((prev) => (prev === 'team' ? 'general' : prev));
        console.error('Error setting up team chat:', err);
      }
    };
    setupTeamChat();
  }, [actRef]);

  // WebSocket для командного чата
  const fetchTeamMessages = useCallback(async () => {
    if (!teamChatId) return;
    try {
      const res = await api.get(`/chat/${teamChatId}/messages`, { params: { limit: 50 } });
      const msgs = (res.data?.messages || []).filter((m) => (m.text || '').trim());
      setTeamMessages((prev) => {
        if (prev.length === msgs.length) return prev;
        return msgs;
      });
    } catch (_e) {
      // ignore; user will still see existing messages
    }
  }, [teamChatId]);

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
      fetchTeamMessages();
    });
    socket.on('chat:message', (message) => {
      if (message.chatId !== teamChatId) return;
      setTeamMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });
    socket.on('chat:error', (payload) => {
      const msg = payload?.message || 'Failed to send team message';
      toast.error(msg);
    });
    socket.on('connect_error', () => {
      toast.error('Team chat connection error');
    });

    return () => {
      socket.disconnect();
      teamChatSocketRef.current = null;
    };
  }, [teamChatId, fetchTeamMessages]);

  useEffect(() => {
    if (!teamChatId || !showChatPanel || activeChat !== 'team') return;
    fetchTeamMessages();
  }, [teamChatId, showChatPanel, activeChat, fetchTeamMessages]);

  useEffect(() => {
    if (!teamChatId || !showChatPanel || activeChat !== 'team') return;

    // Very light fallback in case WS message delivery is temporarily unstable.
    const pollTimer = setInterval(() => {
      fetchTeamMessages();
    }, 30000);

    return () => clearInterval(pollTimer);
  }, [teamChatId, showChatPanel, activeChat, fetchTeamMessages]);

  // При открытии панели чата — принудительно загрузить историю
  useEffect(() => {
    if (showChatPanel && chatMessages.length === 0) {
      fetchChatMessages();
    }
  }, [showChatPanel]);

  // Chat panel auto-show removed - now opens only on button click

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
  const fetchTasks = async () => {
    if (!actRef) return;
    let teamTasks = [];
    try {
      const response = await api.get(`/act/find-by-id/${actRef}`);
      const freshAct = response?.data;
      if (freshAct) {
        setActualStreamData(freshAct);
        teamTasks = (freshAct.teams ?? []).flatMap((t) => t.tasks ?? []);
      }
    } catch (err) {
      // fallback to local snapshot
      teamTasks = (actualStreamData?.teams ?? []).flatMap((t) => t.tasks ?? []);
    }

    setTasks(teamTasks);
    // Build positions map directly from lat/lng (no geocoding needed)
    const positions = {};
    teamTasks.forEach((task) => {
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
    if (!isHero && !isNavigator && !isSpotAgent && !isInitiator) return;
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
      const updated = await api.patch(`/act/${actRef}/team-tasks/${taskId}/toggle`);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated.data } : t));
      // Server emits taskToggled to chat room on successful toggle.
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
    if (!isTasksModalOpen) return;
    fetchTasks();
  }, [isTasksModalOpen, actRef]);

  useEffect(() => {
    if (!isTasksModalOpen) return;

    const syncTimer = setInterval(() => {
      fetchTasks();
    }, 5000);

    return () => clearInterval(syncTimer);
  }, [isTasksModalOpen, actRef, actualStreamData]);

  useEffect(() => {
    if (addedTask) {
      setTasks(prev => [...prev, addedTask]);
      toast.success('Task added successfully');
      clearAddedTask();
    }
  }, [addedTask]);

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
      debugLog("Disconnecting from stream:", streamData?.id);

      if (isSelectedStreamer) {
        await stopStreaming();
      } else if (clientRef.current) {
        await clientRef.current.leave();
      }

      clientRef.current = null;
      setIsConnected(false);
      setRemoteUsers([]);
      streamStartTimeRef.current = null;

      debugLog("Disconnected from stream successfully");
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

  const handleSendTeamMessage = async () => {
    const text = teamChatMessage.trim();
    if (!text || !teamChatId) return;

    try {
      // Persist via HTTP (works with current backend), then refresh immediately.
      const res = await api.post(`/chat/${teamChatId}/messages`, { text });
      const sent = res?.data;
      if (sent?.id) {
        setTeamMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      }
      setTeamChatMessage('');
      fetchTeamMessages();
    } catch (err) {
      // Optional socket fallback for environments where chat:send is wired.
      if (teamChatSocketRef.current?.connected) {
        teamChatSocketRef.current.emit('chat:send', { chatId: teamChatId, text });
        setTeamChatMessage('');
        setTimeout(() => fetchTeamMessages(), 400);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to send team message');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Автореконнект стримера: если он вернулся на страницу, а стрим уже ONLINE
  const autoReconnectDoneRef = useRef(false);
  const wasManuallyStoppedRef = useRef(false);
  useEffect(() => {
    autoReconnectDoneRef.current = false;
  }, [selectedStreamerId]);

  useEffect(() => {
    if (
      isSelectedStreamer &&
      isSelectedHeroOnline &&
      !isPublishing &&
      !isStartingStream &&
      !isConnectingRef.current &&
      !autoReconnectDoneRef.current &&
      !clientRef.current &&
      !wasManuallyStoppedRef.current
    ) {
      autoReconnectDoneRef.current = true;
      reconnectAsStreamer();
    }
    if (!isSelectedHeroOnline && !isPublishing) {
      wasManuallyStoppedRef.current = false;
    }
  }, [isSelectedStreamer, isSelectedHeroOnline, isPublishing, isStartingStream]);

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
      await reloadRecordings();
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

  const handleSelectStreamer = (streamerId) => {
    if (
      isPublishing &&
      isSelectedStreamer &&
      currentUserId &&
      String(streamerId) !== String(currentUserId)
    ) {
      toast.info('Finish your stream first to switch to another hero');
      return;
    }

    if (!isSelectedStreamer) {
      // Explicitly leave previous viewer channel before switching hero.
      cleanupAgora();
      setIsConnected(false);
    }

    setIsSelectedHeroEnded(false);
    setSelectedStreamerId(streamerId);
    setShowHeroPicker(false);
  };

  const shouldShowHeroSwitchIcon = mergedHeroStreamers.length >= 2;

  return (
    <div className={styles.container}>
     
      {isSelectedStreamer && !isSelectedHeroOnline && !isPublishing && (
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
      {(isSelectedHeroOnline || isPublishing || isStreamActive || isStartingStream || isCurrentUserAllowedToStream || (Boolean(currentUserId) && (isHero || isInitiator))) ? (
        <>
       
          <div className={styles.header}>
            <div className={styles.header_cont}>
              <img src={back} alt="Back" 
                onClick={async () => {
                  if (!isSelectedStreamer) {
                    await disconnectFromStream();
                  }
                  window.history.back();
                }}
              />
              {!isSelectedStreamer ?
                <div className={styles.online}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="5" fill="white" />
                  </svg>
                  <p className={styles.live}>{selectedHeroStatus}</p>
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
                        <div className={styles.menuItem} onClick={() => navigate(`/acts/${actRef}`)}>
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

          <div className={styles.videoContainer} style={{ position: 'relative' }}>
            {/* Viewer count badge - always show for both streamer and viewers */}
            <div className={styles.viewerCountBadge} style={{ 
              position: 'absolute', 
              top: '70px', 
              right: '12px', 
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
            }}>
              <span className={styles.viewerCountDot} />
              <span className={styles.viewerCountText}>
                {viewerCount} watching
              </span>
            </div>
            {/* Для стримера показываем локальное видео */}
            {isSelectedStreamer ? (
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
            
            {!isConnected && !error && !isSelectedStreamer && (
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
            
            {isConnected && !isSelectedStreamer && remoteUsers.length === 0 && (
              <div className={styles.waitingOverlay}>
                <p>Waiting for streamer...</p>
              </div>
            )}

            {!isSelectedStreamer && isSelectedHeroEnded && (
              <div className={styles.waitingOverlay}>
                <p>Stream ended</p>
              </div>
            )}
            
            {isConnected && (
              <div className={styles.connectedOverlay}>
                {isSelectedStreamer ? (
                  <p>Streaming - {viewerCount} viewer(s)</p>
                ) : (
                  <p>Connected - {viewerCount} viewer(s) now watching</p>
                )}
              </div>
            )}
          </div>
          
          {(isPublishing || isStreamActive || (!isSelectedStreamer && isConnected)) && (
            <div className={styles.chatContainer}>
              {showChatPanel && (
                <div className={styles.chatOverlay}>
                  {/* Таб-переключатель General / Team */}
                  {hasTeamChatAccess && teamChatId && (
                    <div className={styles.chatTabs}>
                      <button
                        onClick={() => setActiveChat('general')}
                        className={`${styles.chatTabBtn} ${activeChat === 'general' ? styles.chatTabBtnActive : ''}`}
                      >General</button>
                      <button
                        onClick={() => setActiveChat('team')}
                        className={`${styles.chatTabBtn} ${activeChat === 'team' ? styles.chatTabBtnActive : ''}`}
                      >Team</button>
                    </div>
                  )}

                  {/* General chat */}
                  {activeChat === 'general' && (
                    <>
                      <div className={styles.chatOverlayMessages}>
                        {activePoll && (
                          <div className={styles.pollCard}>
                            <div className={styles.pollTitle}>{activePoll.title}</div>
                            {activePoll.description && (
                              <div className={styles.pollDesc}>{activePoll.description}</div>
                            )}
                            <div className={styles.pollOptions}>
                              {activePoll.options?.map((opt) => (
                                <button
                                  key={opt.id}
                                  className={styles.pollOptionBtn}
                                  onClick={() => handleVote(opt.id)}
                                >
                                  <span className={styles.pollOptionFill} style={{ width: `${opt.percent || 0}%` }} />
                                  <span className={styles.pollOptionLabel}>{opt.text}</span>
                                  <span className={styles.pollOptionPercent}>{opt.percent || 0}%</span>
                                </button>
                              ))}
                            </div>
                            <div className={styles.pollFooter}>
                              {activePoll.totalVotes} votes · Ends {new Date(activePoll.endsAt).toLocaleTimeString()}
                            </div>
                          </div>
                        )}
                        {pinnedMessages.length > 0 && (
                          <div className={styles.pinnedMessagesHeader}>
                            <div className={styles.pinnedLabel}>Pinned</div>
                            {pinnedMessages.map((m) => (
                              <div key={`pin-${m.id}`} className={styles.pinnedMsg}>
                                <div className={styles.pinnedMsgContent}>
                                  <span className={styles.chatOverlayUsername}>{m.user?.username || 'User'}</span>
                                  <p className={styles.chatOverlayText}>{m.text || m.message || m.content}</p>
                                </div>
                                {(isNavigator || isInitiator) && (
                                  <button
                                    className={styles.unpinBtn}
                                    onClick={() => unpinMessage(m.id)}
                                    title="Unpin"
                                  >×</button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {chatMessages.filter(m => (m.message || m.content || '').trim()).map((m, i) => (
                          <div key={m.id || i} className={styles.chatOverlayMsg}>
                            <span className={styles.chatOverlayUsername}>{m.user?.username || m.username || 'User'}</span>
                            <p className={styles.chatOverlayText}>{m.message || m.content}</p>
                            {(isNavigator || isInitiator) && (
                              <button
                                className={styles.pinBtn}
                                onClick={() => pinMessage(m.id)}
                                title="Pin"
                              >📌</button>
                            )}
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
                        {(isNavigator || isInitiator) && (
                          <div className={styles.chatInputActionsWrap}>
                            <button
                              className={styles.chatInputActionBtn}
                              onClick={() => setShowChatQuickActions(v => !v)}
                              title="Actions"
                            >
                              +
                            </button>
                            {showChatQuickActions && (
                              <div className={styles.chatQuickActionsMenu}>
                                <button
                                  className={styles.chatQuickActionItem}
                                  onClick={() => {
                                    setShowChatQuickActions(false);
                                    setShowAddTaskModal(true);
                                  }}
                                >
                                  Add task
                                </button>
                                <button
                                  className={styles.chatQuickActionItem}
                                  onClick={() => {
                                    setShowChatQuickActions(false);
                                    setShowProposeTaskModal(true);
                                  }}
                                >
                                  Create poll
                                </button>
                              </div>
                            )}
                          </div>
                        )}
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
                  {activeChat === 'team' && hasTeamChatAccess && (
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
                {shouldShowHeroSwitchIcon && (
                  <button
                    className={styles.actionButton}
                    onClick={() => setShowHeroPicker(true)}
                    title="Switch hero stream"
                  >
                    <span className={styles.heroSwitchIcon}>🦸</span>
                  </button>
                )}
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
                  className={`${styles.actionButton} ${showChatPanel || showFullscreenChat ? styles.active : ''}`}
                  onClick={() => setShowFullscreenChat(true)}
                >
                  <img src={messages} alt="Chat" />
                </button>

                {/* Navigator buttons */}
                {isNavigator && !showChatPanel && (
                  <>
                    <button
                      className={styles.actionButton}
                      onClick={() => setShowAddTaskModal(true)}
                      title="Add task"
                    >
                      <span style={{ fontSize: '16px' }}>➕</span>
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => setShowProposeTaskModal(true)}
                      title="Propose task for voting"
                    >
                      <span style={{ fontSize: '16px' }}>🗳️</span>
                    </button>
                  </>
                )}
                
                {/* Кнопка для Spot Agent (только для зрителей, не для стримера) */}
                {!isSelectedStreamer && !isInitiator &&
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
                {isSelectedStreamer && (
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

                {/* Кнопка переключения камеры (только для стримера) */}
                {isSelectedStreamer && (
                  <button
                    className={styles.actionButton}
                    onClick={switchCamera}
                    title={isFacingFront ? 'Switch to back camera' : 'Switch to front camera'}
                  >
                    <span style={{ fontSize: '22px', lineHeight: 1 }}>
                      {isFacingFront ? '📹' : '📷'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {showHeroPicker && shouldShowHeroSwitchIcon && (
            <div className={styles.heroPickerOverlay} onClick={() => setShowHeroPicker(false)}>
              <div className={styles.heroPickerModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.heroPickerTitle}>Choose Hero Stream</div>
                <div className={styles.heroPickerList}>
                  {mergedHeroStreamers.length === 0 && (
                    <div className={styles.heroPickerEmpty}>
                      No available hero streams. Hero must be an active participant.
                    </div>
                  )}
                  {mergedHeroStreamers.map((hero) => (
                    <button
                      key={hero.heroUserId}
                      className={`${styles.heroPickerItem} ${String(selectedStreamerId) === String(hero.heroUserId) ? styles.heroPickerItemActive : ''}`}
                      onClick={() => handleSelectStreamer(hero.heroUserId)}
                    >
                      {hero.heroLogin}
                      <span style={{ marginLeft: 8, opacity: 0.75, fontSize: 12 }}>
                        {getHeroDisplayStatus(hero)}
                      </span>
                    </button>
                  ))}
                </div>
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

          {showRatingModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.recordingPlayer}>
                <div className={styles.recordingPlayerHeader}>
                  <h3>Rate this Act</h3>
                  <button 
                    onClick={() => setShowRatingModal(false)}
                    className={styles.closePlayerButton}
                  >
                    ×
                  </button>
                </div>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#b5b3b3', marginBottom: '20px' }}>
                    How would you rate this stream?
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    marginBottom: '20px',
                    flexWrap: 'wrap'
                  }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                      <button
                        key={val}
                        onClick={() => setRatingValue(val)}
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '10px',
                          border: ratingValue === val ? '2px solid #009DFF' : '1px solid rgba(255,255,255,0.15)',
                          background: ratingValue === val ? 'rgba(0,157,255,0.2)' : 'rgba(255,255,255,0.05)',
                          color: ratingValue === val ? '#009DFF' : 'white',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setShowRatingModal(false)}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#b5b3b3',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleRateAct}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#009DFF',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Submit Rating
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Task Modal (Navigator) */}
          {showAddTaskModal && (
            <div className={`${styles.modalOverlay} ${styles.modalOverlayTop}`} onClick={() => setShowAddTaskModal(false)}>
              <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3 style={{ color: 'white', marginBottom: '16px' }}>Add New Task</h3>
                <p style={{ color: '#BFBFBF', marginBottom: '6px', fontSize: '13px' }}>Description *</p>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTaskDescription}
                  onChange={e => setNewTaskDescription(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.15)', marginBottom: '14px',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ color: '#BFBFBF', marginBottom: '6px', fontSize: '13px' }}>Address (optional)</p>
                <input
                  type="text"
                  placeholder="Street address or landmark"
                  value={newTaskAddress}
                  onChange={e => setNewTaskAddress(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.15)', marginBottom: '14px',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ color: '#BFBFBF', marginBottom: '8px', fontSize: '13px' }}>Pick location on map (tap to pin)</p>
                <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', width: '100%' }}>
                  <MapContainer
                    center={newTaskLat != null ? [newTaskLat, newTaskLng] : [55.751244, 37.618423]}
                    zoom={newTaskLat != null ? 14 : 4}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
                    <MapClickHandler onPick={(lat, lng) => { setNewTaskLat(lat); setNewTaskLng(lng); }} />
                    {newTaskLat != null && <Marker position={[newTaskLat, newTaskLng]} />}
                  </MapContainer>
                </div>
                {newTaskLat != null ? (
                  <p style={{ color: '#888', fontSize: '12px', marginBottom: '10px', wordBreak: 'break-all' }}>
                    📍 {newTaskLat.toFixed(6)}, {newTaskLng.toFixed(6)}
                  </p>
                ) : (
                  <p style={{ color: '#666', fontSize: '12px', marginBottom: '10px' }}>No location selected</p>
                )}
                <div
                  role="button"
                  onClick={() => {
                    if (!newTaskGettingLocation) {
                      setNewTaskGettingLocation(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setNewTaskLat(pos.coords.latitude);
                          setNewTaskLng(pos.coords.longitude);
                          setNewTaskGettingLocation(false);
                        },
                        () => setNewTaskGettingLocation(false),
                        { enableHighAccuracy: true }
                      );
                    }
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.07)',
                    color: newTaskGettingLocation ? '#888' : '#BFBFBF',
                    cursor: newTaskGettingLocation ? 'default' : 'pointer',
                    textAlign: 'center',
                    fontSize: '13px',
                    marginBottom: '16px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxSizing: 'border-box',
                  }}
                >
                  {newTaskGettingLocation ? 'Getting location…' : '📡 Use my current location'}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setShowAddTaskModal(false);
                      setNewTaskDescription('');
                      setNewTaskAddress('');
                      setNewTaskLat(null);
                      setNewTaskLng(null);
                    }}
                    style={{
                      flex: 1, padding: '11px',
                      background: 'transparent', color: '#fff',
                      border: '1px solid #555', borderRadius: '8px', cursor: 'pointer',
                    }}
                  >Cancel</button>
                  <button
                    onClick={() => {
                      const teamId = actualStreamData?.teams?.[0]?.id;
                      if (newTaskDescription.trim() && teamId) {
                        addTask({
                          actId: numericActId, teamId,
                          description: newTaskDescription.trim(),
                          address: newTaskAddress.trim() || undefined,
                          lat: newTaskLat ?? undefined,
                          lng: newTaskLng ?? undefined,
                        });
                        setNewTaskDescription('');
                        setNewTaskAddress('');
                        setNewTaskLat(null);
                        setNewTaskLng(null);
                        setShowAddTaskModal(false);
                      }
                    }}
                    style={{
                      flex: 1, padding: '11px',
                      background: '#FF3B57', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    }}
                  >Add Task</button>
                </div>
              </div>
            </div>
          )}

          {/* Propose Task for Voting Modal (Navigator) */}
          {showProposeTaskModal && (
            <div className={`${styles.modalOverlay} ${styles.modalOverlayTop}`} onClick={() => setShowProposeTaskModal(false)}>
              <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3 style={{ color: 'white', marginBottom: '16px' }}>Propose Task for Voting</h3>
                <p style={{ color: '#BFBFBF', fontSize: '13px', marginBottom: '12px' }}>
                  The task will be sent to chat as a pinned message and put to a vote.
                </p>
                <p style={{ color: '#BFBFBF', marginBottom: '6px', fontSize: '13px' }}>Description *</p>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTaskDescription}
                  onChange={e => setNewTaskDescription(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.15)', marginBottom: '14px',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ color: '#BFBFBF', marginBottom: '6px', fontSize: '13px' }}>Address (optional)</p>
                <input
                  type="text"
                  placeholder="Street address or landmark"
                  value={newTaskAddress}
                  onChange={e => setNewTaskAddress(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.15)', marginBottom: '14px',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ color: '#BFBFBF', marginBottom: '8px', fontSize: '13px' }}>Pick location on map (tap to pin)</p>
                <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', width: '100%' }}>
                  <MapContainer
                    center={newTaskLat != null ? [newTaskLat, newTaskLng] : [55.751244, 37.618423]}
                    zoom={newTaskLat != null ? 14 : 4}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
                    <MapClickHandler onPick={(lat, lng) => { setNewTaskLat(lat); setNewTaskLng(lng); }} />
                    {newTaskLat != null && <Marker position={[newTaskLat, newTaskLng]} />}
                  </MapContainer>
                </div>
                {newTaskLat != null ? (
                  <p style={{ color: '#888', fontSize: '12px', marginBottom: '10px', wordBreak: 'break-all' }}>
                    📍 {newTaskLat.toFixed(6)}, {newTaskLng.toFixed(6)}
                  </p>
                ) : (
                  <p style={{ color: '#666', fontSize: '12px', marginBottom: '10px' }}>No location selected</p>
                )}
                <div
                  role="button"
                  onClick={() => {
                    if (!newTaskGettingLocation) {
                      setNewTaskGettingLocation(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setNewTaskLat(pos.coords.latitude);
                          setNewTaskLng(pos.coords.longitude);
                          setNewTaskGettingLocation(false);
                        },
                        () => setNewTaskGettingLocation(false),
                        { enableHighAccuracy: true }
                      );
                    }
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.07)',
                    color: newTaskGettingLocation ? '#888' : '#BFBFBF',
                    cursor: newTaskGettingLocation ? 'default' : 'pointer',
                    textAlign: 'center',
                    fontSize: '13px',
                    marginBottom: '16px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxSizing: 'border-box',
                  }}
                >
                  {newTaskGettingLocation ? 'Getting location…' : '📡 Use my current location'}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setShowProposeTaskModal(false);
                      setNewTaskDescription('');
                      setNewTaskAddress('');
                      setNewTaskLat(null);
                      setNewTaskLng(null);
                    }}
                    style={{
                      flex: 1, padding: '11px',
                      background: 'transparent', color: '#fff',
                      border: '1px solid #555', borderRadius: '8px', cursor: 'pointer',
                    }}
                  >Cancel</button>
                  <button
                    onClick={() => {
                      if (newTaskDescription.trim()) {
                        proposeTask({
                          actId: numericActId,
                          description: newTaskDescription.trim(),
                          address: newTaskAddress.trim() || undefined,
                          lat: newTaskLat ?? undefined,
                          lng: newTaskLng ?? undefined,
                          biddingTime: 10,
                        });
                        setNewTaskDescription('');
                        setNewTaskAddress('');
                        setNewTaskLat(null);
                        setNewTaskLng(null);
                        setShowProposeTaskModal(false);
                      }
                    }}
                    style={{
                      flex: 1, padding: '11px',
                      background: '#FF3B57', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    }}
                  >Propose</button>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Chat Overlay */}
          {showFullscreenChat && (
            <div className={styles.fullscreenChatOverlay}>
              <div className={styles.fullscreenChatHeader}>
                <button
                  className={styles.fullscreenChatBackBtn}
                  onClick={() => setShowFullscreenChat(false)}
                >
                  <img src={back} alt="Close" />
                </button>
                <h2 className={styles.fullscreenChatTitle}>Chat</h2>
              </div>

              {hasTeamChatAccess && teamChatId && (
                <div className={styles.fullscreenChatTabs}>
                  <button
                    onClick={() => setActiveChat('general')}
                    className={`${styles.fullscreenChatTab} ${activeChat === 'general' ? styles.fullscreenChatTabActive : ''}`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setActiveChat('team')}
                    className={`${styles.fullscreenChatTab} ${activeChat === 'team' ? styles.fullscreenChatTabActive : ''}`}
                  >
                    Team
                  </button>
                </div>
              )}

              {/* General Chat */}
              {activeChat === 'general' && (
                <>
                  {activePoll && (
                    <div className={styles.fullscreenPollCard}>
                      <div className={styles.fullscreenPollTitle}>{activePoll.title}</div>
                      {activePoll.description && (
                        <div className={styles.fullscreenPollDesc}>{activePoll.description}</div>
                      )}
                      <div className={styles.fullscreenPollOptions}>
                        {activePoll.options?.map((opt) => (
                          <button
                            key={opt.id}
                            className={styles.fullscreenPollOptionBtn}
                            onClick={() => handleVote(opt.id)}
                          >
                            <span className={styles.fullscreenPollFill} style={{ width: `${opt.percent || 0}%` }} />
                            <span className={styles.fullscreenPollLabel}>{opt.text}</span>
                            <span className={styles.fullscreenPollPercent}>{opt.percent || 0}%</span>
                          </button>
                        ))}
                      </div>
                      <div className={styles.fullscreenPollFooter}>
                        {activePoll.totalVotes} votes · Ends {new Date(activePoll.endsAt).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                  {pinnedMessages.length > 0 && (
                    <div className={styles.fullscreenPinnedSection}>
                      <div className={styles.fullscreenPinnedTitle}>Pinned Messages</div>
                      {pinnedMessages.map((m) => (
                        <div key={`fs-pin-${m.id}`} className={styles.fullscreenPinnedMsg}>
                          <div className={styles.fullscreenPinnedContent}>
                            <span className={styles.fullscreenPinnedUsername}>{m.user?.username || 'User'}</span>
                            <p className={styles.fullscreenPinnedText}>{m.text || m.message || m.content}</p>
                          </div>
                          {(isNavigator || isInitiator) && (
                            <button
                              className={styles.fullscreenUnpinBtn}
                              onClick={() => unpinMessage(m.id)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.fullscreenChatMessages}>
                    {chatMessages.filter(m => (m.message || m.content || '').trim()).length === 0 ? (
                      <div className={styles.fullscreenNoMessages}>No messages yet. Be the first!</div>
                    ) : (
                      chatMessages.filter(m => (m.message || m.content || '').trim()).map((m, i) => {
                        const isOwn = m.user?.id === currentUserId || m.userId === currentUserId;
                        return (
                          <div
                            key={m.id || i}
                            className={`${styles.fullscreenChatMsg} ${isOwn ? styles.fullscreenChatMsgOwn : styles.fullscreenChatMsgOther}`}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <span className={styles.fullscreenChatUsername}>{m.user?.username || m.username || 'User'}</span>
                                <p className={styles.fullscreenChatText}>{m.message || m.content}</p>
                              </div>
                              {(isNavigator || isInitiator) && (
                                <button
                                  className={styles.pinBtn}
                                  onClick={() => pinMessage(m.id)}
                                  title="Pin"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ffc800',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    padding: '2px 4px',
                                    marginLeft: '8px',
                                    opacity: 0.6,
                                    transition: 'opacity 0.2s',
                                    flexShrink: 0,
                                  }}
                                >📌</button>
                              )}
                            </div>
                            <span className={styles.fullscreenChatTime}>
                              {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className={styles.fullscreenChatInputArea}>
                    <div className={styles.fullscreenChatInputWrapper}>
                      <input
                        className={styles.fullscreenChatInput}
                        value={chatMessage}
                        onChange={e => setChatMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                        disabled={sending}
                      />
                      {(isNavigator || isInitiator) && (
                        <div className={styles.fullscreenChatActionsWrap}>
                          <button
                            className={styles.fullscreenChatActionBtn}
                            onClick={() => setShowChatQuickActions(v => !v)}
                            title="Actions"
                          >
                            +
                          </button>
                          {showChatQuickActions && (
                            <div className={styles.fullscreenChatQuickMenu}>
                              <button
                                className={styles.fullscreenChatQuickItem}
                                onClick={() => {
                                  setShowChatQuickActions(false);
                                  setShowAddTaskModal(true);
                                }}
                              >
                                Add task
                              </button>
                              <button
                                className={styles.fullscreenChatQuickItem}
                                onClick={() => {
                                  setShowChatQuickActions(false);
                                  setShowProposeTaskModal(true);
                                }}
                              >
                                Create poll
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        className={styles.fullscreenChatSendBtn}
                        onClick={handleSendMessage}
                        disabled={sending || !chatMessage.trim()}
                      >
                        ➤
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Team Chat */}
              {activeChat === 'team' && hasTeamChatAccess && (
                <>
                  <div className={styles.fullscreenChatMessages}>
                    {teamMessages.filter(m => (m.text || '').trim()).length === 0 ? (
                      <div className={styles.fullscreenNoMessages}>No team messages yet.</div>
                    ) : (
                      teamMessages.filter(m => (m.text || '').trim()).map((m, i) => {
                        const isOwn = m.sender?.id === currentUserId || m.senderId === currentUserId;
                        return (
                          <div
                            key={m.id || i}
                            className={`${styles.fullscreenChatMsg} ${isOwn ? styles.fullscreenChatMsgOwn : styles.fullscreenChatMsgOther}`}
                          >
                            <span className={styles.fullscreenChatUsername}>{m.sender?.login || m.sender?.email || 'User'}</span>
                            <p className={styles.fullscreenChatText}>{m.text}</p>
                            <span className={styles.fullscreenChatTime}>
                              {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={teamChatEndRef} />
                  </div>
                  <div className={styles.fullscreenChatInputArea}>
                    <div className={styles.fullscreenChatInputWrapper}>
                      <input
                        className={styles.fullscreenChatInput}
                        value={teamChatMessage}
                        onChange={e => setTeamChatMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendTeamMessage()}
                        placeholder="Team message..."
                      />
                      <button
                        className={styles.fullscreenChatSendBtn}
                        onClick={handleSendTeamMessage}
                        disabled={!teamChatMessage.trim()}
                      >
                        ➤
                      </button>
                    </div>
                  </div>
                </>
              )}
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


