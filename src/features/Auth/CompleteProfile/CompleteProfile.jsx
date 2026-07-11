import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import fallbackAvatar from "../../../images/user.png";
import { profileApi } from "../../../shared/api/profile";
import { useAuthStore } from "../../../shared/stores/authStore";
import styles from "./CompleteProfile.module.css";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const onboardingRequired = useAuthStore((state) => state.onboardingRequired);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setOnboardingRequired = useAuthStore((state) => state.setOnboardingRequired);
  const [nickname, setNickname] = useState(onboardingRequired ? "" : (user?.login || ""));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(onboardingRequired ? null : (user?.avatarUrl || null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10 MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    event.target.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanNickname = nickname.trim();
    if (!/^[a-zA-Z0-9._-]{3,24}$/.test(cleanNickname)) {
      toast.error("Nickname must be 3-24 characters: letters, numbers, dot, dash or underscore");
      return;
    }
    if (!avatarFile && (onboardingRequired || !user?.avatarUrl)) {
      toast.error("Please choose a profile picture");
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
      const message = error?.response?.data?.message || "Failed to complete profile";
      toast.error(Array.isArray(message) ? message.join(", ") : String(message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.orbit} aria-hidden="true" />
      <section className={styles.card}>
        <p className={styles.eyebrow}>One last step</p>
        <h1>Make it yours</h1>
        <p className={styles.subtitle}>Choose the nickname and picture people will see across Meract.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <button
            type="button"
            className={styles.avatarButton}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Choose profile picture"
          >
            <img src={avatarPreview || fallbackAvatar} alt="Profile preview" />
            <span>{avatarFile || avatarPreview ? "Change" : "Choose"}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />

          <label className={styles.label} htmlFor="profile-nickname">Nickname</label>
          <input
            id="profile-nickname"
            className={styles.input}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Your nickname"
            maxLength={24}
            autoComplete="nickname"
            autoFocus
          />
          <p className={styles.hint}>
            This is public. Your email stays private. Username and picture are required.
          </p>

          <button className={styles.submit} type="submit" disabled={saving}>
            {saving ? "Saving..." : "Enter Meract"}
          </button>
        </form>
      </section>
    </main>
  );
}
