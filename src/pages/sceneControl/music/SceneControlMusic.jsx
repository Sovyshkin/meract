import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useSequelStore } from "../../../shared/stores/sequelStore";
import styles from "../SceneControl.module.css";
import { useMusic } from "./hooks/useMusic";
import { extractMusicTitle } from "./utils/musicUtils";
import { useT } from "../../../shared/hooks/useT";

const RefreshIcon = () => {
  return (
    <svg
      width="10"
      height="13"
      viewBox="0 0 10 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.08325 3.50065L4.99992 6.41732V4.08398C6.93075 4.08398 8.49992 5.65315 8.49992 7.58398C8.49992 9.51482 6.93075 11.084 4.99992 11.084C3.06909 11.084 1.49992 9.51482 1.49992 7.58398H0.333252C0.333252 10.1623 2.42159 12.2507 4.99992 12.2507C7.57825 12.2507 9.66659 10.1623 9.66659 7.58398C9.66659 5.00565 7.57825 2.91732 4.99992 2.91732V0.583984L2.08325 3.50065Z"
        fill="white"
      />
    </svg>
  );
};
const Play = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M9.524 4.93734L19.616 11.1473C19.7616 11.2368 19.8818 11.3621 19.9653 11.5113C20.0487 11.6604 20.0925 11.8285 20.0925 11.9993C20.0925 12.1702 20.0487 12.3383 19.9653 12.4874C19.8818 12.6366 19.7616 12.7619 19.616 12.8513L9.524 19.0613C9.37245 19.1546 9.19878 19.2057 9.02088 19.2094C8.84299 19.2131 8.66733 19.1693 8.51202 19.0825C8.35672 18.9957 8.22739 18.869 8.13738 18.7155C8.04737 18.562 7.99995 18.3873 8 18.2093V5.78934C7.99995 5.61141 8.04737 5.43669 8.13738 5.28321C8.22739 5.12972 8.35672 5.00303 8.51202 4.91621C8.66733 4.82938 8.84299 4.78556 9.02088 4.78928C9.19878 4.793 9.37245 4.84411 9.524 4.93734Z"
        fill="white"
      />
    </svg>
  );
};

const Pause = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z" fill="white" />
    </svg>
  );
};

const Menu = () => {
  return (
    <svg
      width="16"
      height="14"
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="16" height="2" fill="#D9D9D9" fill-opacity="0.5" />
      <rect y="6" width="16" height="2" fill="#D9D9D9" fill-opacity="0.5" />
      <rect y="12" width="16" height="2" fill="#D9D9D9" fill-opacity="0.5" />
    </svg>
  );
};

