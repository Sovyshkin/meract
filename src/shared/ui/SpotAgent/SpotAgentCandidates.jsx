import React, { useState } from "react";

import styles from "./SpotAgentCandidates.module.css";
import { useT } from "../../hooks/useT";

export default function SpotAgentCandidates({
  candidates,
  spotAgentCount,
  spotAgentMethods,
  assignedCount,
  isInitiator,
  currentUserId,
  onVote,
  onAssign,
  onApply,
  loading,
}) {
  const t = useT();
  const [taskInput, setTaskInput] = useState({});
  const [showTaskInput, setShowTaskInput] = useState({});

  console.log("SpotAgentCandidates:", {
    candidates,
    spotAgentCount,
    spotAgentMethods,
    isInitiator,
    currentUserId,
    loading,
  });

  const sortedCandidates =
    spotAgentMethods === "VOTING"
      ? [...candidates].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
      : candidates;

  const hasApplied = candidates.some((c) => c.userId === currentUserId);
  const canApply = !isInitiator && !hasApplied && spotAgentCount > 0;

  const handleAssignClick = (candidate) => {
    if (showTaskInput[candidate.id]) {
      onAssign(candidate.userId, taskInput[candidate.id] || "");
      setShowTaskInput({ ...showTaskInput, [candidate.id]: false });
      setTaskInput({ ...taskInput, [candidate.id]: "" });
    } else {
      setShowTaskInput({ ...showTaskInput, [candidate.id]: true });
    }
  };

  const hasVoted = (candidate) => {
    return candidate.votes?.some((v) => v.voterId === currentUserId);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>{t('spotAgentCandidates')}</h3>
        <span className={styles.progress}>
          {assignedCount}/{spotAgentCount} assigned
        </span>
      </div>

      <div className={styles.infoBox}>
        {isInitiator ? (
          <p>
            📋 As initiator, you can review candidates and assign them to
            specific tasks.
            {spotAgentMethods === "VOTING" &&
              " Candidates are sorted by votes."}
          </p>
        ) : (
          <p>
            🎭 This act needs {spotAgentCount} Spot Agents to perform specific
            actions during the stream.
            {!hasApplied && " Apply to become a candidate!"}
            {spotAgentMethods === "VOTING" &&
              hasApplied &&
              " Vote for other candidates to help them get selected."}
          </p>
        )}
      </div>

      {canApply && (
        <button
          className={styles.applyButton}
          onClick={onApply}
          disabled={loading}
        >
          🙋 Apply as Spot Agent
        </button>
      )}

      {hasApplied && !isInitiator && (
        <div className={styles.appliedBadge}>✓ You have applied</div>
      )}

      <div className={styles.candidatesList}>
        {sortedCandidates.map((candidate) => (
          <div key={candidate.id} className={styles.candidateCard}>
            <div className={styles.candidateInfo}>
              <span className={styles.username}>
                {candidate.user?.login || "Unknown"}
              </span>
              <span className={styles.appliedAt}>
                Applied: {new Date(candidate.appliedAt).toLocaleDateString()}
              </span>
            </div>

            {spotAgentMethods === "VOTING" && (
              <div className={styles.votingSection}>
                <span className={styles.voteCount}>
                  {candidate.voteCount || 0} votes
                </span>
                {!isInitiator &&
                  candidate.userId !== currentUserId &&
                  !hasVoted(candidate) && (
                    <button
                      className={styles.voteButton}
                      onClick={() => onVote(candidate.id)}
                      disabled={loading}
                    >
                      Vote
                    </button>
                  )}
                {hasVoted(candidate) && (
                  <span className={styles.votedBadge}>{t('spotAgentVoted')}</span>
                )}
              </div>
            )}

            {isInitiator && assignedCount < spotAgentCount && (
              <div className={styles.assignSection}>
                {showTaskInput[candidate.id] && (
                  <input
                    type="text"
                    placeholder={`${t('spotAgentTask')} description (optional)`}
                    value={taskInput[candidate.id] || ""}
                    onChange={(e) =>
                      setTaskInput({
                        ...taskInput,
                        [candidate.id]: e.target.value,
                      })
                    }
                    className={styles.taskInput}
                  />
                )}
                <button
                  className={styles.assignButton}
                  onClick={() => handleAssignClick(candidate)}
                  disabled={loading}
                >
                  {showTaskInput[candidate.id] ? "Confirm" : "Assign"}
                </button>
              </div>
            )}
          </div>
        ))}

        {candidates.length === 0 && (
          <div className={styles.empty}>{t('spotAgentNoCandidates')}</div>
        )}
      </div>
    </div>
  );
}
