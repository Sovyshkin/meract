import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { guildApi } from "../../../shared/api/guild"; 
import styles from './GuildSettings.module.css';

// Импорты ресурсов
import arrowLeft from '../../../images/arrow-left.png';
import iconguild from '../../../images/iconguild.png'; 
import notification from '../../../images/notification.png';
import { profileApi } from "../../../shared/api/profile";

const GuildSettings = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation(); 
    
    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const inviteSectionRef = useRef(null); 
    const [userid, setUserId] = useState();
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Состояния загрузки
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Поля ввода
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [username, setUserName] = useState('');
    const [email, setEmail] = useState('');

    // Файлы и превью
    const [avatarFile, setAvatarFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
const [inviteError, setInviteError] = useState(false);

    useEffect(() => {
    const loadAllData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            
            // Получаем данные параллельно
            const [profiledata, guildData] = await Promise.all([
                profileApi.getProfile(),
                guildApi.getGuild(id)
            ]);
            if (guildData) {
                setName(guildData.name || '');
                setDescription(guildData.description || '');
                setAvatarPreview(guildData.logoFileName || null);
                setCoverPreview(guildData.coverFileName || null);
            }

            if (profiledata) {
                setUserId(profiledata.id);
                const isUserAdmin = profiledata.id === guildData?.ownerId;
                setIsAdmin(isUserAdmin);
            }
            
        } catch (error) {
            console.error("❌ err:", error);
        } finally {
            setLoading(false);
        }
    };
    
    loadAllData();
}, [id]); 

    useEffect(() => {
        if (location.hash === '#invite' && inviteSectionRef.current) {
            inviteSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [location, loading]);

    const handleFileChange = (e, setFile, setPreview) => {
        const file = e.target.files[0];
        if (file) {
            setFile(file); 
            setPreview(URL.createObjectURL(file)); 
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await guildApi.updateInfo(name, description, avatarFile, coverFile, id);
            navigate(`/guilds/${id}`);
        } catch (error) {
            console.error("Ошибка сохранения:", error);
        } finally {
            setIsSaving(false);
        }
    };
    

    if (loading) return <div className={styles.loader}>Loading...</div>;
    
   const inviteUser = async () => {
    if (!username) {
        setInviteError(true);
        return;
    }

    try {
        setIsSaving(true);
        setInviteError(false);
        await guildApi.inviteUser(username, id);
        navigate(`/guilds/${id}`);
    } catch (error) {
        console.error("Ошибка инвайта:", error);
        setInviteError(true); 
    } finally {
        setIsSaving(false);
    }
};

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.backButton} onClick={() => navigate(`/guilds/${id}`)}>
                    <img src={arrowLeft} alt="Back" className={styles.backIcon} />
                    <p className={styles.backText}>Back</p>
                </div>
                <h1>Setting Guild</h1>
                <img src={notification} alt="Notification" />
            </div>

            {isAdmin && (
                <>
                    <div className={styles.paragraph}>
                        <h3 className={styles.elsetitle}>Basic information</h3>
                        <input 
                            className={styles.inputField} 
                            placeholder="Name guild" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                        />
                        <textarea 
                            className={styles.textareaField} 
                            placeholder="Description" 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className={styles.paragraph}>
                        <h4 className={styles.elsetitle}>Guild avatar</h4>
                        <div className={styles.guildImgContainer} onClick={() => avatarInputRef.current.click()}>
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className={styles.guildimg}/>
                            ) : (
                                <div className={styles.emptyPlaceholder}>
                                    <img src={iconguild} alt="default" className={styles.guildimg} style={{opacity: 0.5}} />
                                    <p>+ Upload Photo</p>
                                </div>
                            )}
                        </div>
                        <input 
                            type="file" hidden ref={avatarInputRef} 
                            onChange={(e) => handleFileChange(e, setAvatarFile, setAvatarPreview)} 
                            accept="image/*"
                        />
                        {/* {avatarPreview && (
                            <button className={styles.button} onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}>Delete</button>
                        )} */}
                    </div>   

                    <div className={styles.paragraph}>
                        <h4 className={styles.elsetitle}>Cover</h4>
                        <div className={styles.guildImgContainer} onClick={() => coverInputRef.current.click()}>
                            {coverPreview ? (
                                <img src={coverPreview} alt="Cover" className={styles.guildimg}/>
                            ) : (
                                <div className={styles.emptyPlaceholder}>+ Upload Cover</div>
                            )}
                        </div>
                        <input 
                            type="file" hidden ref={coverInputRef} 
                            onChange={(e) => handleFileChange(e, setCoverFile, setCoverPreview)} 
                            accept="image/*"
                        />
                        {/* {coverPreview && (
                            <button className={styles.button} onClick={() => { setCoverFile(null); setCoverPreview(null); }}>Delete</button>
                        )} */}
                    </div>   
                </>
            )}

            {/* БЛОК ИНВАЙТОВ — только для владельца гильдии */}
            {isAdmin && (
            <div className={styles.paragraph} ref={inviteSectionRef}>
                <h4 className={styles.elsetitle}>Invite users</h4>
                <p className={styles.subtitle}>Enter email or username</p>
                <input 
    type="text" 
    className={`${styles.inputField} ${inviteError ? styles.inputError : ''}`} 
    placeholder="Username or email" 
    value={username} 
    onChange={(e) => {
        setUserName(e.target.value);
        if (inviteError) setInviteError(false);
    }}
/>
                <div className={styles.active}>
                    <button className={styles.savebutton} onClick={() => inviteUser()}>
                        Add user
                    </button>
                </div> 
            </div>
            )}

            {/* КНОПКА СОХРАНЕНИЯ */}
            {isAdmin &&
            <div className={styles.paragraph}>
                <div className={styles.active}>
                    <button className={styles.savebutton} onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div> 
            </div>          
            }
        </div>
    );
};

export default GuildSettings;