export default function SceneControlMusic() {
  const t = useT();
  const [heroMethod, setHeroMethod] = useState("Music");
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [audioElements, setAudioElements] = useState({});
  const { selectedMusic = [], toggleSelectedMusic } = useSequelStore();
  const { music, loading, error, refetch } = useMusic();

  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate("/create-act");
  };

  const handleMusicSelect = (track) => {
    const isCurrentlySelected = selectedMusic.some((m) => m.id === track.id);
    toggleSelectedMusic(track);

    if (isCurrentlySelected) {
      toast.info("Music removed from selection");
    } else {
      toast.success("Music added successfully!");
    }

    console.log("Toggled music:", track);
  };

  const handlePlayPause = (track) => {
    const trackId = track.id;

    if (currentlyPlaying === trackId) {
      const audio = audioElements[trackId];
      if (audio && !audio.paused) {
        audio.pause();
        setCurrentlyPlaying(null);
        return;
      }
    }

    Object.values(audioElements).forEach((audio) => {
      if (audio && !audio.paused) {
        audio.pause();
      }
    });

    let audio = audioElements[trackId];
    if (!audio) {
      audio = new Audio(track.fileName);
      audio.addEventListener("ended", () => {
        setCurrentlyPlaying(null);
      });
      audio.addEventListener("error", (e) => {
        console.error("Error playing audio:", e);
        setCurrentlyPlaying(null);
      });

      setAudioElements((prev) => ({
        ...prev,
        [trackId]: audio,
      }));
    }

    audio
      .play()
      .then(() => {
        setCurrentlyPlaying(trackId);
      })
      .catch((error) => {
        console.error("Error playing audio:", error);
        setCurrentlyPlaying(null);
      });
  };

  return (
    <div>
      <div className={styles.glass}>
        <div className={styles.header}>
          <div className={styles.name}>
            <img
              src="/icons/back_arrowV2.svg"
              alt={t('back')}
              style={{ cursor: "pointer" }}
              onClick={handleGoBack}
            />
            <h1>{t('sceneControl')}</h1>
          </div>
        </div>
        <div className="stripe2"></div>
        <div className={styles.content}>
          <img
            src="/images/samplePhoto.png"
            alt=""
            className={styles.samplePhotoMusic}
          />
          <div className="btnRow">
            <button
              type="button"
              className={
                heroMethod === "Intro"
                  ? `${styles.selectBtn} ${styles.selectBtnActive}`
                  : styles.selectBtn
              }
              onClick={() => navigate("/scene-control-intro")}
            >
              <img src="/icons/intro.svg" alt="voting" />
              {t('sceneIntro')}
            </button>
            <button
              type="button"
              className={
                heroMethod === "Transition"
                  ? `${styles.selectBtn} ${styles.selectBtnActive}`
                  : styles.selectBtn
              }
              style={{ paddingBottom: "7px" }}
              onClick={() => navigate("/scene-control-transition")}
            >
              <img src="/icons/flash.svg" alt="voting" />
              Transition
            </button>
            <button
              type="button"
              className={
                heroMethod === "Music"
                  ? `${styles.selectBtn} ${styles.selectBtnActive}`
                  : styles.selectBtn
              }
              onClick={() => setHeroMethod("Music")}
            >
              <img src="/icons/music.svg" alt="voting" />
              {t('sceneMusic')}
            </button>
            <button
              type="button"
              className={
                heroMethod === "Outro"
                  ? `${styles.selectBtn} ${styles.selectBtnActive}`
                  : styles.selectBtn
              }
              onClick={() => navigate("/scene-control-outro")}
            >
              <img src="/icons/outro.svg" alt="voting" />
              {t('sceneOutro')}
            </button>
          </div>
          <div className={styles.wrapper_header}>
            <p>{t('sceneMusic')}</p>
            <button>
              <>
                <RefreshIcon />
              </>
              Replay Playlist
            </button>
          </div>
          <div className={styles.wrapper_music}>
            <button
              className={styles.select_music_btn}
              onClick={() => navigate("/scene-control-music-select")}
            >
              <img src="/icons/plus.svg" alt="plus" />
              {t('sceneSelectMusic')}
            </button>

            {loading && (
              <div
                style={{
                  color: "#fff",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                {t('loading')}
              </div>
            )}

            {error && (
              <div
                style={{
                  color: "#ff6b6b",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                <p>Error: {error}</p>
                <button
                  onClick={refetch}
                  style={{
                    background: "#3ABAFF",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginTop: "10px",
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && music.length === 0 && (
              <div
                style={{
                  color: "#999",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No music available
              </div>
            )}

            {!loading &&
              !error &&
              music.map((track, index) => (
                <div
                  key={track.id}
                  className={`${styles.music_block} ${selectedMusic.some((m) => m.id === track.id) ? styles.selected : ""}`}
                  onClick={() => handleMusicSelect(track)}
                  style={{ cursor: "pointer" }}
                >
                  <h3>{String(index + 1).padStart(2, "0")}</h3>
                  <div className={styles.music_name}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation(); 
                        handlePlayPause(track);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {currentlyPlaying === track.id ? <Pause /> : <Play />}
                    </div>
                    <p>{extractMusicTitle(track.fileName)}</p>
                  </div>

                  <p>{track.length}</p>
                  <Menu />
                  <p className={styles.intro}>{t('sceneIntro')}</p>
                  <div className={styles.back_arrow}>
                    <img src="/icons/backArrow3.svg" alt="back arrow" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
