import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import back from '../../images/arrow-left.png';
import userimg from '../../images/user.png';
import styles from "./SettingsPage.module.css";
import close from '../../images/Close.png';
import { profileApi } from '../../shared/api/profile';
import { useAuthStore } from '../../shared/stores/authStore';
import { getDisplayName } from '../../shared/utils/displayName';

const PersonalData = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('');
    const [modalValue, setModalValue] = useState('');

    const [avatar, setAvatar] = useState(null);
    const [username, setUsername] = useState('');
    const [fullname, setFullname] = useState('');
    const [date, setDate] = useState('');
    const [lang, setLang] = useState([]);
    const [time, setTime] = useState();
    const [location, setLocation] = useState('');
    const [browserTimezone, setBrowserTimezone] = useState('');
    const [locationPermission, setLocationPermission] = useState('prompt');
    const setAuthLocation = useAuthStore((state) => state.setLocation);
    const cachedLocation = useAuthStore((state) => state.cachedLocation);
    const setCachedLocation = useAuthStore((state) => state.setCachedLocation);

    useEffect(() => {
        const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setBrowserTimezone(detectedTz);
    }, []);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setLocationPermission(result.state);
                result.addEventListener('change', () => {
                    setLocationPermission(result.state);
                });
            }).catch(() => {
                setLocationPermission('unsupported');
            });
        } else {
            setLocationPermission('unsupported');
        }
    }, []);

useEffect(() => {
    const fetchData = async () => {
        try {
        const data = await profileApi.getProfile();
        console.log(data, 'dataaaa');

        setAvatar(data.avatarUrl);
        setUsername(getDisplayName(data, "No login"));
        setFullname(data.fullName || "no name");
        setDate(data.createdAt.split('T')[0]);
        setLang(data.communicationLanguages);
        setTime(data.timeZone)

        if (data.country && data.city) {
            setLocation(`${data.country}, ${data.city}`);
        } else if (cachedLocation) {
            setLocation(cachedLocation);
        } else {
            try {
                const geoResponse = await fetch('https://ipapi.co/json/');
                const geoData = await geoResponse.json();
                if (geoData.country_name && geoData.city) {
                    const loc = `${geoData.country_name}, ${geoData.city}`;
                    setLocation(loc);
                    setCachedLocation(loc);
                } else {
                    setLocation('Not available');
                }
            } catch {
                setLocation('Not available');
            }
        }
        } catch (error) {
        console.error("Ошибка при загрузке:", error);
        }
    };

    fetchData();
}, [cachedLocation, setCachedLocation]);

    const DeleteLogo = async() =>{
        try {
        await profileApi.deletePhoto();
        await profileApi.updatePhoto(await toBase64(userimg));
        console.log('Avatar deleted');

        } catch (error) {
        console.error("Ошибка при загрузке:", error);
        }
    }
   const UpdateLogo = async (fileOrUrl) => {
    try {
        let fileToUpload;

        if (fileOrUrl instanceof File) {
            // Если это уже файл из инпута — используем его напрямую
            fileToUpload = fileOrUrl;
        } else {
            // Если это URL, его нужно сначала скачать и превратить в Blob/File
            // Но чаще всего из инпута приходит именно File
            const response = await fetch(fileOrUrl);
            const blob = await response.blob();
            fileToUpload = new File([blob], "avatar.jpg", { type: blob.type });
        }

        // ПЕРЕДАЕМ САМ ФАЙЛ, А НЕ BASE64
        const response = await profileApi.updatePhoto(fileToUpload);
        
        console.log('Фото успешно обновлено:', response);
    } catch (error) {
        console.error("Ошибка при сохранении фото:", error);
    }
};

    
    const toBase64 = (url) => fetch(url)
    .then(response => response.blob())
    .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    }));

    const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
        const imageUrl = URL.createObjectURL(file);
        setAvatar(imageUrl);

        await UpdateLogo(file); 
    }
};


    const triggerChange = () => fileInputRef.current.click();
    const handleDelete = async () => {
        setAvatar(null);
        await DeleteLogo();
    } 

const openModal = (type) => {
    setModalType(type);
    setModalValue(type === 'Name' ? fullname : username);
    setIsModalOpen(true);
  };


    const closeModal = () => setIsModalOpen(false);
