import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import fallbackAvatar from "../../../images/user.png";
import { profileApi } from "../../../shared/api/profile";
import { useAuthStore } from "../../../shared/stores/authStore";
import styles from "./CompleteProfile.module.css";

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,24}$/;

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#29b6ff" fillOpacity=".18" />
      <path d="M4.5 9l3 3 6-6" stroke="#29b6ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function CompleteProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const onboardingRequired = useAuthStore((state) => state.onboardingRequired);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setOnboardingRequired = useAuthStore((state) => state.setOnboardingRequired);

  // Step 1 = avatar, Step 2 = username
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState(onboardingRequired ? "" : (user?.login || ""));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(onboardingRequired ? null : (user?.avatarUrl || null));
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const applyFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Выберите изображение"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Файл не должен превышать 10 МБ"); return; }
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }, [avatarPreview]);

  const handleAvatarChange = (e) => { applyFile(e.target.files?.[0]); e.target.value = ""; };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    applyFile(e.dataTransfer.files?.[0]);
  };

  const nicknameValid = USERNAME_REGEX.test(nickname.trim());
  const nicknameHint = (() => {
    const v = nickname.trim();
    if (!v) return null;
    if (v.length < 3) return "Минимум 3 символа";
    if (v.length > 24) return "Максимум 24 символа";
    if (!USERNAME_REGEX.test(v)) return "Только буквы, цифры, точка, тире, подчёркивание";
    return null;
  })();

  const handleNextStep = () => {
    if (step === 1) {
      // Убираем жесткую блокировку onboardingRequired, если кнопка называется "Пропустить"
      // Теперь пользователь сможет пройти на Шаг 2 (ввод логина), даже если не выбрал фото.
      setStep(2);
      return;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanNickname = nickname.trim();
    if (!nicknameValid) {
      toast.error("Никнейм должен содержать 3–24 символа: буквы, цифры, точка, тире или _");
      return;
    }
    if (!avatarFile && (onboardingRequired || !user?.avatarUrl)) {
      toast.error("Пожалуйста, выберите фото профиля");
      return;
    }

    setSaving(true);
    try {
      if (cleanNickname !== user?.login) {
        await profileApi.updateUsername(cleanNickname);
      }
      if (avatarFile) {
        await profileApi.updatePhoto(avatarFile);
      }
      const profile = await profileApi.getProfile();
      updateUser({ ...profile, onboardingRequired: false });
      setOnboardingRequired(false);
      navigate("/acts", { replace: true });
    } catch (error) {
      const message = error?.response?.data?.message || "Не удалось сохранить профиль";
      toast.error(Array.isArray(message) ? message.join(", ") : String(message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGlow2} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.card}>
        {/* Progress steps */}
        <div className={styles.steps}>
          <div className={`${styles.stepDot} ${step >= 1 ? styles.stepActive : ""}`}>
            {step > 1 ? <CheckIcon /> : <span>1</span>}
          </div>
          <div className={`${styles.stepLine} ${step > 1 ? styles.stepLineDone : ""}`} />
          <div className={`${styles.stepDot} ${step >= 2 ? styles.stepActive : ""}`}>
            <span>2</span>
          </div>
        </div>

        {step === 1 && (
          <div className={styles.stepPanel} key="step1">
            <p className={styles.eyebrow}>Шаг 1 из 2</p>
            <h1>Добавьте фото</h1>
            <p className={styles.subtitle}>Ваш аватар — первое, что видят другие участники Meract.</p>

            {/* Drop zone */}
            <div
              className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""} ${avatarPreview ? styles.dropZoneHasImage : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Загрузить аватар"
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <>
                  <img src={avatarPreview} alt="Предпросмотр аватара" className={styles.dropZoneImg} />
                  <div className={styles.dropZoneOverlay}>
                    <CameraIcon />
                    <span>Изменить</span>
                  </div>
                </>
              ) : (
                <div className={styles.dropZonePlaceholder}>
                  <div className={styles.dropZoneIcon}><CameraIcon /></div>
                  <p className={styles.dropZoneText}>Перетащите изображение<br /><span>или нажмите для выбора</span></p>
                  <p className={styles.dropZoneHint}>PNG, JPG, WEBP · до 10 МБ</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarChange}
            />

            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleNextStep}
            >
              {avatarFile || (user?.avatarUrl && !onboardingRequired) ? "Далее →" : "Пропустить"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepPanel} key="step2">
            <p className={styles.eyebrow}>Шаг 2 из 2</p>
            <h1>Ваш никнейм</h1>
            <p className={styles.subtitle}>Это публичное имя в Meract. Email остаётся приватным.</p>

            {/* Avatar mini preview */}
            {avatarPreview && (
              <div className={styles.miniAvatar}>
                <img src={avatarPreview} alt="Аватар" />
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={`${styles.inputWrap} ${nicknameHint ? styles.inputError : nicknameValid && nickname ? styles.inputOk : ""}`}>
                <input
                  id="profile-nickname"
                  className={styles.input}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="username"
                  maxLength={24}
                  autoComplete="nickname"
                  autoFocus
                  spellCheck={false}
                />
                {nicknameValid && nickname && (
                  <span className={styles.inputCheckIcon}><CheckIcon /></span>
                )}
              </div>

              {nicknameHint && <p className={styles.errorHint}>{nicknameHint}</p>}
              {!nicknameHint && (
                <p className={styles.hint}>3–24 символа: буквы, цифры, точка, тире, подчёркивание</p>
              )}

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => setStep(1)}
                >
                  ← Назад
                </button>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={saving || !nicknameValid}
                >
                  {saving ? (
                    <span className={styles.spinner} />
                  ) : "Войти в Meract 🚀"}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
