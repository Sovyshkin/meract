import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Hls from "hls.js";
import { actApi } from "../../shared/api/act";
import styles from "./ActsDetail.module.css";
import arrowLeft from "../../images/arrow-left.png";

export default function ActWatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [title, setTitle] = useState("Act recording");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const playback = await actApi.getRecordingPlayback(id);
        if (cancelled) return;

        setTitle(playback.title || "Act recording");
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
    <div className={styles.container} style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src={arrowLeft}
          alt="back"
          onClick={() => navigate(`/acts/${id}`)}
          style={{ cursor: "pointer", width: 24, height: 24 }}
        />
        <h1 style={{ color: "#fff", fontSize: 18, margin: 0, fontFamily: "Oxanium, sans-serif" }}>
          {title}
        </h1>
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        {loading && (
          <p style={{ color: "#888", textAlign: "center" }}>Loading recording...</p>
        )}
        {error && (
          <p style={{ color: "#ff6b6b", textAlign: "center" }}>{error}</p>
        )}
        <video
          ref={videoRef}
          controls
          playsInline
          style={{
            width: "100%",
            maxHeight: "70vh",
            background: "#000",
            borderRadius: 8,
            display: loading || error ? "none" : "block",
          }}
        />
      </div>
    </div>
  );
}