const handleSave = async () => {
    try {
        if (modalType === 'Name') {
            await profileApi.updateFullname(modalValue);
            setFullname(modalValue);
        } else if (modalType === 'Username') {
            await profileApi.updateUsername(modalValue);
            setUsername(modalValue);
        }
        closeModal();
    } catch (error) {
        console.error("Ошибка при сохранении:", error);
    }
  };

    const handleRequestLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const locationData = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };
                setAuthLocation(locationData);
                setLocationPermission('granted');
                alert("Location access granted!");
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationPermission('denied');
                        alert("Location access denied. You can enable it in browser settings.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        alert("Location request timed out.");
                        break;
                    default:
                        alert("An unknown error occurred.");
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    const getLocationPermissionText = () => {
        switch (locationPermission) {
            case 'granted':
                return 'Allowed';
            case 'denied':
                return 'Denied';
            case 'prompt':
                return 'Not requested';
            case 'unsupported':
                return 'Not supported';
            default:
                return 'Unknown';
        }
    };

    const getLocationPermissionColor = () => {
        switch (locationPermission) {
            case 'granted':
                return '#00F300';
            case 'denied':
                return '#E74209';
            case 'prompt':
                return '#F5A623';
            default:
                return '#888';
        }
    };

    return (
        <div className={styles.container}>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                accept="image/*" 
            />

           {isModalOpen && (
    <div className={styles.modalOverlay} onClick={closeModal}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <h3 className={styles.modalTitle}>Edit {modalType}</h3>
                <img src={close} alt="close" onClick={closeModal} style={{cursor: 'pointer'}}/>
            </div>
            <input 
                type="text" 
                className={styles.modalInput} 
                value={modalValue} 
                onChange={(e) => setModalValue(e.target.value)}
                placeholder={`Enter new ${modalType}`}
            />
            <div className={styles.modalButtons}>
                <button className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                <button className={styles.active} onClick={handleSave}>Save</button>
            </div>
        </div>
    </div>
)}


            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img 
                        src={back} 
                        alt="back" 
                        onClick={() => navigate('/settings')} 
                        className={styles.backBtn}
                    />
                    <div className="name">
                        <h1>Profile</h1>
                    </div>
                    {/* <img src={changeIcon} alt="notifications" onClick={() => navigate('/notifications')} className={styles.pointer}/> */}
                    <div></div>
                </div>
            </div>

            <div className={styles.sectionMargin}>
                <p className={styles.title} style={{fontSize:'18px',}}>Profile photo</p>
                <div className={styles.parent}>
                    <div className={styles.profile}>
                        {avatar 
                        ?   <img src={avatar} className={styles.logo} />
                        :   <p style={{color:'white',}}>no avatar</p>
                        }
                        <div className={styles.btncont}>
                            <button className={styles.active} onClick={triggerChange}>Change</button>
                            <button onClick={handleDelete} style={{ background: '#E74209' }}>Delete</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.cardwrapmain}>
                <div className={styles.cardcont} onClick={() => openModal('Name')}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>First and last name</p>
                            <p className={styles.userName}>{fullname}</p>
                        </div>
                        <p className={styles.changeLink}>Change</p>
                    </div>
                </div>

                <div className={styles.cardcont} onClick={() => openModal('Username')}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>Username</p>
                            <p className={styles.userName}>{username}</p>
                        </div>
                        <p className={styles.changeLink}>Change</p>
                    </div>
                </div>

                <div className={styles.cardcont}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>Registration date:</p>
                            <p className={styles.userName}>{date}</p>
                        </div>
                    </div>
                </div>

                {/* Карточка Language */}
                <div className={styles.cardcont} onClick={() => {
                    navigate(`/settings/lang`);
                    }}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.userName}>
                                Language: {lang && lang.length > 0 ? lang.join(', ') : 'Not selected'}
                            </p>

                        </div>
                        <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>

                {/* Карточка Location Permission */}
                <div className={styles.cardcont}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>Location access</p>
                            <p className={styles.userName} style={{ color: getLocationPermissionColor() }}>
                                {getLocationPermissionText()}
                            </p>
                        </div>
                        {locationPermission !== 'granted' && (
                            <button 
                                className={styles.active} 
                                onClick={handleRequestLocation}
                                style={{ padding: '8px 16px', fontSize: '12px' }}
                            >
                                Allow
                            </button>
                        )}
                    </div>
                </div>

                {/* Карточка Location */}
                <div className={styles.cardcont} onClick={() => navigate('/settings/location')}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>Saved location</p>
                            <p className={styles.userName}>{location || 'Not set'}</p>
                        </div>
                        <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>

                {/* Карточка Local Time - Browser */}
                <div className={styles.cardcont}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>Your timezone (detected)</p>
                            <p className={styles.userName}>{browserTimezone || 'Detecting...'}</p>
                        </div>
                    </div>
                </div>

                {/* Карточка Local Time */}
                <div className={styles.cardcont} onClick={() => navigate(`/settings/time/${time}`)}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>Selected timezone</p>
                            <p className={styles.userName}>{time || 'Not set'}</p>
                        </div>
                        <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonalData;
