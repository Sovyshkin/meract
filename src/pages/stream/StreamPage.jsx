import React, { useCallback, useEffect, useState } from "react";

import { useLocation, useParams } from "react-router-dom";

import api from "../../shared/api/api";
import StreamViewer from "../acts/components/StreamViewer";
import styles from "./StreamPage.module.css";
import { useT } from "../../shared/hooks/useT";

export default function StreamPage() {
  const t = useT();
  const { id } = useParams();
  const location = useLocation();
  const [act, setAct] = useState(location.state?.act || null);
  const [loading, setLoading] = useState(false);

  const fetchAct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/act/find-by-id/${id}`);
      console.log("Fetched full act data:", response.data);
      setAct(response.data);
    } catch (err) {
      console.error("Error fetching act:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (
      !act ||
      typeof act.spotAgentCount === "undefined" ||
      typeof act.spotAgentMethods === "undefined"
    ) {
      console.log("Fetching act because data is missing");
      fetchAct();
    }
  }, [id, fetchAct]);

  if (!act && loading) {
    return (
      <div className={styles.streamPage}>
        <div className={styles.loading}>{t('loading')}</div>
      </div>
    );
  }

  if (!act) {
    return (
      <div className={styles.streamPage}>
        <div className={styles.error}>
          <h2>{t('streamNotFound')}</h2>
          <p>{t('streamLoading')}</p>
        </div>
      </div>
    );
  }

  console.log("StreamPage act data:", act);
  console.log("spotAgentCount:", act.spotAgentCount);
  console.log("spotAgentMethods:", act.spotAgentMethods);

  return (
    <StreamViewer
      channelName={id || act.id?.toString() || "default_channel"}
      streamData={act}
      id={id}
    />
  );
}
