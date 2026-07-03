import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Hls from "hls.js";
import { actApi } from "../../shared/api/act";
import styles from "./ActWatch.module.css";
import arrowLeft from "../../images/arrow-left.png";
import { useT } from "../../shared/hooks/useT";

function formatStreamOffset(seconds) {
  const sec = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ActWatch() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const chatEndRef = useRef(null);

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [playbackTime, setPlaybackTime] = useState(0);

  const visibleMessages = useMemo(
    () =>
      chatMessages.filter(
        (msg) => (msg.streamOffsetSec ?? 0) <= playbackTime + 0.25,
      ),
    [chatMessages, playbackTime],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages.length]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlaybackTime(video.currentTime);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const playback = await actApi.getRecordingPlayback(id);
        if (cancelled) return;

        setTitle(playback.title || "Watch Act");
        setChatMessages(
          Array.isArray(playback.chatMessages) ? playback.chatMessages : [],
        );

        const video = videoRef.current;
        if (!video) return;

        const { url, format } = playback;

        if (format === "hls" && Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data?.fatal) {
              setError("Failed to play recording");
            }
          });
        } else if (
          format === "hls" &&
          video.canPlayType("application/vnd.apple.mpegurl")
        ) {
          video.src = url;
          video.addEventListener("loadedmetadata", () => {
            video.play().catch(() => {});
          });
        } else {
          video.src = url;
          video.addEventListener("loadedmetadata", () => {
            video.play().catch(() => {});
          });
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            "Recording is not available";
          setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [id]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img
          src={arrowLeft}
          alt={t("streamBackToActs")}
          onClick={() => navigate(`/acts/${id}`)}
          className={styles.backBtn}
        />
        <h1 className={styles.title}>{title || t("watchAct")}</h1>
      </div>

      <div className={styles.contentWrapper}>
        {loading && (
          <div className={styles.loadingBox}>
            <p className={styles.statusText}>{t("actWatchLoading")}</p>
          </div>
        )}
        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.videoCard}>
          <video
            ref={videoRef}
            controls
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleTimeUpdate}
            className={`${styles.video} ${loading || error ? styles.videoHidden : ""}`}
          />
        </div>

        {!loading && !error && (
          <div className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <span>{t("chatTitle")}</span>
              <span className={styles.chatTime}>
                {formatStreamOffset(playbackTime)}
              </span>
            </div>
            <div className={styles.chatMessages}>
              {visibleMessages.length === 0 ? (
                <p className={styles.chatEmpty}>{t("chatNoMessages")}</p>
              ) : (
                visibleMessages.map((msg) => (
                  <div key={msg.id} className={styles.chatMessage}>
                    <div className={styles.chatMessageMeta}>
                      <span className={styles.chatAuthor}>
                        {msg.user?.username || "—"}
                      </span>
                      <span className={styles.chatOffset}>
                        {formatStreamOffset(msg.streamOffsetSec)}
                      </span>
                    </div>
                    <p className={styles.chatText}>
                      {msg.text || msg.message}
                    </p>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
