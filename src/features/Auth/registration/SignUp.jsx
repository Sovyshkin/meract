import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import arrowLeft from '../../../images/arrow-left.png';
import addIcon from '../../../images/add.png';
import styles from "./signup.module.css";
import { useSignUp } from "./hooks/useSignUp";
import icon1 from '../../../images/icon1.png';
import icon2 from '../../../images/icon2.png';
import icon3 from '../../../images/icon3.png';
import icon4 from '../../../images/icon4.png';
import icon5 from '../../../images/icon5.png';
import icon6 from '../../../images/icon6.png';
import icon7 from '../../../images/icon7.png';
import icon8 from '../../../images/icon8.png';
import icon9 from '../../../images/icon9.png';
import icon10 from '../../../images/icon10.png';
import icon11 from '../../../images/icon11.png';
import icon12 from '../../../images/icon12.png';
import icon13 from '../../../images/icon13.png';
import icon14 from '../../../images/icon14.png';
import icon15 from '../../../images/icon15.png';
import icon16 from '../../../images/icon16.png';
import icon17 from '../../../images/icon17.png';
import icon18 from '../../../images/icon18.png';
import icon19 from '../../../images/icon19.png';
import icon20 from '../../../images/icon20.png';

const avatars = [icon1, icon2, icon3, icon4, icon5, icon6, icon7, icon8, icon9, icon10, icon11, icon12, icon13, icon14, icon15, icon16, icon17, icon18, icon19, icon20];

