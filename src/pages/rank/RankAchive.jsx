import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import userimg from '../../images/user.png';
import styles from "./RankPage.module.css";
import notification from '../../images/notification.png';
import back from '../../images/arrow-left.png';
import { achievementApi } from "../../shared/api/achievementApi";
import { profileApi } from "../../shared/api/profile";

const RankAchive = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // ID пользователя из URL
    
    // Состояния
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [achievements, setAchievements] = useState([]);
    
    // Загрузка данных при монтировании
    useEffect(() => {
        let isMounted = true;

        const loadUserAchievements = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Если id не передан в URL, получаем текущего пользователя
                let userId = id;
                
                if (!userId) {
                    console.log("📡 No user ID in URL, fetching current profile...");
                    const userData = await profileApi.getProfile();
                    console.log("✅ Profile received:", userData);
                    
                    if (!userData?.id) {
                        throw new Error("Profile data is missing or invalid");
                    }
                    userId = userData.id;
                }

                console.log(`📡 Fetching achievements for user ${userId}...`);
                const achievementsData = await achievementApi.getUserAchievements(userId);
                console.log("✅ Achievements received:", achievementsData);

                if (!isMounted) return;

                // Трансформируем данные для отображения (как во втором компоненте)
                let transformedAchievements = [];
                
                if (Array.isArray(achievementsData)) {
                    transformedAchievements = achievementsData.map((achievement) => ({
                        id: achievement.id,
                        achievementId: achievement.achievementId,
                        name: achievement.achievement?.name || 'Unknown Achievement',
                        avatar: achievement.achievement?.imageUrl || userimg,
                        description: achievement.achievement?.description || '',
                        isBest: achievement.isBest || false,
                        awardedAt: achievement.awardedAt
                    }));
                } else if (achievementsData?.data && Array.isArray(achievementsData.data)) {
                    transformedAchievements = achievementsData.data.map((achievement) => ({
                        id: achievement.id,
                        achievementId: achievement.achievementId,
                        name: achievement.achievement?.name || 'Unknown Achievement',
                        avatar: achievement.achievement?.imageUrl || userimg,
                        description: achievement.achievement?.description || '',
                        isBest: achievement.isBest || false,
                        awardedAt: achievement.awardedAt
                    }));
                }

                console.log("✅ Transformed achievements:", transformedAchievements);
                setAchievements(transformedAchievements);

            } catch (err) {
                console.error("❌ Error loading data:", err);
                
                if (!isMounted) return;
                
                setError(err.message || "Failed to load achievements");
                
                // Тестовые данные для разработки
                if (process.env.NODE_ENV === 'development') {
                    console.log("Using mock data for development");
                    setAchievements([
                        { 
                            id: 1, 
                            achievementId: 101,
                            name: 'Gold Digger', 
                            avatar: userimg, 
                            description: 'Earn 1000 coins', 
                            isBest: true, 
                            awardedAt: new Date().toISOString() 
                        },
                        { 
                            id: 2, 
                            achievementId: 102,
                            name: 'Platinum', 
                            avatar: userimg, 
                            description: 'Reach level 50', 
                            isBest: true, 
                            awardedAt: new Date().toISOString() 
                        },
                        { 
                            id: 3, 
                            achievementId: 103,
                            name: 'Digger', 
                            avatar: userimg, 
                            description: 'Complete 10 quests', 
                            isBest: false, 
                            awardedAt: new Date().toISOString() 
                        },
                        { 
                            id: 4, 
                            achievementId: 104,
                            name: 'Platina', 
                            avatar: userimg, 
                            description: 'Win 5 tournaments', 
                            isBest: false, 
                            awardedAt: new Date().toISOString() 
                        },
                    ]);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadUserAchievements();

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [id]); // Зависимость от id из URL

    // Функция форматирования даты
    const formatDate = (dateString) => {
        if (!dateString) return 'Not achieved yet';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid date';
        }
    };

    // Рендер состояния загрузки
    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <p>Loading achievements...</p>
                </div>
            </div>
        );
    }

    // Рендер ошибки
    if (error && achievements.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.errorContainer}>
                    <p className={styles.errorText}>Error: {error}</p>
                    <button 
                        className={styles.retryButton}
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Разделяем достижения на лучшие и обычные
    const bestAchievements = achievements.filter(a => a.isBest);
    const otherAchievements = achievements.filter(a => !a.isBest);

    return (
        <div className={styles.container}>
            <div className={styles.actsPage}>
                {/* Header */}
                <div className="header">
                    <div className={styles.header_cont}>
                        <img 
                            src={back} 
                            alt="back" 
                            onClick={() => navigate(id ? `/rank/${id}` : '/acts', { replace: true })} 
                            style={{ cursor: 'pointer' }}
                        />
                        <div className="name">
                            <h1>{id ? 'User Achievements' : 'My Achievements'}</h1>
                        </div>
                        <img 
                            src={notification} 
                            alt="notification" 
                            onClick={() => navigate('/notifications')} 
                            style={{ cursor: 'pointer' }}
                        />
                    </div>
                </div>

                {/* Achievements */}
                <div className={styles.achivemenets}>
                    {/* Best achievements section */}
                    <div className={styles.cardcontfirst}>
                        <p className={styles.title} style={{ fontSize: '18px', margin: '0px 0px 10px 0px' }}>
                            Best achievements
                        </p>

                        {bestAchievements.length > 0 ? (
                            bestAchievements.map((achievement) => (
                                <div key={achievement.id} className={styles.members}>
                                    <div className={styles.rankBadge}>
                                        <img src={achievement.avatar} alt="avatar" className={styles.rankImg} />
                                    </div>
                                    <div className={styles.cardInfo}>
                                        <p className={styles.userName}>{achievement.name}</p>
                                        <p className={styles.userName} style={{ color: '#b5b3b3', fontSize: 'small' }}>
                                            Date of achievement: {formatDate(achievement.awardedAt)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className={styles.emptyMessage} style={{color:'white', margin:'auto',}}>No best achievements yet</p>
                        )}
                    </div>

                    {/* Other achievements section */}
                    <div className={styles.cardcont} style={{ marginTop: '20px' }}>
                        {otherAchievements.length > 0 ? (
                            otherAchievements.map((achievement) => (
                                <div key={achievement.id} className={styles.members}>
                                    <div className={styles.rankBadge}>
                                        <img src={achievement.avatar} alt="avatar" className={styles.rankImg} />
                                    </div>
                                    <div className={styles.cardInfo}>
                                        <p className={styles.userName}>{achievement.name}</p>
                                        <p className={styles.userName} style={{ color: '#b5b3b3', fontSize: 'small' }}>
                                            Date of achievement: {formatDate(achievement.awardedAt)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                          <></>
                          // <p className={styles.emptyMessage} style={{color:'white', margin:'auto',}}>No achievements yet</p>

                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RankAchive;
