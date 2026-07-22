import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { useAuth } from "./hooks/useAuth";
import google from '../../../images/google.png'
import discord from '../../../images/discord.png'
import twitch from '../../../images/twitch.png'
import { useT } from '../../../shared/hooks/useT';

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export default function Login() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, loading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/acts");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await signIn(email, password);
    if (ok) navigate("/acts");
  };

  const handleRegister = () => {
    navigate("/registration");
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    navigate("/forgot-password");
  };

  const handleGoogleAuth = async () => {
    const url = `${import.meta.env.VITE_API_URL}/auth/google`;
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: `${url}?state=app` });
    } else {
      window.location.href = url;
    }
  };
  const handleTwitchAuth = async () => {
    const url = `${import.meta.env.VITE_API_URL}/auth/twitch`;
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: `${url}?state=app` });
    } else {
      window.location.href = url;
    }
  };
  const handleDiscordAuth = async () => {
    const url = `${import.meta.env.VITE_API_URL}/auth/discord`;
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: `${url}?state=app` });
    } else {
      window.location.href = url;
    }
  };

  return (
    <div className={styles.container}>
      <div className = {styles.parent}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('authWelcome')}</h1>
          <p className={styles.subtitle}>{t('authLoginSubtitle')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error === "Incorrect email or password" ? t('authIncorrectCredentials') : error}</div>}

          <div className={styles.inputGroup}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('authEmail')}
              className={styles.input}
              autoFocus
              disabled={loading}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('authPassword')}
              className={`${styles.input} ${styles.passwordInput}`}
              disabled={loading}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword((value) => !value)}
              disabled={loading || !password}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>


          {/* <div className={styles.checkbox_wrapper}>
            <input type="checkbox" id="check" />
            <label htmlFor="check">Remember Password</label>
          </div> */}
          <div style={{width:'100%', display:'flex', justifyContent:'end',}}>
            <a href="#" onClick={handleForgotPassword} className={styles.forgotLink}>
              {t('authForgotPassword')}
            </a>
          </div>

          <button 
            type="submit" 
            className={styles.button}
            disabled={loading}
          >
            {loading ? t('loading') : t('authLogin')}
          </button>
        </form>

        <div className={styles.footer}>
          <p>{t('authNoAccount')}{' '}
            <span
              onClick={handleRegister}
              className={styles.signupLink}
            >
              {t('authSignUp')}
            </span>
          </p>
        </div>

         
      </div>
      <div className={styles.ordiv}>
         <hr />     
        <p className={styles.orText}>{t('authOr')}</p>
         <hr />     
      </div>
        <div className={styles.imgcont}>
        <div className={styles.ico_wrapper}>
          <div
            className={styles.ico}
            onClick={handleTwitchAuth}
          >
            <img src={twitch} alt="twitch" width={22} />
            

          </div>
        </div>
        <div className={styles.ico_wrapper}>
          <div
            className={styles.ico}
            onClick={handleDiscordAuth}
          >
            <img src={discord}alt="discord" width={22} />

          </div>
        </div>
        <div className={styles.ico_wrapper}>
          <div
            className={styles.ico}
            onClick={handleGoogleAuth}
          >
            <img src={google} alt="google" width={22} />
          </div>
        </div>
        </div>
     </div>
    </div>
  );
}