const ModalLayout = ({ title, children, onClose, onSave, saveText = 'Save' }) => (
    <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className={styles.modalTitle}>{title}</h1>
            </div>
            {children}
            <div className={styles.modalButtons}>
                <button className={styles.active} onClick={onSave}>
                    {saveText}
                </button>
            </div>
        </div>
    </div>
);

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, setLogin] = useState("");
  const [fullName, setFullName] = useState("");
  const [repassword, setRepassword] = useState("");
  const [agred, setAgred] = useState(false);

  const [step, setStep] = useState(1);

  const [passwordOtp, setPasswordOtp] = useState(['', '', '', '']);
  const passwordInputRefs = useRef([]);

  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(null);
  const fileInputRef = useRef(null);

  const { signUp, verify, loading, error, success } = useSignUp();
  const navigate = useNavigate();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setSelectedAvatarUrl(null);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSelectPredefinedAvatar = async (src) => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], 'avatar.png', { type: 'image/png' });

      setSelectedAvatar(file);
      setSelectedAvatarUrl(src);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Error loading predefined avatar:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!login || login.trim() === '') {
      alert('Login cannot be empty');
      return;
    }

    if (!email || email.trim() === '') {
      alert('Email cannot be empty');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Invalid email format');
      return;
    }

    if (password !== repassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 5 || password.length > 20) {
      alert('Password must be between 5 and 20 characters');
      return;
    }

    console.log('Sending data:', {
      login,
      email,
      password,
      repassword,
      fullName,
      avatar: selectedAvatar ? selectedAvatar.name : 'no avatar'
    });

    const ok = await signUp(
      login,
      email,
      password,
      repassword,
      fullName,
      selectedAvatar
    );

    if(ok) setStep(2);
  };

  const handleCloseModal = () => {
    setStep(1);
  };

  const verifyCode = async () => {
    const code = passwordOtp.join('');
    console.log('Verification code:', code);
    const ok = await verify(code);
    if(ok) {
      navigate("/login");
    }
  };

  const handlePasswordOtpChange = (val, idx) => {
    const newOtp = [...passwordOtp];
    newOtp[idx] = val.slice(-1);
    setPasswordOtp(newOtp);
    if (val && idx < 3) passwordInputRefs.current[idx + 1]?.focus();
  };

  const handlePasswordKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !passwordOtp[idx] && idx > 0) {
      passwordInputRefs.current[idx - 1]?.focus();
    }
  };

  const getAvatarPreview = () => {
    if (avatarPreview) return avatarPreview;
    if (selectedAvatarUrl) return selectedAvatarUrl;
    return null;
  };

  return (
    <div className={styles.container}>
      { step === 1 ?
      <div className={styles.contentWrapper}>
        <div className={styles.backButton} onClick={() => navigate("/login")}>
          <img src={arrowLeft} alt="Back" className={styles.backIcon} />
          <p className={styles.backText}>Back</p>
        </div>

        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>We are glad to see you</h1>
            <p className={styles.subtitle}>To continue, register</p>
          </div>

          <div className={styles.avatarSection}>
            <p className={styles.title} style={{fontSize:'16px'}}>Choose your avatar</p>
            <div className={styles.avatarList}>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileUpload}
              />

              <div
                className={`${styles.avatarWrapper} ${styles.addButton} ${selectedAvatar && !selectedAvatarUrl ? styles.activeAvatar : ''}`}
                onClick={() => fileInputRef.current.click()}
              >
                {getAvatarPreview() ? (
                  <img src={getAvatarPreview()} alt="Custom" className={styles.avatarImg} />
                ) : (
                  <img src={addIcon} alt="Add" className={styles.addImg} />
                )}
              </div>

              {avatars.map((src, index) => (
                <div
                  key={index}
                  className={`${styles.avatarWrapper} ${selectedAvatarUrl === src ? styles.activeAvatar : ''}`}
                  onClick={() => handleSelectPredefinedAvatar(src)}
                >
                  <img src={src} alt={`Avatar ${index + 1}`} className={styles.avatarImg} />
                </div>
              ))}
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Login *"
                className={styles.input}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                disabled={loading || success}
              />
            </div>

            <div className={styles.inputGroup}>
              <input
                type="text"
                placeholder="Full name"
                className={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading || success}
              />
            </div>

            <div className={styles.inputGroup}>
              <input
                type="email"
                placeholder="Email *"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
              />
            </div>

            <div className={styles.inputGroup}>
              <input
                type="password"
                placeholder="Password * (5-20 characters)"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
              />
            </div>

            <div className={styles.inputGroup}>
              <input
                type="password"
                placeholder="Repeat password *"
                className={styles.input}
                value={repassword}
                onChange={(e) => setRepassword(e.target.value)}
                disabled={loading || success}
              />
            </div>

            <div className={styles.checkbox_wrapper}>
              <input
                type="checkbox"
                id="check"
                checked={agred}
                onChange={(e) => setAgred(e.target.checked)}
              />
              <label htmlFor="check">
                I agree to the{" "}
                <span onClick={() => navigate("/termofuse")} className={styles.signupLink}>
                  terms of use
                </span>
              </label>
            </div>

            <button
              type="submit"
              className={styles.button}
              disabled={loading || !login || !email || !password || !repassword || success || !agred}
            >
              {loading ? "Registering..." : "Sign Up"}
            </button>

            {error && <p className={styles.error}>{error}</p>}
            {success && (
              <p className={styles.successText}>Registration successful! Please check your email for verification code.</p>
            )}
          </form>
        </div>
      </div>

      :
      <div className={styles.contentWrapper}>
        <div className={styles.backButton} onClick={() => setStep(1)} style={{zIndex:'99999'}}>
          <img src={arrowLeft} alt="Back" className={styles.backIcon} />
          <p className={styles.backText}>Back</p>
        </div>
        <ModalLayout
          title="Enter the code"
          onClose={handleCloseModal}
          onSave={verifyCode}
          saveText="Confirm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ color: '#FFFFFFB2' }}>
              Please enter the code that we sent to your email: <span style={{color:'#0093FE'}}>{email}</span>
            </p>
            <div style={{ display: 'flex', gap: '7px', justifyContent: 'space-between' }}>
              {passwordOtp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => passwordInputRefs.current[idx] = el}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handlePasswordOtpChange(e.target.value, idx)}
                  className={styles.modalInput}
                  style={{ textAlign: 'center', height: '50px' }}
                  placeholder="0"
                />
              ))}
            </div>
          </div>
        </ModalLayout>
      </div>
      }
    </div>
  );
}