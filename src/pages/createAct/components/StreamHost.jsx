import React, { useEffect, useMemo, useRef, useState } from "react";

import AgoraRTC from "agora-rtc-sdk-ng";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaMap, FaMusic, FaUsers } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { MdCameraswitch, MdChecklistRtl } from "react-icons/md";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import { toast } from "react-toastify";

import api from "../../../shared/api/api";
import { useSpotAgent } from "../../../shared/hooks/useSpotAgent";
import { useAuthStore } from "../../../shared/stores/authStore";
import { VideoEffectsProcessor } from "../../../shared/utils/videoEffects";
import useChat from "../../acts/hooks/useChat";
import styles from "./StreamHost.module.css";

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

const StreamHost = ({
  actId,
  actTitle,
  onStopStream,
  startLocation,
  destinationLocation,
  routeCoordinates,
}) => {
  console.log("StreamHost received props:", {
    actId,
    actTitle,
    typeof: typeof actId,
    startLocation,
    destinationLocation,
    routeCoordinates,
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [actData, setActData] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showOutro, setShowOutro] = useState(false);
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0);
  const [facingMode, setFacingMode] = useState("user");

  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [localStartLocation, setLocalStartLocation] = useState(
    startLocation || null,
  );
  const [localDestinationLocation, setLocalDestinationLocation] = useState(
    destinationLocation || null,
  );
  const [localRouteCoordinates, setLocalRouteCoordinates] = useState(
    routeCoordinates || null,
  );
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Music controls state
  const [showMusicControls, setShowMusicControls] = useState(false);
  const [musicVolume, setMusicVolume] = useState(50);

  // Spot Agent state
  const [isSpotAgentModalOpen, setIsSpotAgentModalOpen] = useState(false);
  const [taskInputs, setTaskInputs] = useState({});
  const [showTaskInputForCandidate, setShowTaskInputForCandidate] = useState(
    {},
  );

  // Spot Agent hook
  const {
    candidates,
    assignedAgents,
    loading: spotAgentLoading,
    error: spotAgentError,
    fetchCandidates,
    fetchAssigned,
    assign,
    remove,
  } = useSpotAgent(actId);

  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const {
    messages: chatMessages,
    sendMessage,
    sending,
    isConnected,
    fetchMessages,
  } = useChat(actId);

  useEffect(() => {
    console.log("StreamHost чат:", {
      actId,
      chatMessagesCount: chatMessages?.length || 0,
      isConnected,
      messages: chatMessages,
    });
  }, [actId, chatMessages, isConnected]);

  const localVideoRef = useRef(null);
  const sourceVideoRef = useRef(null);
  const introVideoRef = useRef(null);
  const outroVideoRef = useRef(null);
  const musicAudioRef = useRef(null);
  const clientRef = useRef(null);
  const localTracksRef = useRef({});
  const effectsProcessorRef = useRef(null);
  const isInitializingRef = useRef(false);
  const isStreamingStartedRef = useRef(false);

  const { user } = useAuthStore();

  // Extract user ID (use user.id first, then from token)
  const baseUserId = useMemo(() => {
    if (user?.id) {
      return user.id;
    } else if (user?.token) {
      const tokenData = parseJWT(user.token);
      return tokenData?.sub || tokenData?.id || 999999;
    }
    return 999999;
  }, [user]);

  const userId = useMemo(() => {
    const randomComponent = Math.floor(Math.random() * 100);
    const uid = actId
      ? parseInt(actId) * 1000000 + baseUserId * 100 + randomComponent
      : Math.floor(Date.now() / 1000) * 1000000 +
        baseUserId * 100 +
        randomComponent;

    window.__STREAM_UIDS__ = window.__STREAM_UIDS__ || {};
    window.__STREAM_UIDS__[`${uid}_host`] = Date.now();

    return uid;
  }, [actId, baseUserId]);

  console.log(
    "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "color: #FFD700; font-weight: bold; font-size: 14px;",
  );
  console.log(
    "%c🎥 STREAM HOST - UNIQUE UID GENERATED (useMemo)",
    "color: #FFD700; font-weight: bold; font-size: 18px; background: #000; padding: 10px;",
  );
  console.log(
    "%cActID: %c" + actId + "%c | BaseUserID: %c" + baseUserId,
    "color: #FFD700; font-weight: bold;",
    "color: #00FF00; font-weight: bold; font-size: 16px;",
    "color: #FFD700; font-weight: bold;",
    "color: #00FF00; font-weight: bold; font-size: 16px;",
  );
  console.log(
    "%c>>> UNIQUE UID: %c" + userId + " %c(with random component)",
    "color: #FFD700; font-weight: bold; font-size: 16px;",
    "color: #FF00FF; font-weight: bold; font-size: 24px; text-shadow: 0 0 10px #FF00FF;",
    "color: #00FFFF; font-weight: bold; font-size: 14px;",
  );
  console.log(
    "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "color: #FFD700; font-weight: bold; font-size: 14px;",
  );

  // Generate channel ID based on actId
  const channelName = actId ? `act_${actId}` : `temp_${Date.now()}`;

  useEffect(() => {
    document.body.classList.add("no-overlay");
    return () => {
      document.body.classList.remove("no-overlay");

      // Clear UID when component unmounts
      const uidKey = `${userId}_host`;
      if (window.__STREAM_UIDS__ && window.__STREAM_UIDS__[uidKey]) {
        delete window.__STREAM_UIDS__[uidKey];
        console.log(
          "UID cleared on unmount: " + userId,
          "color: #FFA500; font-weight: bold;",
        );
      }
    };
  }, [userId]);

  // Fetch act data to get intro/outro
  useEffect(() => {
    const fetchActData = async () => {
      if (!actId || actId === "undefined") return;

      try {
        console.log("Fetching act data for actId:", actId);
        const response = await api.get(`/act/find-by-id/${actId}`);
        setActData(response.data);
        console.log("Act data received:", response.data);
        console.log("Intro:", response.data?.intro);
        console.log("Outro:", response.data?.outro);
        console.log("Musics:", response.data?.musics);
      } catch (err) {
        console.error("Error fetching act data:", err);
      }
    };

    fetchActData();
  }, [actId]);

  useEffect(() => {
    // Get token for stream
    const getStreamToken = async () => {
      if (!actId || actId === "undefined") {
        console.error("Cannot initialize stream: actId is invalid", actId);
        return;
      }

      // Prevent multiple initialization
      if (isInitializingRef.current) {
        console.log("Already initializing, skipping...");
        return;
      }

      console.log(
        "%c╔═══════════════════════════════════════════════════════════════╗",
        "color: #00FF00; font-weight: bold; font-size: 16px;",
      );
      console.log(
        "%c║               STARTING STREAM WITH UNIQUE UID              ║",
        "color: #00FF00; font-weight: bold; font-size: 20px; background: #000; padding: 10px;",
      );
      console.log(
        "%c║  UID: " +
          userId +
          "                                             ║",
        "color: #00FF00; font-weight: bold; font-size: 16px;",
      );
      console.log(
        "%c╚═══════════════════════════════════════════════════════════════╝",
        "color: #00FF00; font-weight: bold; font-size: 16px;",
      );

      isInitializingRef.current = true;

      try {
        console.log(
          "Getting stream token for channel:",
          channelName,
          "userId:",
          userId,
        );

        // Get token from backend for publisher (streamer)
        const response = await api.get(
          `/act/token/${channelName}/PUBLISHER/uid?uid=${userId}&expiry=3600`,
        );
        setToken(response.data.token);

        console.log("Token received:", response.data.token);

        // Automatically start stream only once
        if (!isStreamingStartedRef.current) {
          isStreamingStartedRef.current = true;
          console.log("Starting stream automatically...");
          await startStreaming();
        }
      } catch (err) {
        console.error("Error getting stream token:", err);
        setError("Failed to get stream token");
      } finally {
        isInitializingRef.current = false;
      }
    };

    getStreamToken();

    // Cleanup on unmount
    return () => {
      isInitializingRef.current = false;
      isStreamingStartedRef.current = false;
      if (isStreaming) {
        stopStreaming();
      }
      stopCameraPreview();
      stopBackgroundMusic();

      if (effectsProcessorRef.current) {
        effectsProcessorRef.current.stop();
        effectsProcessorRef.current = null;
      }

      if (sourceVideoRef.current) {
        sourceVideoRef.current.srcObject = null;
        if (sourceVideoRef.current.parentNode) {
          document.body.removeChild(sourceVideoRef.current);
        }
        sourceVideoRef.current = null;
      }
    };
  }, [actId, channelName, userId]);

  // Fetch spot agent data when actData is loaded
  useEffect(() => {
    if (actData?.spotAgentCount > 0) {
      fetchCandidates();
      fetchAssigned();
    }
  }, [actData?.spotAgentCount, fetchCandidates, fetchAssigned]);

  // Poll for new spot agent candidates every 10 seconds
  useEffect(() => {
    if (!actData?.spotAgentCount || actData.spotAgentCount <= 0) return;

    const pollInterval = setInterval(() => {
      fetchCandidates();
      fetchAssigned();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [actData?.spotAgentCount, fetchCandidates, fetchAssigned]);

  useEffect(() => {
    if (!actData) return;

    // Derive start/destination if not provided via props
    if (!startLocation && actData.startLatitude && actData.startLongitude) {
      setLocalStartLocation({
        latitude: actData.startLatitude,
        longitude: actData.startLongitude,
      });
    } else if (startLocation) {
      setLocalStartLocation(startLocation);
    }

    // Destination is the LAST point from routePoints array
    if (
      actData.routePoints &&
      Array.isArray(actData.routePoints) &&
      actData.routePoints.length > 0
    ) {
      const sorted = [...actData.routePoints].sort(
        (a, b) => (a.order || 0) - (b.order || 0),
      );
      const lastPoint = sorted[sorted.length - 1];
      setLocalDestinationLocation({
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
      });

      // Build route: start → routePoints → destination
      if (actData.startLatitude && actData.startLongitude) {
        (async () => {
          try {
            const waypoints = [];
            waypoints.push(
              `${actData.startLongitude},${actData.startLatitude}`,
            );

            sorted.forEach((p) => {
              waypoints.push(`${p.longitude},${p.latitude}`);
            });

            const waypointsString = waypoints.join(";");

            const response = await fetch(
              `https://router.project-osrm.org/route/v1/foot/${waypointsString}?overview=full&geometries=geojson`,
            );
            const data = await response.json();
            if (data.routes && data.routes[0]) {
              const coords = data.routes[0].geometry.coordinates.map((c) => [
                c[1],
                c[0],
              ]);
              setLocalRouteCoordinates(coords);
            }
          } catch (err) {
            console.error("Error fetching OSRM route through all points:", err);
          }
        })();
      }
    } else if (
      !destinationLocation &&
      actData.destinationLatitude &&
      actData.destinationLongitude
    ) {
      setLocalDestinationLocation({
        latitude: actData.destinationLatitude,
        longitude: actData.destinationLongitude,
      });
    } else if (destinationLocation) {
      setLocalDestinationLocation(destinationLocation);
    }

    if (
      !(
        actData.routePoints &&
        Array.isArray(actData.routePoints) &&
        actData.routePoints.length > 0
      ) &&
      actData.startLatitude &&
      actData.startLongitude &&
      actData.destinationLatitude &&
      actData.destinationLongitude
    ) {
      (async () => {
        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/foot/${actData.startLongitude},${actData.startLatitude};${actData.destinationLongitude},${actData.destinationLatitude}?overview=full&geometries=geojson`,
          );
          const data = await response.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c) => [
              c[1],
              c[0],
            ]);
            setLocalRouteCoordinates(coords);
          }
        } catch (err) {
          console.error("Error fetching OSRM route:", err);
        }
      })();
    }
  }, [actData, startLocation, destinationLocation]);

  const startCameraPreview = async () => {
    try {
      console.log("Starting camera preview...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log("Camera preview started successfully");
      }

      localTracksRef.current.previewStream = stream;
    } catch (err) {
      console.error("Error starting camera preview:", err);
      setError("Failed to access camera: " + err.message);
    }
  };

  const stopCameraPreview = () => {
    try {
      if (localTracksRef.current.previewStream) {
        localTracksRef.current.previewStream.getTracks().forEach((track) => {
          track.stop();
        });
        localTracksRef.current.previewStream = null;
        console.log("Camera preview stopped");
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    } catch (err) {
      console.error("Error stopping camera preview:", err);
    }
  };

  // Start background music
  const startBackgroundMusic = () => {
    if (!actData?.musics || actData.musics.length === 0) {
      console.log("No background music available");
      return;
    }

    const musicAudio = musicAudioRef.current;
    if (!musicAudio) {
      console.error("Music audio ref is not available");
      return;
    }

    const sortedMusic = [...actData.musics].sort((a, b) => {
      const orderA = a.order ?? a.ActMusic?.order ?? 0;
      const orderB = b.order ?? b.ActMusic?.order ?? 0;
      return orderA - orderB;
    });

    const firstMusic = sortedMusic[0];
    const musicUrl = firstMusic.fileName || firstMusic.music?.fileName;

    if (!musicUrl) {
      console.error("No music file URL found");
      return;
    }

    console.log("Starting background music:", musicUrl);

    musicAudio.src = musicUrl;
    musicAudio.volume = 0.25;
    musicAudio.loop = false;

    musicAudio.onended = () => {
      const nextIndex = (currentMusicIndex + 1) % sortedMusic.length;
      setCurrentMusicIndex(nextIndex);
      const nextMusic = sortedMusic[nextIndex];
      const nextMusicUrl = nextMusic.fileName || nextMusic.music?.fileName;

      console.log("Playing next music track:", nextMusicUrl);
      musicAudio.src = nextMusicUrl;
      musicAudio
        .play()
        .catch((err) => console.error("Error playing next music:", err));
    };

    musicAudio.onerror = (e) => {
      console.error("Music playback error:", e);
      console.error("Music source:", musicAudio.src);
    };

    musicAudio.onloadstart = () => {
      console.log("Music loading started:", musicAudio.src);
    };

    musicAudio.oncanplay = () => {
      console.log("Music can play:", musicAudio.src);
    };

    musicAudio
      .play()
      .then(() => {
        console.log("Background music started successfully");
      })
      .catch((err) => {
        console.error("Error playing background music:", err);
        console.error("Music data:", firstMusic);
        console.error("Music URL:", musicUrl);
      });
  };

  // Stop background music
  const stopBackgroundMusic = () => {
    const musicAudio = musicAudioRef.current;
    if (musicAudio) {
      musicAudio.pause();
      musicAudio.currentTime = 0;
      musicAudio.src = "";
      console.log("Background music stopped");
    }
  };

  // Play intro video and stream it via Agora
  const playIntroStream = async (client, audioTrack) => {
    return new Promise(async (resolve) => {
      const introUrl =
        actData?.intro?.fileName || actData?.intro?.intro?.fileName;

      if (!introUrl) {
        console.log("No intro video available, skipping...");
        resolve();
        return;
      }

      try {
        console.log("Playing intro video:", introUrl);
        setShowIntro(true);
        const introVideo = introVideoRef.current;

        if (!introVideo) {
          console.error("Intro video ref is not available");
          resolve();
          return;
        }

        introVideo.src = introUrl;
        introVideo.muted = false;

        await introVideo.play();
        console.log("Intro video playing");

        const stream = introVideo.captureStream();
        const videoTrack = stream.getVideoTracks()[0];
        const audioTracks = stream.getAudioTracks();

        if (!videoTrack) {
          console.error("Failed to capture video track from intro");
          setShowIntro(false);
          await client.publish([audioTrack]);
          resolve();
          return;
        }

        const agoraVideoTrack = AgoraRTC.createCustomVideoTrack({
          mediaStreamTrack: videoTrack,
        });

        if (audioTracks.length > 0) {
          const agoraAudioTrack = AgoraRTC.createCustomAudioTrack({
            mediaStreamTrack: audioTracks[0],
          });
          await client.publish([agoraVideoTrack, agoraAudioTrack]);
          console.log("Intro video and audio tracks published");

          introVideo.onended = async () => {
            console.log("Intro ended, switching to camera and microphone");
            await client.unpublish([agoraVideoTrack, agoraAudioTrack]);
            agoraVideoTrack.stop();
            agoraVideoTrack.close();
            agoraAudioTrack.stop();
            agoraAudioTrack.close();
            await client.publish([audioTrack]);
            setShowIntro(false);
            resolve();
          };
        } else {
          await client.publish([agoraVideoTrack, audioTrack]);
          console.log("Intro video track and microphone published");

          introVideo.onended = async () => {
            console.log("Intro ended, switching to camera");
            await client.unpublish([agoraVideoTrack]);
            agoraVideoTrack.stop();
            agoraVideoTrack.close();
            setShowIntro(false);
            resolve();
          };
        }

        if (localVideoRef.current) {
          agoraVideoTrack.play(localVideoRef.current);
        }
      } catch (err) {
        console.error("Error playing intro:", err);
        setShowIntro(false);
        resolve();
      }
    });
  };

  // Play outro video and stream it via Agora
  const playOutroStream = async (client) => {
    return new Promise(async (resolve) => {
      const outroUrl =
        actData?.outro?.fileName || actData?.outro?.outro?.fileName;

      if (!outroUrl) {
        console.log("No outro video available, skipping...");
        resolve();
        return;
      }

      try {
        console.log("Playing outro video:", outroUrl);

        if (localTracksRef.current.videoTrack) {
          await client.unpublish([localTracksRef.current.videoTrack]);
          localTracksRef.current.videoTrack.stop();
          localTracksRef.current.videoTrack.close();
        }

        setShowOutro(true);
        const outroVideo = outroVideoRef.current;

        if (!outroVideo) {
          console.error("Outro video ref is not available");
          resolve();
          return;
        }

        outroVideo.src = outroUrl;
        outroVideo.muted = false;

        await outroVideo.play();

        const stream = outroVideo.captureStream();
        const videoTrack = stream.getVideoTracks()[0];

        if (!videoTrack) {
          console.error("Failed to capture video track from outro");
          setShowOutro(false);
          resolve();
          return;
        }

        const agoraVideoTrack = AgoraRTC.createCustomVideoTrack({
          mediaStreamTrack: videoTrack,
        });

        await client.publish([agoraVideoTrack]);
        console.log("Outro video track published");

        if (localVideoRef.current) {
          agoraVideoTrack.play(localVideoRef.current);
        }

        outroVideo.onended = async () => {
          console.log("Outro ended");
          await client.unpublish([agoraVideoTrack]);
          agoraVideoTrack.stop();
          agoraVideoTrack.close();
          setShowOutro(false);
          resolve();
        };
      } catch (err) {
        console.error("Error playing outro:", err);
        setShowOutro(false);
        resolve();
      }
    });
  };

  const startStreaming = async () => {
    if (!token) {
      setError("No token available");
      return;
    }

    try {
      setIsStreaming(true);
      setError(null);

      console.log("Starting stream for act:", actId, "channel:", channelName);
      console.log("Act data available:", actData);

      stopCameraPreview();

      // Create Agora client
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      console.log("Agora client created, joining channel...");

      // Join channel
      await client.join(
        import.meta.env.VITE_AGORA_APP_ID,
        channelName,
        token,
        userId,
      );

      console.log("Joined channel successfully");

      // Create audio track
      console.log("Creating microphone track...");
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localTracksRef.current = { audioTrack };

      // Play intro first if available
      const introUrl =
        actData?.intro?.fileName || actData?.intro?.intro?.fileName;
      if (introUrl) {
        console.log("Intro available, playing intro before camera...");
        await playIntroStream(client, audioTrack);
      } else {
        console.log("No intro available, publishing audio immediately");
        await client.publish([audioTrack]);
      }

      // Start background music after intro
      console.log("Starting background music...");
      startBackgroundMusic();

      // After intro, start camera stream with effects
      console.log("Creating camera track with facingMode:", facingMode);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: false,
      });

      const videoTrackNative = mediaStream.getVideoTracks()[0];

      if (!sourceVideoRef.current) {
        sourceVideoRef.current = document.createElement("video");
        sourceVideoRef.current.style.display = "none";
        sourceVideoRef.current.autoplay = true;
        sourceVideoRef.current.playsInline = true;
        document.body.appendChild(sourceVideoRef.current);
      }

      sourceVideoRef.current.srcObject = mediaStream;
      await sourceVideoRef.current.play();

      console.log("Applying video effects...");

      effectsProcessorRef.current = new VideoEffectsProcessor(
        sourceVideoRef.current,
        {
          vignette: true,
          colorFilter: "warm",
          vignetteIntensity: 0.6,
          colorIntensity: 0.3,
        },
      );

      effectsProcessorRef.current.start();

      const processedStream = effectsProcessorRef.current.getStream(30);
      const processedVideoTrack = processedStream.getVideoTracks()[0];

      const videoTrack = AgoraRTC.createCustomVideoTrack({
        mediaStreamTrack: processedVideoTrack,
      });

      localTracksRef.current.videoTrack = videoTrack;
      localTracksRef.current.nativeVideoTrack = videoTrackNative;

      if (localVideoRef.current) {
        console.log("Playing local video with effects...");
        videoTrack.play(localVideoRef.current);
      }

      // Publish camera track
      console.log("Publishing camera track with effects...");
      await client.publish([videoTrack]);

      console.log("Stream started successfully with effects");
    } catch (err) {
      console.error("Error starting stream:", err);
      setError("Failed to start stream: " + err.message);
      setIsStreaming(false);
    }
  };

  const switchCamera = async () => {
    if (!isStreaming || !localTracksRef.current.videoTrack) {
      console.warn("Cannot switch camera: stream not active");
      return;
    }

    try {
      console.log("Switching camera from", facingMode);
      const newFacingMode = facingMode === "user" ? "environment" : "user";

      // Stop current video track
      localTracksRef.current.videoTrack.stop();
      localTracksRef.current.videoTrack.close();

      // Stop native track
      if (localTracksRef.current.nativeVideoTrack) {
        localTracksRef.current.nativeVideoTrack.stop();
      }

      // Stop effects processor
      if (effectsProcessorRef.current) {
        effectsProcessorRef.current.stop();
      }

      console.log("Creating new camera stream with facingMode:", newFacingMode);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

      const videoTrackNative = mediaStream.getVideoTracks()[0];

      if (sourceVideoRef.current) {
        sourceVideoRef.current.srcObject = mediaStream;
        await sourceVideoRef.current.play();
      }

      effectsProcessorRef.current = new VideoEffectsProcessor(
        sourceVideoRef.current,
        {
          vignette: true,
          colorFilter: "warm",
          vignetteIntensity: 0.6,
          colorIntensity: 0.3,
        },
      );

      effectsProcessorRef.current.start();

      const processedStream = effectsProcessorRef.current.getStream(30);
      const processedVideoTrack = processedStream.getVideoTracks()[0];

      // Create Agora track
      const newVideoTrack = AgoraRTC.createCustomVideoTrack({
        mediaStreamTrack: processedVideoTrack,
      });

      // Update reference
      localTracksRef.current.videoTrack = newVideoTrack;
      localTracksRef.current.nativeVideoTrack = videoTrackNative;

      // Play new video locally
      if (localVideoRef.current) {
        newVideoTrack.play(localVideoRef.current);
      }

      // Unpublish old track and publish new one
      if (clientRef.current) {
        await clientRef.current.unpublish();
        await clientRef.current.publish([
          localTracksRef.current.audioTrack,
          newVideoTrack,
        ]);
      }

      // Update state
      setFacingMode(newFacingMode);
      console.log(
        "Camera switched successfully to:",
        newFacingMode,
        "with effects",
      );
    } catch (err) {
      console.error("Error switching camera:", err);
      setError("Failed to switch camera: " + err.message);
    }
  };

  // Tasks functions
  const fetchTasks = async () => {
    if (!actId) return;

    try {
      setLoadingTasks(true);
      const response = await api.get(`/act/${actId}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  const toggleTaskCompletion = async (taskId) => {
    if (!actId) return;

    try {
      const response = await api.patch(`/act/${actId}/tasks/${taskId}/toggle`);
      setTasks(
        tasks.map((task) => (task.id === taskId ? response.data : task)),
      );
      toast.success(
        response.data.isCompleted ? "Task completed!" : "Task reopened",
      );
    } catch (error) {
      console.error("Error toggling task:", error);
      toast.error("Failed to update task");
    }
  };

  // Music volume handler
  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setMusicVolume(newVolume);
    console.log("Volume changed to:", newVolume);
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = newVolume / 100;
    }
  };

  // Chat handlers
  const handleSendMessage = () => {
    if (chatMessage.trim() && !sending) {
      sendMessage(chatMessage);
      setChatMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Spot Agent handlers
  const handleAssignSpotAgent = async (candidate) => {
    if (showTaskInputForCandidate[candidate.id]) {
      // User clicked "Confirm" - proceed with assignment
      try {
        await assign(candidate.userId, taskInputs[candidate.id] || "");
        setShowTaskInputForCandidate({
          ...showTaskInputForCandidate,
          [candidate.id]: false,
        });
        setTaskInputs({ ...taskInputs, [candidate.id]: "" });
        toast.success(
          `${candidate.user?.login || "User"} assigned as Spot Agent`,
        );
      } catch (err) {
        toast.error(err.message || "Failed to assign Spot Agent");
      }
    } else {
      // Show task input
      setShowTaskInputForCandidate({
        ...showTaskInputForCandidate,
        [candidate.id]: true,
      });
    }
  };

  const handleRemoveSpotAgent = async (spotAgentId) => {
    try {
      await remove(spotAgentId);
      toast.success("Spot Agent removed");
    } catch (err) {
      toast.error(err.message || "Failed to remove Spot Agent");
    }
  };

  // Load tasks when modal opens
  useEffect(() => {
    if (isTasksModalOpen) {
      fetchTasks();
    }
  }, [isTasksModalOpen]);

  const stopStreaming = async () => {
    try {
      console.log("Stopping stream for act:", actId);

      stopBackgroundMusic();

      if (actData?.outro?.fileName && clientRef.current) {
        await playOutroStream(clientRef.current);
      }

      if (localTracksRef.current.audioTrack) {
        localTracksRef.current.audioTrack.stop();
        localTracksRef.current.audioTrack.close();
      }
      if (localTracksRef.current.videoTrack) {
        localTracksRef.current.videoTrack.stop();
        localTracksRef.current.videoTrack.close();
      }

      if (localTracksRef.current.nativeVideoTrack) {
        localTracksRef.current.nativeVideoTrack.stop();
        localTracksRef.current.nativeVideoTrack = null;
      }

      if (effectsProcessorRef.current) {
        effectsProcessorRef.current.stop();
        effectsProcessorRef.current = null;
      }

      if (sourceVideoRef.current) {
        sourceVideoRef.current.srcObject = null;
        if (sourceVideoRef.current.parentNode) {
          document.body.removeChild(sourceVideoRef.current);
        }
        sourceVideoRef.current = null;
      }

      if (clientRef.current) {
        await clientRef.current.leave();
      }

      // Clear UID from conflict detection
      const uidKey = `${userId}_host`;
      if (window.__STREAM_UIDS__ && window.__STREAM_UIDS__[uidKey]) {
        delete window.__STREAM_UIDS__[uidKey];
        console.log("UID cleared from conflict detection: " + userId);
      }

      localTracksRef.current = {};
      clientRef.current = null;

      // Send stop-act request to backend
      try {
        if (actId && actId !== "undefined") {
          await api.post(`/act/stop-act?id=${actId}`);
          console.log("Stop-act request sent successfully");
        } else {
          console.warn(
            "Skipping stop-act request: actId is undefined or invalid:",
            actId,
          );
        }
      } catch (apiError) {
        console.error("Error sending stop-act request:", apiError);
      }

      setIsStreaming(false);

      if (onStopStream) {
        onStopStream();
      }

      console.log("Stream stopped successfully");
    } catch (err) {
      console.error("Error stopping stream:", err);
      setError("Failed to stop stream: " + err.message);
    }
  };

  return (
    <div className={styles.container}>
      {!actId || actId === "undefined" ? (
        <div className={styles.errorContainer}>
          <h2>Stream Setup Error</h2>
          <p>Unable to initialize stream: Act ID is missing or invalid.</p>
          <p>Please try creating a new act.</p>
          <button className={styles.button} onClick={onStopStream}>
            Go Back
          </button>
        </div>
      ) : (
        <>
          <div className={styles.infoBox}>
            <p>
              <strong>Status:</strong>{" "}
              {isStreaming ? (
                <span className={styles.statusLive}>🔴 LIVE</span>
              ) : (
                <span className={styles.statusPreparing}>⚪ OFFLINE</span>
              )}
            </p>
            {showIntro && (
              <p>
                <strong>▶️ Playing Intro Video</strong>
              </p>
            )}
            {showOutro && (
              <p>
                <strong>▶️ Playing Outro Video</strong>
              </p>
            )}
            {isStreaming &&
              !showIntro &&
              !showOutro &&
              actData?.musics?.length > 0 && (
                <p>
                  <strong>🎵 Background Music Playing</strong>
                </p>
              )}
          </div>
          <div className={styles.videoContainer}>
            <video
              ref={introVideoRef}
              crossOrigin="anonymous"
              playsInline
              style={{ display: "none" }}
            />

            <video
              ref={outroVideoRef}
              crossOrigin="anonymous"
              playsInline
              style={{ display: "none" }}
            />

            <audio
              ref={musicAudioRef}
              crossOrigin="anonymous"
              style={{ display: "none" }}
            />

            <div
              ref={localVideoRef}
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          </div>

          <div className={styles.controls}>
            <button
              className={styles.button}
              onClick={isStreaming ? stopStreaming : startStreaming}
              disabled={isInitializingRef.current}
            >
              {isStreaming ? "Stop Stream" : "Start Stream"}
            </button>
            <button
              className={styles.button}
              onClick={switchCamera}
              disabled={!isStreaming || isInitializingRef.current}
              title="Switch Camera"
            >
              <MdCameraswitch size={20} /> Flip Camera
            </button>
            <button
              className={styles.button}
              onClick={() => setIsTasksModalOpen(true)}
              title="Stream Tasks"
            >
              <MdChecklistRtl size={20} /> Tasks
            </button>
          </div>

          <div className={styles.controls}>
            {(startLocation || destinationLocation || routeCoordinates) && (
              <button
                className={styles.button}
                onClick={() => setIsMapModalOpen(true)}
                title="View Route Map"
              >
                <FaMap size={18} /> Map
              </button>
            )}
            {actData?.musics && actData.musics.length > 0 && (
              <button
                className={styles.button}
                onClick={() => setShowMusicControls(true)}
                title="Music Controls"
              >
                <FaMusic size={18} /> Music
              </button>
            )}
            {actData?.spotAgentCount > 0 && (
              <button
                className={`${styles.button} ${styles.spotAgentButton}`}
                onClick={() => setIsSpotAgentModalOpen(true)}
                title="Manage Spot Agents"
              >
                <FaUsers size={18} /> Spot Agents ({assignedAgents.length}/
                {actData.spotAgentCount})
              </button>
            )}
          </div>

          <div className={styles.infoText}>
            <p>
              {isStreaming
                ? "Your camera and microphone are now live!"
                : 'Click "Start Stream" to go live. Make sure your camera and microphone are connected.'}
            </p>
          </div>

          <div className={styles.chatSection}>
            <div className={styles.chatHeader}>
              <h3>Stream Chat</h3>
              <span className={styles.connectionStatus}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className={styles.chatMessages}>
              {chatMessages && chatMessages.length > 0 ? (
                chatMessages.map((message) => (
                  <div key={message.id} className={styles.chatMessage}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageUsername}>
                        {message.user?.username || "User"}
                      </span>
                      <span className={styles.messageTime}>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className={styles.messageText}>
                      {message.content || message.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className={styles.noChatMessages}>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
            </div>
            <div className={styles.chatInputContainer}>
              <input
                type="text"
                className={styles.chatInput}
                placeholder={
                  isConnected ? "Type your message..." : "Connecting to chat..."
                }
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!isConnected}
              />
              <button
                className={styles.chatSendButton}
                onClick={handleSendMessage}
                disabled={sending || !chatMessage.trim() || !isConnected}
              >
                <IoSend size={20} />
              </button>
            </div>
          </div>
        </>
      )}

      {isTasksModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsTasksModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Stream Tasks</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsTasksModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.tasksContainer}>
              {loadingTasks ? (
                <div className={styles.loadingTasks}>Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className={styles.noTasks}>
                  No tasks available for this stream.
                </div>
              ) : (
                <div className={styles.tasksList}>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`${styles.taskItem} ${
                        task.isCompleted ? styles.taskCompleted : ""
                      }`}
                    >
                      <div className={styles.taskCheckbox}>
                        <input
                          type="checkbox"
                          checked={task.isCompleted}
                          onChange={() => toggleTaskCompletion(task.id)}
                          id={`stream-task-${task.id}`}
                        />
                        <label htmlFor={`stream-task-${task.id}`}></label>
                      </div>
                      <div className={styles.taskContent}>
                        <span className={styles.taskTitle}>{task.title}</span>
                        {task.completedAt && (
                          <span className={styles.taskCompletedTime}>
                            Completed:{" "}
                            {new Date(task.completedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isMapModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsMapModalOpen(false)}
        >
          <div
            className={styles.mapModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Route Map</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsMapModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div style={{ height: "500px", width: "100%" }}>
              <MapContainer
                center={
                  localStartLocation
                    ? [
                        localStartLocation.latitude,
                        localStartLocation.longitude,
                      ]
                    : [55.751244, 37.618423]
                }
                zoom={13}
                style={{
                  height: "100%",
                  width: "100%",
                  filter: "grayscale(100%) invert(1)",
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                {localStartLocation && (
                  <Circle
                    center={[
                      localStartLocation.latitude,
                      localStartLocation.longitude,
                    ]}
                    radius={50}
                    pathOptions={{
                      color: "black",
                      fillColor: "black",
                      fillOpacity: 0.8,
                      weight: 2,
                    }}
                  />
                )}
                {localRouteCoordinates && (
                  <Polyline
                    positions={localRouteCoordinates}
                    pathOptions={{
                      color: "black",
                      weight: 4,
                      opacity: 0.8,
                    }}
                  />
                )}
                {actData?.routePoints &&
                  actData.routePoints.length > 0 &&
                  actData.routePoints
                    .slice()
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((pt) => {
                      const isStartPoint =
                        localStartLocation &&
                        Math.abs(pt.latitude - localStartLocation.latitude) <
                          0.0001 &&
                        Math.abs(pt.longitude - localStartLocation.longitude) <
                          0.0001;

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
          </div>
        </div>
      )}

      {showMusicControls && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowMusicControls(false)}
        >
          <div
            className={styles.musicModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Music Controls</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowMusicControls(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.musicControls}>
              <h3>Music Tracks</h3>
              {actData?.musics && actData.musics.length > 0 ? (
                <div className={styles.tracksList}>
                  {actData.musics.map((music, index) => (
                    <div
                      key={music.id || index}
                      className={`${styles.trackItem} ${
                        currentMusicIndex === index ? styles.activeTrack : ""
                      }`}
                    >
                      <span className={styles.trackNumber}>
                        Track {index + 1}
                      </span>
                      <span className={styles.trackLength}>
                        {music.length || "Unknown"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noTracks}>No music tracks available</p>
              )}

              <div className={styles.volumeControl}>
                <h3>Volume Control</h3>
                <div className={styles.volumeSlider}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={handleVolumeChange}
                    className={styles.slider}
                  />
                  <span className={styles.volumeValue}>{musicVolume}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spot Agent Management Modal */}
      {isSpotAgentModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsSpotAgentModalOpen(false)}
        >
          <div
            className={styles.spotAgentModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Manage Spot Agents</h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsSpotAgentModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.spotAgentModalBody}>
              {/* Progress indicator */}
              <div className={styles.spotAgentProgress}>
                <span className={styles.progressLabel}>Assigned:</span>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${(assignedAgents.length / actData?.spotAgentCount) * 100}%`,
                    }}
                  />
                </div>
                <span className={styles.progressCount}>
                  {assignedAgents.length}/{actData?.spotAgentCount}
                </span>
              </div>

              {spotAgentError && (
                <div className={styles.spotAgentError}>{spotAgentError}</div>
              )}

              {/* Assigned Agents Section */}
              {assignedAgents.length > 0 && (
                <div className={styles.assignedSection}>
                  <h3>✅ Assigned Spot Agents</h3>
                  <div className={styles.agentsList}>
                    {assignedAgents.map((agent) => (
                      <div key={agent.id} className={styles.assignedAgentCard}>
                        <div className={styles.agentInfo}>
                          <span className={styles.agentName}>
                            {agent.user?.login || "Unknown"}
                          </span>
                          <span className={styles.agentStatus}>
                            {agent.status}
                          </span>
                        </div>
                        {agent.task && (
                          <div className={styles.agentTask}>
                            <span className={styles.taskLabel}>Task:</span>
                            <span>{agent.task}</span>
                          </div>
                        )}
                        <button
                          className={styles.removeAgentButton}
                          onClick={() => handleRemoveSpotAgent(agent.id)}
                          disabled={spotAgentLoading}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidates Section */}
              <div className={styles.candidatesSection}>
                <h3>🙋 Candidates ({candidates.length})</h3>
                {candidates.length === 0 ? (
                  <div className={styles.noCandidates}>
                    No candidates yet. Viewers can apply to participate.
                  </div>
                ) : (
                  <div className={styles.candidatesList}>
                    {[...candidates]
                      .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
                      .map((candidate) => (
                        <div
                          key={candidate.id}
                          className={styles.candidateCard}
                        >
                          <div className={styles.candidateInfo}>
                            <span className={styles.candidateName}>
                              {candidate.user?.login || "Unknown"}
                            </span>
                            {actData?.spotAgentMethods === "VOTING" && (
                              <span className={styles.voteCount}>
                                {candidate.voteCount || 0} votes
                              </span>
                            )}
                          </div>
                          <span className={styles.appliedAt}>
                            Applied:{" "}
                            {new Date(candidate.appliedAt).toLocaleString()}
                          </span>

                          {assignedAgents.length < actData?.spotAgentCount && (
                            <div className={styles.assignSection}>
                              {showTaskInputForCandidate[candidate.id] && (
                                <input
                                  type="text"
                                  placeholder="Task (optional)"
                                  value={taskInputs[candidate.id] || ""}
                                  onChange={(e) =>
                                    setTaskInputs({
                                      ...taskInputs,
                                      [candidate.id]: e.target.value,
                                    })
                                  }
                                  className={styles.taskInput}
                                />
                              )}
                              <button
                                className={styles.assignButton}
                                onClick={() => handleAssignSpotAgent(candidate)}
                                disabled={spotAgentLoading}
                              >
                                {showTaskInputForCandidate[candidate.id]
                                  ? "Confirm"
                                  : "Assign"}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamHost;
