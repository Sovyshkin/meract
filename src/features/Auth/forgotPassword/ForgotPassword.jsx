import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./forgot.module.css"; // 👈 Импорт модульных стилей
import { useChangePassword } from "./hooks/useChangePassword";
import { useForgotPassword } from "./hooks/useForgotPassword";
import { useVerifyCode } from "./hooks/useVerifyCode";
import arrowLeft from '../../../images/arrow-left.png';
import { useT } from '../../../shared/hooks/useT';

export default function ForgotPassword() {
  const t = useT();
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState(null);
  const [password, setPassword] = useState("");

  const {
    sendCode,
    loading: loadingEmail,
    error: errorEmail,
  } = useForgotPassword();
  const {
    verifyCode,
    loading: loadingCode,
    error: errorCode,
  } = useVerifyCode();
  const {
    changePassword,
    loading: loadingPassword,
    error: errorPassword,
  } = useChangePassword();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const ok = await sendCode(email);
    if (ok) setStep(2);
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const res = await verifyCode(code, "forgot-password");
    if (res?.userId) {
      setUserId(res.userId);
      setStep(3);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const ok = await changePassword(userId, password);
    if (ok) {
      setStep(4);
      setTimeout(() => navigate("/acts"), 1500);
    }
  };

  return (
    <div className={styles.container}> 
     <div className={styles.backButton} onClick={() => navigate("/login")}> 
       <img src={arrowLeft} alt="Back" className={styles.backIcon} />
       <p 
         className={styles.backText} 
     
       >
         Back
       </p>
           </div>
     
     <div className={styles.card}> 
      <div className={styles.header}>
      <h1 className={styles.title}>{t('forgotTitle')}</h1> 
      <p className={styles.subtitle}>{t('forgotSubtitle')}</p>
      </div>
      {/* <form className={styles.login_form} autoComplete="off"> */}
        {step === 1 && (
          <>
            <div className={styles.inputGroup}>
              <input
                type="email"
                placeholder={t('authEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loadingEmail}
                className={styles.input} 
              />
            </div>
            {/* <button
              type="submit"
              className={styles.login_button} 
              disabled={loadingEmail || !email}
              onClick={handleEmailSubmit}
            >
              {loadingEmail ? "Sending..." : "Send Code"}
            </button> */}
            {errorEmail && (
              <p
                style={{ color: "#ff6a6a", marginTop: 8, textAlign: "center" }}
              >
                {errorEmail}
              </p>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.input_wrapper}>
              <input
                type="text"
                placeholder={t('forgotCode')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loadingCode}
                className={styles.input} 
              />
            </div>
            <button
              type="submit"
              className={styles.login_button} 
              disabled={loadingCode || !code}
              onClick={handleCodeSubmit}
            >
              {loadingCode ? t('loading') : t('forgotVerifyCode')}
            </button>
            {errorCode && (
              <p
                style={{ color: "#ff6a6a", marginTop: 8, textAlign: "center" }}
              >
                {errorCode}
              </p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.input_wrapper}>
              <input
                type="password"
                placeholder={t('forgotNewPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loadingPassword}
                className={styles.input} 
              />
            </div>
            <button
              type="submit"
              className={styles.login_button} 
              disabled={loadingPassword || !password}
              onClick={handlePasswordSubmit}
            >
              {loadingPassword ? t('loading') : t('forgotChangePassword')}
            </button>
            {errorPassword && (
              <p
                style={{ color: "#ff6a6a", marginTop: 8, textAlign: "center" }}
              >
                {errorPassword}
              </p>
            )}
          </>
        )}

        {step === 4 && (
          <p className={styles.successMessage}>
            Password changed successfully!
          </p>
        )}
      {/* </form> */}
      <button
              type="submit"
              className={styles.button} 
              disabled={loadingEmail || !email}
              onClick={handleEmailSubmit}
            >
              {t('forgotSendCode')}
            </button>
     </div>
     <></>
    </div>
  );
}
