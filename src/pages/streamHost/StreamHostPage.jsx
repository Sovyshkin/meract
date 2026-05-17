import React from "react";

import { useNavigate, useParams } from "react-router-dom";

import StreamHost from "../createAct/components/StreamHost";
import styles from "./StreamHostPage.module.css";

export default function StreamHostPage() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  console.log("StreamHostPage - URL params:", { id });
  console.log("StreamHostPage - Current URL:", window.location.href);

  if (!id) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate("/acts")}
          >
            ← Back to Acts
          </button>
          <h1 className={styles.title}>Live Streaming</h1>
        </div>
        <div className={styles.streamContent}>
          <div
            style={{
              color: "white",
              textAlign: "center",
              padding: "2rem",
              fontSize: "1.2rem",
            }}
          >
            <h2>Error: No Act ID provided</h2>
            <p>Please select a valid act to start streaming.</p>
            <button
              onClick={() => window.history.back()}
              style={{
                padding: "10px 20px",
                marginTop: "1rem",
                backgroundColor: "#63d4ff",
                border: "none",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer",
              }}
            >
              Go to Acts
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleStopStream = () => {
    navigate("/acts");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => window.history.back()}>
          ← Back
        </button>
        <h1 className={styles.title}>Live Streaming</h1>
      </div>

      <div className={styles.streamContent}>
        <StreamHost
          actId={id}
          actTitle={`Act ${id}`}
          onStopStream={handleStopStream}
        />
      </div>
    </div>
  );
}
