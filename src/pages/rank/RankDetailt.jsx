import back from '../../images/arrow-left.png';
import styles from "./RankPage.module.css";
import logo from '../../images/user.png';
import { useNavigate, useParams } from 'react-router-dom';
import points from '../../images/points.png';
import copy from '../../images/copy.png';
import ActCard from '../acts/components/ActCard';
import { profileApi } from '../../shared/api/profile';
import { useEffect, useState } from 'react';
import { achievementApi } from '../../shared/api/achievementApi';
import { chatApi } from '../../shared/api/chat';

const RankDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [userData, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [acts, setActs] = useState([]);
    const [achive, setAchive] = useState([])
    const [currentId, setCurrentId] = useState(null);
    useEffect(() => {
    const fetchData = async () => {
        try {
            setLoading(true);
            
            const [data, achivedata, mydata] = await Promise.all([
                profileApi.getUserById(id),
                achievementApi.getUserAchievements(id),
                profileApi.getProfile()
            ]);

            console.log(data);
            console.log(mydata.id)
            const actsArray = data.actIds ? data.actIds.map(actId => ({ id: actId })) : [];
            
            setUser(data);
            setAchive(achivedata);
            setCurrentId(mydata.id)
            setActs(actsArray);
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
            // Success
        }).catch(err => {
            console.error('error:', err);
        });
    };

    const isOnline = userData.onlineStatus?.toLowerCase() === 'online' ;

    const formatOnlineStatus = (status) => {
    if (!status) return 'offline';
    
    const numbers = status.match(/\d+/g);
    if (!numbers) return status;

    let totalMinutes = 0;
    if (status.includes('h') && status.includes('m')) {
        totalMinutes = parseInt(numbers[0]) * 60 + parseInt(numbers[1]);
    } else if (status.includes('h')) {
        totalMinutes = parseInt(numbers[0]) * 60;
    } else {
        totalMinutes = parseInt(numbers[0]);
    }

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 && days === 0) result += `${minutes}m`; 

    return result.trim() || 'just now';
};
    const sendMessage = async() => {
        const data = await chatApi.getAll();
        const chatuser = data.find(user => user.partner?.id == id);
        if(chatuser){
            navigate(`/chat/${chatuser.id}/${id}`)
        }else{
            const chatdata = await chatApi.createChat(id);
            navigate(`/chat/${chatdata.id}/${id}`)
        }
    }
    const sendEcho = async() => {
        navigate(`/wallet/transfer/${id}`)
    }
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img 
                        src={back} 
                        alt="back" 
                        onClick={() => navigate('/rank', { replace: true })} 
                        style={{ cursor: 'pointer' }} 
                    />
                </div>
            </div>
            <div className={styles.parent}>
                <div className={styles.profile}>
                    <img src={userData.avatarUrl || logo} alt="avatar" className={styles.logo} />
                    <p className={styles.title} style={{fontWeight:'600',fontSize:'16px', margin:'0px',}}>{userData.fullName || 'no name'}</p>
                    {isOnline ? (
                        <p className={styles.subtitle}>online</p>
                    ) : userData.onlineStatus ? (
                        <p className={styles.subtitle}>
                            last online {formatOnlineStatus(userData.onlineStatus)} ago
                        </p>
                    ) : (
                        <p className={styles.subtitle}>offline</p> 
                    )}


                    <div className={styles.pointsWrapper}>
                        <img src={points} alt="points" />
                        <p style={{ color: 'white' }}>{userData.points}</p>
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
                            <p className={styles.userName}>{userData.login || 'no username'}</p>
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
                            <p className={styles.subtitle}>{userData.country || 'no country'}, {userData.city || 'no city'}</p>
                        </div>
                    </div>
                    <div className={styles.card}>
                        <div className={styles.cardInfo}>
                            <p className={styles.userName} style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Local time</p>
                            {userData.timeZone 
                            ? <p className={styles.subtitle} style={{ color: 'white' }}>({userData.timeZone})</p>
                            : <p className={styles.subtitle} style={{ color: 'white' }}>no timezone</p>
                            
                            }
                        </div>
                    </div>
                    <div className={`${styles.card} ${styles.fullWidthCard}`}>
                        <div className={styles.cardInfo}>
                            <p className={styles.subtitle}>Language</p>
                            <div className={styles.languageBox}>
                                <p className={styles.userName}>
                                    {userData.communicationLanguages?.join(', ') || 'No languages'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div>
                    {currentId != id &&
                    <div className={styles.btncont}>
                        <button className={styles.active} onClick={sendMessage}>Write</button>
                        <button onClick={sendEcho}>Send Echo</button>
                    </div>
                    }
                </div>
            </div>
            <div className={styles.act}>
                <p className={styles.title}>Participated in the acts</p>
                {acts.map((act, index) => (
                    <ActCard key={act.id || index} act={act} titleact={false} />
                ))}
            </div>
        </div>
    );
};

export default RankDetails;
