import { useEffect, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useSequelStore } from "../../../shared/stores/sequelStore";
import styles from "../SceneControl.module.css";
import { useOutros } from "./hooks/useOutros";
import { useUploadOutro } from "./hooks/useUploadOutro";
import { useT } from "../../../shared/hooks/useT";

export default function SceneControlOutro() {
  const t = useT();
  const [heroMethod, setHeroMethod] = useState("Outro");
  const { selectedOutro: outroFromStore, setSelectedOutro: setOutroInStore } =
    useSequelStore();
  const [selectedOutro, setSelectedOutro] = useState(outroFromStore);
  const { outros, loading, error, refetch } = useOutros();
  const {
    uploadOutro,
    uploading,
    error: uploadError,
    success: uploadSuccess,
    resetState,
  } = useUploadOutro();
  const fileInputRef = useRef(null);

  const navigate = useNavigate();
  const handleGoBack = () => {
    navigate("/create-act");
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Пожалуйста, выберите видео файл");
      return;
    }

    const result = await uploadOutro(file);
    if (result) {
      refetch();
      resetState();
    }

    e.target.value = "";
  };

  const handleOutroSelect = (outro) => {
    setSelectedOutro(outro);
    setOutroInStore(outro);
    toast.success("Outro selected successfully!");
  };

  useEffect(() => {
    if (outroFromStore) {
      setSelectedOutro(outroFromStore);
    }
  }, [outroFromStore]);

  useEffect(() => {
    if (!loading && !error && outros.length > 0 && !outroFromStore) {
      const firstOutro = outros[0];
      setSelectedOutro(firstOutro);
      setOutroInStore(firstOutro);
    }
  }, [outros, loading, error, outroFromStore, setOutroInStore]);

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
          {selectedOutro ? (
            <video
              src={selectedOutro.fileName}
              className={styles.samplePhoto}
              autoPlay
              loop
              muted
              playsInline
              style={{
                objectFit: "cover",
                objectPosition: "center",
                width: "240px",
                height: "400px",
              }}
              onError={() => {
                console.error(
                  "Error loading selected video:",
                  selectedOutro.fileName,
                );
                setSelectedOutro(null);
              }}
            />
          ) : (
            <img
              src="/images/samplePhoto.png"
              alt=""
              className={styles.samplePhoto}
            />
          )}
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
              onClick={() => navigate("/scene-control-music")}
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
              onClick={() => setHeroMethod("Outro")}
            >
              <img src="/icons/outro.svg" alt="voting" />
              {t('sceneOutro')}
            </button>
          </div>

          <div className={styles.wrapper}>
            <div className={styles.wrapper_header}>
              <p>{t('sceneOutro')}</p>
              <button onClick={handleUploadClick} disabled={uploading}>
                {uploading ? t('loading') : 'Upload'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                style={{ display: "none" }}
              />
            </div>

            {uploadError && (
              <div
                style={{
                  color: "#ff6b6b",
                  textAlign: "center",
                  padding: "10px",
                  fontSize: "14px",
                }}
              >
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div
                style={{
                  color: "#4caf50",
                  textAlign: "center",
                  padding: "10px",
                  fontSize: "14px",
                }}
              >
                Outro успешно загружено!
              </div>
            )}

            <div className={styles.wrapper_content}>
              {loading && (
                <div
                  style={{
                    color: "#fff",
                    textAlign: "center",
                    padding: "20px",
                    width: "100%",
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
                    width: "100%",
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

              {!loading && !error && outros.length === 0 && (
                <div
                  style={{
                    color: "#999",
                    textAlign: "center",
                    padding: "20px",
                    width: "100%",
                  }}
                >
                  No outro videos found
                </div>
              )}

              {!loading &&
                !error &&
                outros.length > 0 &&
                outros.map((outro) => (
                  <div
                    key={outro.id}
                    className={styles.wrapperContentItem}
                    onClick={() => handleOutroSelect(outro)}
                    style={{
                      cursor: "pointer",
                    }}
                  >
                    <video
                      src={outro.fileName}
                      className={styles.wrapperContentImg}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      style={{
                        objectFit: "cover",
                        objectPosition: "center",
                        border:
                          selectedOutro?.id === outro.id
                            ? "2px solid #3ABAFF"
                            : "2px solid transparent",
                        borderRadius: "5px",
                        transition: "border-color 0.2s ease",
                      }}
                      onError={(e) => {
                        console.error("Error loading video:", outro.fileName);
                        e.target.style.display = "none";
                      }}
                    ></video>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
