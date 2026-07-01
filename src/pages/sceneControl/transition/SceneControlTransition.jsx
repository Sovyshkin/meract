import { useEffect, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useSequelStore } from "../../../shared/stores/sequelStore";
import {
  VIDEO_EFFECTS,
  createEffectPreview,
} from "../../../shared/utils/videoEffects";
import styles from "../SceneControl.module.css";
import { useT } from "../../../shared/hooks/useT";

export default function SceneControlTransition() {
  const t = useT();
  const {
    selectedEffect: effectFromStore,
    setSelectedEffect: setEffectInStore,
  } = useSequelStore();
  const [selectedEffect, setSelectedEffect] = useState(
    effectFromStore || VIDEO_EFFECTS.NONE.id,
  );

  const navigate = useNavigate();
  const previewCanvasRefs = useRef({});

  const handleGoBack = () => {
    navigate("/create-act");
  };

  const handleEffectSelect = (effectId) => {
    setSelectedEffect(effectId);
    setEffectInStore(effectId);
    const effect = Object.values(VIDEO_EFFECTS).find((e) => e.id === effectId);
    toast.success(`${effect?.name || "Effect"} selected successfully!`);
  };

  useEffect(() => {
    if (effectFromStore) {
      setSelectedEffect(effectFromStore);
    } else {
      setSelectedEffect(VIDEO_EFFECTS.NONE.id);
      setEffectInStore(VIDEO_EFFECTS.NONE.id);
    }
  }, [effectFromStore, setEffectInStore]);

  useEffect(() => {
    Object.values(VIDEO_EFFECTS).forEach((effect) => {
      const canvas = previewCanvasRefs.current[effect.id];
      if (canvas) {
        createEffectPreview(canvas, effect.id);
      }
    });
  }, []);

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
          <div
            style={{
              width: "240px",
              height: "400px",
              position: "relative",
              overflow: "hidden",
              borderRadius: "10px",
            }}
          >
            <canvas
              ref={(el) => {
                if (el && selectedEffect) {
                  previewCanvasRefs.current[selectedEffect] = el;
                  createEffectPreview(el, selectedEffect);
                }
              }}
              width="240"
              height="400"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          <div className="btnRow">
            <button
              type="button"
              className={styles.selectBtn}
              onClick={() => navigate("/scene-control-intro")}
            >
              <img src="/icons/intro.svg" alt="intro" />
              {t('sceneIntro')}
            </button>
            <button
              type="button"
              className={`${styles.selectBtn} ${styles.selectBtnActive}`}
              style={{ paddingBottom: "7px" }}
              onClick={() => navigate("/scene-control-transition")}
            >
              <img src="/icons/flash.svg" alt="transition" />
              Transition
            </button>
            <button
              type="button"
              className={styles.selectBtn}
              onClick={() => navigate("/scene-control-music")}
            >
              <img src="/icons/music.svg" alt="music" />
              {t('sceneMusic')}
            </button>
            <button
              type="button"
              className={styles.selectBtn}
              onClick={() => navigate("/scene-control-outro")}
            >
              <img src="/icons/outro.svg" alt="outro" />
              {t('sceneOutro')}
            </button>
          </div>

          <div className={styles.wrapper}>
            <div className={styles.wrapper_header}>
              <p>{t('sceneVideoEffects')}</p>
            </div>

            <div className={styles.wrapper_content}>
              {Object.values(VIDEO_EFFECTS).map((effect) => (
                <div
                  key={effect.id}
                  className={styles.wrapperContentItem}
                  onClick={() => handleEffectSelect(effect.id)}
                  style={{
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <canvas
                    ref={(el) => {
                      if (el) {
                        previewCanvasRefs.current[effect.id] = el;
                      }
                    }}
                    width="160"
                    height="267"
                    className={styles.wrapperContentImg}
                    style={{
                      objectFit: "cover",
                      objectPosition: "center",
                      border:
                        selectedEffect === effect.id
                          ? "2px solid #3ABAFF"
                          : "2px solid transparent",
                      borderRadius: "5px",
                      transition: "border-color 0.2s ease",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "0",
                      right: "0",
                      textAlign: "center",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: "600",
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                      pointerEvents: "none",
                    }}
                  >
                    {effect.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
