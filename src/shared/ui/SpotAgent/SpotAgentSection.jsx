import React, { useEffect } from "react";

import { useSpotAgent } from "../../hooks/useSpotAgent";
import { useAuthStore } from "../../stores/authStore";
import { useT } from "../../hooks/useT";
import SpotAgentAssigned from "./SpotAgentAssigned";
import SpotAgentCandidates from "./SpotAgentCandidates";
import styles from "./SpotAgentSection.module.css";

export default function SpotAgentSection({ act }) {
  const t = useT();
  const { user } = useAuthStore();
  const {
    candidates,
    assignedAgents,
    loading,
    error,
    fetchCandidates,
    fetchAssigned,
    apply,
    vote,
    assign,
    remove,
  } = useSpotAgent(act?.id);

  const spotAgentCount = act?.spotAgentCount || 0;
  const spotAgentMethods = act?.spotAgentMethods || "VOTING";
  const isInitiator = user?.id === act?.userId || user?.sub === act?.userId;
  const currentUserId = user?.id || user?.sub;

  console.log("SpotAgentSection:", {
    spotAgentCount,
    spotAgentMethods,
    actId: act?.id,
  });

  useEffect(() => {
    if (act?.id) {
      fetchCandidates();
      fetchAssigned();
    }
  }, [act?.id, fetchCandidates, fetchAssigned]);

  const handleApply = async () => {
    try {
      await apply();
    } catch (err) {
      console.error("Apply error:", err.message);
    }
  };

  const handleVote = async (candidateId) => {
    try {
      await vote(candidateId);
    } catch (err) {
      console.error("Vote error:", err.message);
    }
  };

  const handleAssign = async (userId, task) => {
    try {
      await assign(userId, task);
    } catch (err) {
      console.error("Assign error:", err.message);
    }
  };

  const handleRemove = async (spotAgentId) => {
    try {
      await remove(spotAgentId);
    } catch (err) {
      console.error("Remove error:", err.message);
    }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>
        Spot Agents{" "}
        {spotAgentCount > 0
          ? `(${assignedAgents.length}/${spotAgentCount})`
          : "(Not Required)"}
      </h2>

      {error && <div className={styles.error}>{error}</div>}

      {spotAgentCount === 0 ? (
        <div className={styles.noAgents}>
          <p>{t('spotAgentNotRequired')}</p>
        </div>
      ) : (
        <>
          <SpotAgentAssigned
            assignedAgents={assignedAgents}
            spotAgentCount={spotAgentCount}
            isInitiator={isInitiator}
            onRemove={handleRemove}
            loading={loading}
          />

          <SpotAgentCandidates
            candidates={candidates}
            spotAgentCount={spotAgentCount}
            spotAgentMethods={spotAgentMethods}
            assignedCount={assignedAgents.length}
            isInitiator={isInitiator}
            currentUserId={currentUserId}
            onVote={handleVote}
            onAssign={handleAssign}
            onApply={handleApply}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
