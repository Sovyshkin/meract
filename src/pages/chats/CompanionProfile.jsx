import back from '../../images/arrow-left.png';
import styles from "../rank/RankPage.module.css";
import logo from '../../images/user.png';
import { useNavigate, useParams } from 'react-router-dom';
import points from '../../images/points.png';
import copy from '../../images/copy.png';
import ActCard from '../acts/components/ActCard';
import { profileApi } from '../../shared/api/profile';
import { chatApi } from '../../shared/api/chat';
import { useEffect, useState } from 'react';
import { achievementApi } from '../../shared/api/achievementApi';
import { useT } from '../../shared/hooks/useT';

const CompanionProfile = () => {
    const t = useT();
    const navigate = useNavigate();
    const { id, userId } = useParams();
    const [userData, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [acts, setActs] = useState([]);
    const [images, setImages] = useState([]);
    const [videos, setVideos] = useState([]);
    const [nav, setNav] = useState(2);
    const [achive, setAchieve] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [userResponse, chatResponse, achievedata] = await Promise.all([
                    profileApi.getUserById(id),
                    chatApi.getMessages(id),
                    achievementApi.getUserAchievements(id),
                ]);

                const actsArray = userResponse.actIds ? userResponse.actIds.map(actId => ({ id: actId })) : [];
                setUser(userResponse);
                setAchieve(achievedata);
                setActs(actsArray);
                // Медиа из чата
                if (chatResponse) {
                    setImages(chatResponse.images || []);
                    setVideos(chatResponse.videos || []);
                }

            } catch (error) {
                console.error("err", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id]);

    if (loading || !userData) {
        return (
            <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
                Loading...
            </div>
        );
    }

    const copyText = () => {
        navigator.clipboard.writeText(userData.login).then(() => {
            // Можно добавить уведомление
        }).catch(err => {
            console.error('error:', err);
        });
    };

     const sendMessage = async() => {
        const data = await chatApi.getAll();
        const chatuser = data.find(user => user.partner.id == id);
        if(chatuser){
            navigate(`/chat/${chatuser.id}/${data.id}`)
        }else{
            const chatdata = await chatApi.createChat(id);
            navigate(`/chat/${chatdata.id}/${id}`)
        }
    }
    const sendEcho = async() => {
        navigate(`/wallet/transfer/${id}`)
    }

    const isOnline = userData.onlineStatus?.toLowerCase() === 'online';

    const handleNavChange = (type) => {
        setNav(type);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img 
                        src={back} 
                        alt="back" 
                        onClick={() => navigate(`/chat/${id}/${userId}`, { replace: true })} 
                        style={{ cursor: 'pointer' }} 
                    />
                </div>
            </div>
            
            <div className={styles.parent}>
                <div className={styles.profile}>
                    <img src={userData.avatarUrl || logo} alt="avatar" className={styles.logo} />
                    <p className={styles.title} style={{fontWeight:'600',fontSize:'16px', margin:'0px',}}>{userData.fullName || t('companionNoName')}</p>
                    {isOnline ? (
                        <p className={styles.subtitle}>Online</p>
                    ) : userData.onlineStatus ? (
                        <p className={styles.subtitle}>{t('companionLastOnline')} {userData.onlineStatus} ago</p>
                    ) : (
                        <p className={styles.subtitle}>Offline</p> 
                    )}

                    <div className={styles.pointsWrapper}>
                        <img src={points} alt="points" />
                        <p style={{ color: 'white' }}>{userData.points || 0}</p>
                    </div>
                </div>
            </div>
            
            <div className={styles.cardwrapmain}>
                <div className={styles.cardcont}>
                    <div className={styles.card} onClick={() => {
                                            if(achive.length > 0) navigate(`/rank-achive/${id}`)
                                
                                        }}>
                                            <div className={styles.cardInfo}>
                                                <p className={styles.userName}>Achievements</p>
                                                <p className={styles.subtitle}>{achive.length} Achievements</p>
                                            </div>
                                            {achive.length > 0 &&
                                            <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                            </svg>
                                            }
                    
                                        </div>
                </div>
                <div className={styles.cardcont}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>Username</p>
                            <p className={styles.userName}>{userData.login || 'no login'}</p>
                        </div>
                        {userData.login &&
                        <img 
                            className={styles.arrowIcon} 
                            src={copy}
                            alt="copy"
                            style={{ opacity: '1', cursor: 'pointer' }}
                            onClick={copyText}
                        />
                        }

                    </div>
                </div>
                <div className={styles.cardwrap}>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.userName}>Location</p>
                            <p className={styles.subtitle}>
                                {userData.country || 'No country'}, {userData.city || 'No city'}
                            </p>
                        </div>
                    </div>
                    
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.userName}>Local time</p>
                            {userData.timeZone ? (
                                <p className={styles.subtitle} style={{ color: 'white' }}>{userData.timeZone}</p>
                            ) : (
                                <p className={styles.subtitle} style={{ color: 'white' }}>{t('companionNotSpecified')}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className={`${styles.card} ${styles.fullWidthCard}`}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>{t('companionLanguages')}</p>
                            <div className={styles.languageBox}>
                                <p className={styles.userName}>
                                    {userData.communicationLanguages?.length > 0 
                                        ? userData.communicationLanguages.join(', ') 
                                        : t('companionNoLanguages')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                
                
                <div>
                    <div className={styles.btncont}>
                        <button className={styles.active} onClick={sendMessage}>{t('companionWrite')}</button>
                        <button onClick={sendEcho}>{t('companionSendEcho')}</button>
                    </div>
                </div>
                
                <div>
                    <div className={styles.btncont}>
                        <button 
                            className={nav === 0 ? styles.active : ""} 
                            onClick={() => handleNavChange(0)}
                        >
                            Images ({images.length})
                        </button>
                        <button 
                            className={nav === 1 ? styles.active : ""} 
                            onClick={() => handleNavChange(1)}
                        >
                            Videos ({videos.length})
                        </button>
                        <button 
                            className={nav === 2 ? styles.active : ""} 
                            onClick={() => handleNavChange(2)}
                        >
                            Acts ({acts.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Вкладка Images */}
            {nav === 0 && (
                <div className={styles.mediaGrid}>
                    <p className={styles.title}>Images from chat</p>
                    {images.length > 0 ? (
                        <div className={styles.grid}>
                            {images.map((image) => (
                                <div 
                                    key={image.id} 
                                    className={styles.mediaItem}
                                    onClick={() => window.open(image.fileUrl, '_blank')}
                                >
                                    <img 
                                        src={image.fileUrl} 
                                        alt="chat media" 
                                        className={styles.mediaPreview}
                                    />
                                    <div className={styles.mediaDate}>
                                        {formatDate(image.createdAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <h3 className={styles.noResults}>{t('companionNoImages')}</h3>
                    )}
                </div>
            )}

            {/* Вкладка Videos */}
            {nav === 1 && (
                <div className={styles.mediaGrid}>
                    <p className={styles.title}>Videos from chat</p>
                    {videos.length > 0 ? (
                        <div className={styles.grid}>
                            {videos.map((video) => (
                                <div 
                                    key={video.id} 
                                    className={styles.mediaItem}
                                    onClick={() => window.open(video.fileUrl, '_blank')}
                                >
                                    <video 
                                        src={video.fileUrl} 
                                        className={styles.mediaPreview}
                                        muted
                                    />
                                    <div className={styles.mediaDate}>
                                        {formatDate(video.createdAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <h3 className={styles.noResults}>{t('companionNoVideos')}</h3>
                    )}
                </div>
            )}

            {/* Вкладка Acts */}
            {nav === 2 && (
                <div className={styles.act}>
                    {acts.length > 0 ? (
                        <>
                            <p className={styles.title}>{t('companionParticipatedActs')}</p>
                            {acts.map((act, index) => (
                                <ActCard key={act.id || index} act={act} titleact={false} />
                            ))}
                        </>
                    ) : (
                        <h3 className={styles.noResults}>Nothing found</h3>
                    )}
                </div>
            )}
        </div>
    );
};

export default CompanionProfile;
