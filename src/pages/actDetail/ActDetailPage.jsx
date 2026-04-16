import React, { useCallback, useEffect, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import api from "../../shared/api/api";
import { SpotAgentSection } from "../../shared/ui/SpotAgent";
import { buildPreviewUrl } from "../../shared/utils/previewUrl";
import defaultActImage from '../../images/act_back_default.png';
import styles from "./ActDetailPage.module.css";

export default function ActDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [act, setAct] = useState(location.state?.act || null);
  const [loading, setLoading] = useState(!location.state?.act);
  const [error, setError] = useState(null);

  const fetchAct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/act/find-by-id/${id}`);
      setAct(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load act");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    document.body.classList.add("no-overlay");
    return () => {
      document.body.classList.remove("no-overlay");
    };
  }, []);

  useEffect(() => {
    if (!act && id) {
      fetchAct();
    }
  }, [act, id, fetchAct]);

  const handleWatchStream = () => {
    navigate(`/stream/${id}`, { state: { act } });
  };

  const handleBack = () => {
    navigate("/acts");
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error || !act) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error || "Act not found"}</p>
          <button onClick={handleBack}>Back to Acts</button>
        </div>
      </div>
    );
  }

  console.log("Act data:", act);
  console.log("Spot Agent Count:", act.spotAgentCount);
  console.log("Spot Agent Methods:", act.spotAgentMethods);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          ← Back
        </button>
        <h1>{act.title || act.name}</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.mainInfo}>
          {(act.previewFileName || act.photo) && (
            <div className={styles.preview}>
              <img
                src={buildPreviewUrl(act.previewFileName) || act.photo || defaultActImage}
                alt={act.title}
                onError={(e) => {
                  e.currentTarget.src = defaultActImage;
                }}
              />
            </div>
          )}

          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span className={styles.label}>Type:</span>
              <span>{act.type || "Not specified"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Format:</span>
              <span>{act.format || "Not specified"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Status:</span>
              <span
                className={`${styles.status} ${styles[act.status?.toLowerCase()]}`}
              >
                {act.status || "Unknown"}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Hero Selection:</span>
              <span>{act.heroMethods || "Not specified"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Navigator Selection:</span>
              <span>{act.navigatorMethods || "Not specified"}</span>
            </div>
            {(act.spotAgentCount > 0 || act.spotAgentCount === 0) && (
              <>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Spot Agents Needed:</span>
                  <span>{act.spotAgentCount ?? "Not specified"}</span>
                </div>
                {act.spotAgentCount > 0 && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Spot Agent Selection:</span>
                    <span>{act.spotAgentMethods || "Not specified"}</span>
                  </div>
                )}
              </>
            )}
            <div className={styles.detailRow}>
              <span className={styles.label}>Bidding Time:</span>
              <span>
                {act.biddingTime && !isNaN(new Date(act.biddingTime).getTime())
                  ? new Date(act.biddingTime).toLocaleString()
                  : "Not set"}
              </span>
            </div>
          </div>

          {act.status === "ONLINE" && (
            <button className={styles.watchButton} onClick={handleWatchStream}>
              🎥 Watch Stream
            </button>
          )}
        </div>

        {typeof act.spotAgentCount === "number" && act.spotAgentCount > 0 ? (
          <SpotAgentSection act={act} />
        ) : (
          typeof act.spotAgentCount === "number" &&
          act.spotAgentCount === 0 && (
            <div className={styles.noSpotAgents}>
              <p>ℹ️ This act does not require Spot Agents</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
