import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import back from '../../images/arrow-left.png';
import close from '../../images/Close.png';
import styles from "./SettingsPage.module.css";
import copy from '../../images/copy.png';
import { profileApi } from '../../shared/api/profile';
import { useT } from '../../shared/hooks/useT';

const SecurityPage = () => {
    const t = useT();
    const navigate = useNavigate();

    const ModalLayout = ({ title, children, onClose, onSave, saveText = t('save') }) => (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className={styles.modalTitle}>{title}</h2>
                    <img src={close} alt="close" onClick={onClose} style={{ cursor: 'pointer', width: '20px' }} />
                </div>
                {children}
                <div className={styles.modalButtons}>
                    <button className={styles.cancelBtn} onClick={onClose}>{t('cancel')}</button>
                    <button className={styles.active} onClick={onSave}>
                        {saveText}
                    </button>
                </div>
            </div>
        </div>
    );
    
    // Основные данные
    const [email, setEmail] = useState('no email');
    const [password] = useState('************');
    const [phone, setPhone] = useState('+7999999999');
    const [googleStatus, setGoogleStatus] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    
    // Состояние для whoCanMessage
    const [whoCanMessage, setWhoCanMessage] = useState('all');
    
    // Состояния для Email модалки (3 шага для пользователя, 4 API)
    const [emailStep, setEmailStep] = useState(1);
    const [emailOtp, setEmailOtp] = useState(['', '', '', '']); // для старой почты (шаг 1)
    const [emailNewOtp, setEmailNewOtp] = useState(['', '', '', '']); // для новой почты (шаг 3)
    const [newEmail, setNewEmail] = useState('');
    const emailInputRefs = useRef([]);
    const emailNewInputRefs = useRef([]);

    // Состояния для Password модалки (2 шага)
    const [passwordStep, setPasswordStep] = useState(1);
    const [passwordOtp, setPasswordOtp] = useState(['', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const passwordInputRefs = useRef([]);

    // Состояния для Phone модалки (3 шага)
    const [phoneStep, setPhoneStep] = useState(1);
    const [phoneOtp, setPhoneOtp] = useState(['', '', '', '']); // для старого номера
    const [phoneOtp2, setPhoneOtp2] = useState(['', '', '', '']); // для нового номера
    const [newPhone, setNewPhone] = useState('');
    const phoneInputRefs = useRef([]);
    const phoneInputRefs2 = useRef([]);

    // Состояния для Auth модалки (Google Authenticator)
    const [authStep, setAuthStep] = useState(1);
    const [authOtp, setAuthOtp] = useState(['', '', '', '', '', '']); // 6 цифр
    const authInputRefs = useRef([]);
    
    // Данные для Google Authenticator
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [isLoading2fa, setIsLoading2fa] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileData, statusData, whocan] = await Promise.all([
                    profileApi.getProfile(),
                    profileApi.status2fa(),
                    profileApi.getwhoCanMessage()
                ]);

                console.log("Profile:", profileData);
                console.log("2FA Status:", statusData);
                console.log('whocan', whocan);
                
                setGoogleStatus(statusData.enabled);
                setEmail(profileData.email);
                setPhone(profileData.phone || 'no number');
                
                if (whocan && whocan.whoCanMessage) {
                    setWhoCanMessage(whocan.whoCanMessage);
                }
                
            } catch (error) {
                console.error("Ошибка при загрузке данных:", error);
            }
        };
        fetchData();
    }, []);

    // Загрузка данных для 2FA при открытии модалки
    const load2faData = async () => {
        setIsLoading2fa(true);
        try {
            const response = await profileApi.generate2fa();
            console.log('2FA Generation Response:', response);
            
            setQrCodeUrl(response.qrCode || response.qrCodeUrl || '');
            setSecretKey(response.secret || response.secretKey || '');
            
        } catch (error) {
            console.error('Error generating 2FA:', error);
            alert('Failed to generate 2FA. Please try again.');
        } finally {
            setIsLoading2fa(false);
        }
    };

    // Открытие модалки Google Authenticator
    const openAuthModal = async () => {
        setActiveModal('auth');
        await load2faData();
    };

    // Открытие модалки Email
    const openEmailModal = async () => {
        setActiveModal('email');
        setEmailStep(1);
        try {
            await profileApi.emailSendCode();
            console.log('Email code sent to old email');
        } catch (error) {
            console.error('Error sending email code:', error);
            alert('Failed to send code. Please try again.');
        }
    };

    // Открытие модалки Password
    const openPasswordModal = async () => {
        setActiveModal('pass');
        setPasswordStep(1);
        try {
            await profileApi.passwordSendCode();
            console.log('Password code sent');
        } catch (error) {
            console.error('Error sending password code:', error);
            alert('Failed to send code. Please try again.');
        }
    };

    // Логика для чекбоксов
    const toggleNotif = (id) => {
        let newValue;
        
        if (id === 1) {
            newValue = whoCanMessage === 'all' ? 'none' : 'all';
        } else if (id === 2) {
            newValue = whoCanMessage === 'act_participants' ? 'none' : 'act_participants';
        } else if (id === 3) {
            newValue = whoCanMessage === 'guild_members' ? 'none' : 'guild_members';
        }
        
        setWhoCanMessage(newValue);
        
        profileApi.setwhoCanMessage({ setting: newValue })
            .then(() => {
                console.log('Setting updated to:', newValue);
            })
            .catch(error => {
                console.error('Error updating setting:', error);
                setWhoCanMessage(whoCanMessage);
            });
    };

    // Обработчики для второго OTP (новый номер)
    const handlePhoneOtp2Change = (value, index) => {
        if (isNaN(value)) return;
        const newOtp = [...phoneOtp2];
        newOtp[index] = value.substring(value.length - 1);
        setPhoneOtp2(newOtp);
        if (value && index < 3) {
            phoneInputRefs2.current[index + 1]?.focus();
        }
    };
    
    const copyText = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Code copied to clipboard!');
            }).catch(err => {
                console.error('Ошибка копирования:', err);
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            alert('Code copied to clipboard!');
        } catch (err) {
            console.error('Fallback: Ошибка копирования', err);
            alert('Failed to copy code');
        }
        
        document.body.removeChild(textarea);
    };
    
    const handlePhoneKeyDown2 = (e, index) => {
        if (e.key === 'Backspace' && !phoneOtp2[index] && index > 0) {
            phoneInputRefs2.current[index - 1]?.focus();
        }
    };

    // Обработчики для Email OTP (старая почта)
    const handleEmailOtpChange = (value, index) => {
        if (isNaN(value)) return;
        const newOtp = [...emailOtp];
        newOtp[index] = value.substring(value.length - 1);
        setEmailOtp(newOtp);
        if (value && index < 3) {
            emailInputRefs.current[index + 1]?.focus();
        }
    };

    const handleEmailKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !emailOtp[index] && index > 0) {
            emailInputRefs.current[index - 1]?.focus();
        }
    };

    // Обработчики для Email нового OTP (новая почта)
    const handleEmailNewOtpChange = (value, index) => {
        if (isNaN(value)) return;
        const newOtp = [...emailNewOtp];
        newOtp[index] = value.substring(value.length - 1);
        setEmailNewOtp(newOtp);
        if (value && index < 3) {
            emailNewInputRefs.current[index + 1]?.focus();
        }
    };

    const handleEmailNewKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !emailNewOtp[index] && index > 0) {
            emailNewInputRefs.current[index - 1]?.focus();
        }
    };

    // Обработчики для Password OTP
    const handlePasswordOtpChange = (value, index) => {
        if (isNaN(value)) return;
        const newOtp = [...passwordOtp];
        newOtp[index] = value.substring(value.length - 1);
        setPasswordOtp(newOtp);
        if (value && index < 3) {
            passwordInputRefs.current[index + 1]?.focus();
        }
    };

    const handlePasswordKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !passwordOtp[index] && index > 0) {
            passwordInputRefs.current[index - 1]?.focus();
        }
    };

    // Обработчики для Phone OTP
    const handlePhoneOtpChange = (value, index) => {
        if (isNaN(value)) return;
        const newOtp = [...phoneOtp];
        newOtp[index] = value.substring(value.length - 1);
        setPhoneOtp(newOtp);
        if (value && index < 3) {
            phoneInputRefs.current[index + 1]?.focus();
        }
    };

    const handlePhoneKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !phoneOtp[index] && index > 0) {
            phoneInputRefs.current[index - 1]?.focus();
        }
    };

    // Обработчики для Auth OTP
    const handleAuthOtpChange = (value, index) => {
        if (isNaN(value)) return;
        const newOtp = [...authOtp];
        newOtp[index] = value.substring(value.length - 1);
        setAuthOtp(newOtp);
        if (value && index < 5) {
            authInputRefs.current[index + 1]?.focus();
        }
    };

    const handleAuthKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !authOtp[index] && index > 0) {
            authInputRefs.current[index - 1]?.focus();
        }
    };

    // Обработчик для Email (3 шага для пользователя, 4 API)
    const handleEmailSave = async () => {
        if (emailStep === 1) {
            // Шаг 1: Проверка кода со старой почты (API step2)
            if (emailOtp.join('').length === 4) {
                try {
                    await profileApi.emailverify(emailOtp.join(''));
                    setEmailStep(2);
                    setEmailOtp(['', '', '', '']);
                } catch (error) {
                    console.error('Error verifying email code:', error);
                    alert(error.response?.data?.message || 'Invalid code. Please try again.');
                }
            } else {
                alert("Please enter 4-digit code");
            }
        } else if (emailStep === 2) {
            // Шаг 2: Ввод нового email (API step3)
            if (!newEmail) {
                alert("Please enter new email");
                return;
            }
            
            try {
                await profileApi.setNewEmail(newEmail);
                setEmailStep(3);
            } catch (error) {
                console.error('Error setting new email:', error);
                alert(error.response?.data?.message || 'Failed to set new email. Please try again.');
            }
        } else if (emailStep === 3) {
            // Шаг 3: Проверка кода с новой почты (API step4)
            if (emailNewOtp.join('').length === 4) {
                try {
                    await profileApi.confirmEmail(emailNewOtp.join(''));
                    setEmail(newEmail);
                    handleCloseModal();
                    alert('Email successfully changed!');
                } catch (error) {
                    console.error('Error confirming new email code:', error);
                    alert(error.response?.data?.message || 'Invalid code. Please try again.');
                }
            } else {
                alert("Please enter 4-digit code");
            }
        }
    };

    // Обработчик для Password (2 шага)
    const handlePasswordSave = async () => {
        if (passwordStep === 1) {
            // Шаг 1: Проверка кода
            if (passwordOtp.join('').length === 4) {
                setPasswordStep(2);
            } else {
                alert("Please enter 4-digit code");
            }
        } else {
            // Шаг 2: Смена пароля
            if (!newPassword) {
                alert("Please enter new password");
                return;
            }
            if (!confirmPassword) {
                alert("Please confirm new password");
                return;
            }
            
            try {
                await profileApi.passwordconfirm(passwordOtp.join(''), newPassword, confirmPassword);
                console.log('Password Changed');
                handleCloseModal();
                alert('Password successfully changed!');
            } catch (error) {
                console.error('Error confirming password:', error);
                alert(error.response?.data?.message || 'Invalid code or password error. Please try again.');
            }
        }
    };

    // Обработчик для Phone
    const handlePhoneSave = () => {
        if (phoneStep === 1) {
            if (phoneOtp.join('').length === 4) {
                setPhoneStep(2);
                setPhoneOtp(['', '', '', '']);
            } else {
                alert("Please enter 4-digit code from your old phone");
            }
        } else if (phoneStep === 2) {
            if (newPhone.length >= 10) {
                setPhoneStep(3);
            } else {
                alert("Please enter a valid phone number");
            }
        } else if (phoneStep === 3) {
            if (phoneOtp2.join('').length === 4) {
                console.log('Phone changed to:', newPhone);
                handleCloseModal();
            } else {
                alert("Please enter 4-digit code from your new phone");
            }
        }
    };

    // Обработчик для Auth
    const handleAuthSave = async () => {
        if (authStep === 1) {
            setAuthStep(2);
        } else {
            if (authOtp.join('').length === 6) {
                try {
                    await profileApi.confirm2fa(authOtp.join(''));
                    console.log('Google Authenticator Connected');
                    setGoogleStatus(true);
                    handleCloseModal();
                    alert('2FA successfully enabled!');
                } catch (error) {
                    console.error('Error verifying 2FA:', error);
                    alert(error.response?.data?.message || 'Invalid code. Please try again.');
                }
            } else {
                alert("Please enter 6-digit code from Google Authenticator");
            }
        }
    };

    // Закрытие модалки и сброс всех состояний
    const handleCloseModal = () => {
        setActiveModal(null);
        
        // Сброс email
        setEmailStep(1);
        setEmailOtp(['', '', '', '']);
        setEmailNewOtp(['', '', '', '']);
        setNewEmail('');
        
        // Сброс password
        setPasswordStep(1);
        setPasswordOtp(['', '', '', '']);
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        
        // Сброс phone
        setPhoneStep(1);
        setPhoneOtp(['', '', '', '']);
        setPhoneOtp2(['', '', '', '']);
        setNewPhone('');
        
        // Сброс auth
        setAuthStep(1);
        setAuthOtp(['', '', '', '', '', '']);
        setQrCodeUrl('');
        setSecretKey('');
    };

    const notificationList = [
        { id: 1, label: 'All', value: 'all' },
        { id: 2, label: 'Users of joint acts', value: 'act_participants' },
        { id: 3, label: 'Members of my guild', value: 'guild_members' },
    ];

    return (
        <div className={styles.container}>
            {/* Email модалка - 3 шага для пользователя */}
            {activeModal === 'email' && (
                <ModalLayout 
                    title="Edit Email" 
                    onClose={handleCloseModal} 
                    onSave={handleEmailSave}
                    saveText={
                        emailStep === 1 ? "Verify Old Email" :
                        emailStep === 2 ? "Send Code to New Email" :
                        "Confirm New Email"
                    }
                >
                    {emailStep === 1 && (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '15px',
                            marginBottom: '20px' 
                        }}>
                            <p style={{ textAlign: 'flex-start', color: '#FFFFFFB2' }}>
                                Please enter the code that we sent to your current email: <span style={{color:'#0093FE'}}>{email}</span>
                            </p>
                            <div style={{ 
                                display: 'flex', 
                                gap: '10px', 
                                justifyContent: 'space-between'
                            }}>
                                {emailOtp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => emailInputRefs.current[idx] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleEmailOtpChange(e.target.value, idx)}
                                        onKeyDown={(e) => handleEmailKeyDown(e, idx)}
                                        className={styles.modalInput}
                                        placeholder='0'
                                        style={{ 
                                            textAlign: 'center', 
                                            height: '50px',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {emailStep === 2 && (
                        <input 
                            type="email" 
                            className={styles.modalInput} 
                            placeholder="Enter new email" 
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            autoFocus 
                            style={{ marginBottom: '20px' }}
                        />
                    )}

                    {emailStep === 3 && (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '15px',
                            marginBottom: '20px' 
                        }}>
                            <p style={{ textAlign: 'flex-start', color: '#FFFFFFB2' }}>
                                Please enter the code that we sent to your new email: <span style={{color:'#0093FE'}}>{newEmail}</span>
                            </p>
                            <div style={{ 
                                display: 'flex', 
                                gap: '10px', 
                                justifyContent: 'space-between'
                            }}>
                                {emailNewOtp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => emailNewInputRefs.current[idx] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleEmailNewOtpChange(e.target.value, idx)}
                                        onKeyDown={(e) => handleEmailNewKeyDown(e, idx)}
                                        className={styles.modalInput}
                                        placeholder='0'
                                        style={{ 
                                            textAlign: 'center', 
                                            height: '50px',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </ModalLayout>
            )}

            {/* Password модалка - 2 шага */}
            {activeModal === 'pass' && (
                <ModalLayout 
                    title="Change Password" 
                    onClose={handleCloseModal} 
                    onSave={handlePasswordSave}
                    saveText={passwordStep === 1 ? "Verify Code" : "Change Password"}
                >
                    {passwordStep === 1 ? (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '15px',
                            marginBottom: '20px' 
                        }}>
                            <p style={{ textAlign: 'flex-start', color: '#FFFFFFB2' }}>
                                Please enter the code that we sent to your email: <span style={{color:'#0093FE'}}>{email}</span>
                            </p>
                            <div style={{ 
                                display: 'flex', 
                                gap: '10px', 
                                justifyContent: 'space-between'
                            }}>
                                {passwordOtp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => passwordInputRefs.current[idx] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handlePasswordOtpChange(e.target.value, idx)}
                                        onKeyDown={(e) => handlePasswordKeyDown(e, idx)}
                                        className={styles.modalInput}
                                        placeholder='0'
                                        style={{ 
                                            textAlign: 'center', 
                                            height: '50px',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '20px' }}>
                            <div className={styles.passwordField} style={{ marginBottom: '10px' }}>
                                <input 
                                    type={showNewPassword ? "text" : "password"}
                                    className={`${styles.modalInput} ${styles.passwordModalInput}`}
                                    placeholder="New password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowNewPassword((value) => !value)}
                                    disabled={!newPassword}
                                >
                                    {showNewPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            <div className={styles.passwordField}>
                                <input 
                                    type={showConfirmPassword ? "text" : "password"}
                                    className={`${styles.modalInput} ${styles.passwordModalInput}`}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowConfirmPassword((value) => !value)}
                                    disabled={!confirmPassword}
                                >
                                    {showConfirmPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>
                    )}
                </ModalLayout>
            )}

            {/* Phone модалка */}
            {activeModal === 'phone' && (
                <ModalLayout 
                    title="Changing the phone number" 
                    onClose={handleCloseModal} 
                    onSave={handlePhoneSave}
                    saveText={
                        phoneStep === 1 ? "Confirm Old Phone" : 
                        phoneStep === 2 ? "Send Code to New Phone" : 
                        "Confirm New Phone"
                    }
                >
                    {phoneStep === 1 && (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '15px',
                            marginBottom: '20px' 
                        }}>
                            <p style={{ textAlign: 'flex-start', color: '#FFFFFFB2' }}>
                                Please enter the code that we sent to your old phone: <span style={{color:'#0093FE'}}>{phone}</span>
                            </p>
                            <div style={{ 
                                display: 'flex', 
                                gap: '10px', 
                                justifyContent: 'space-between'
                            }}>
                                {phoneOtp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => phoneInputRefs.current[idx] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handlePhoneOtpChange(e.target.value, idx)}
                                        onKeyDown={(e) => handlePhoneKeyDown(e, idx)}
                                        className={styles.modalInput}
                                        placeholder='0'
                                        style={{ 
                                            textAlign: 'center', 
                                            height: '50px',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {phoneStep === 2 && (
                        <input 
                            type="tel" 
                            className={styles.modalInput} 
                            placeholder="Enter new phone number"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            autoFocus 
                            style={{ marginBottom: '20px' }}
                        />
                    )}

                    {phoneStep === 3 && (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '15px',
                            marginBottom: '20px' 
                        }}>
                            <p style={{ textAlign: 'flex-start', color: '#FFFFFFB2' }}>
                                Please enter the code that we sent to your new phone: <span style={{color:'#0093FE'}}>{newPhone}</span>
                            </p>
                            <div style={{ 
                                display: 'flex', 
                                gap: '10px', 
                                justifyContent: 'space-between'
                            }}>
                                {phoneOtp2.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => phoneInputRefs2.current[idx] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handlePhoneOtp2Change(e.target.value, idx)}
                                        onKeyDown={(e) => handlePhoneKeyDown2(e, idx)}
                                        className={styles.modalInput}
                                        placeholder='0'
                                        style={{ 
                                            textAlign: 'center', 
                                            height: '50px',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </ModalLayout>
            )}

            {/* Google Authenticator модалка */}
            {activeModal === 'auth' && (
                <ModalLayout 
                    title="Google Authenticator" 
                    onClose={handleCloseModal} 
                    onSave={handleAuthSave}
                    saveText={authStep === 1 ? "Next" : "Verify"}
                >
                    {authStep === 1 ? (
                        <>
                            <p style={{ color: '#FFFFFFB2', fontSize: '14px', textAlign: 'center', marginBottom: '15px' }}>
                                Scan the QR-code in your Google Authenticator app to connect.
                            </p>
                            
                            {isLoading2fa ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <p>Loading QR code...</p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ 
                                        background: '#1E1E1E', 
                                        width: '200px', 
                                        height: '200px', 
                                        margin: '0 auto 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px dashed #0093FE',
                                        borderRadius: '10px'
                                    }}>
                                        {qrCodeUrl ? (
                                            <img 
                                                src={qrCodeUrl} 
                                                alt="QR Code" 
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                        ) : (
                                            <span style={{ color: '#0093FE' }}>QR Code</span>
                                        )}
                                    </div>
                                    
                                    <p style={{ color: '#888', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
                                        Scan the code or enter the secret key into your Google Authenticator device
                                    </p>
                                    
                                    {secretKey && (
                                        <div className={styles.cardcont}>
                                            <div className={styles.card}>
                                                <div className={styles.cardInfo}>
                                                    <p className={styles.subtitle}>Secret Key</p>
                                                    <p className={styles.userName}>{secretKey}</p>
                                                </div>
                                                <img 
                                                    className={styles.arrowIcon} 
                                                    src={copy}
                                                    style={{opacity:'1', cursor:'pointer'}}
                                                    onClick={() => copyText(secretKey)}
                                                    alt="copy"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '20px',
                            marginBottom: '20px' 
                        }}>
                            <p style={{ textAlign: 'center', color: '#FFFFFFB2' }}>
                                Enter the 6-digit code from Google Authenticator
                            </p>
                            <div style={{ 
                                display: 'flex', 
                                gap: '5px', 
                                justifyContent: 'center'
                            }}>
                                {authOtp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => authInputRefs.current[idx] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleAuthOtpChange(e.target.value, idx)}
                                        onKeyDown={(e) => handleAuthKeyDown(e, idx)}
                                        className={styles.modalInput}
                                        placeholder='0'
                                        style={{ 
                                            textAlign: 'center', 
                                            height: '50px',
                                            width: '50px'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </ModalLayout>
            )}

            {/* Header */}
            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img src={back} alt="back" onClick={() => window.history.back()} className={styles.backBtn} />
                    <div className="name"><h1>{t('security')}</h1></div>
                    <div></div>
                </div>
            </div>

            {/* Карточки */}
            <div className={styles.cardwrapmain}>
                <div className={styles.cardcont} onClick={openEmailModal}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>email</p>
                            <p className={styles.userName}>{email}</p>
                        </div>
                        <p className={styles.changeLink}>{t('change')}</p>
                    </div>
                </div>

                <div className={styles.cardcont} onClick={openPasswordModal}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>password</p>
                            <p className={styles.userName}>{password}</p>
                        </div>
                        <p className={styles.changeLink}>{t('change')}</p>
                    </div>
                </div>

                <div className={styles.cardcont} onClick={() => setActiveModal('phone')}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>phone number</p>
                            <p className={styles.userName}>{phone}</p>
                        </div>
                        <p className={styles.changeLink}>{t('change')}</p>
                    </div>
                </div>

                <div className={styles.cardcont} 
                    onClick={() => {
                        if (!googleStatus) {
                            openAuthModal();
                        } 
                    }}
                >
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>Google Authenticator</p>
                            {googleStatus ?
                                <p className={styles.userName} style={{ color: 'rgb(255, 255, 255)' }}>Enabled</p>
                                :
                                <p className={styles.userName} style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Disabled</p>
                            }
                        </div>
                        {!googleStatus && 
                            <p className={styles.changeLink}>Connect</p>
                        }
                    </div>
                </div>
            </div>

            {/* Переключатели */}
            <div className={styles.cardwrapmain}>
                <p className={styles.title} style={{ fontSize: '18px' }}>Who can send me messages</p>
                {notificationList.map((item) => (
                    <div key={item.id} className={styles.cardcont} onClick={() => toggleNotif(item.id)}>
                        <div className={styles.card}>
                            <div className={styles.cardInfo}>
                                <p className={styles.userName}>{item.label}</p>
                            </div>
                            <div className={`${styles.switch} ${whoCanMessage === item.value ? styles.switchOn : ''}`}>
                                <div className={styles.toggle}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SecurityPage;
