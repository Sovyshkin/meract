import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import back from '../../images/arrow-left.png';
import styles from "./SettingsPage.module.css";
import { useEffect } from 'react';
import { profileApi } from '../../shared/api/profile';
import { useT } from '../../shared/hooks/useT';

const NotificationsPage = () => {
    const t = useT();
    const navigate = useNavigate();

    const [notifs, setNotifs] = useState({
    all: true,
    progress: true,
    guild: true,
    mentions: true,
    updates: true
});

useEffect(() => {
    const fetchData = async () => {
        try {
            const data = await profileApi.getNotice();
            console.log(data, 'dataaaa');

            setNotifs({
                all: data.notifyAll,
                progress: data.notifyActProgress,
                guild: data.notifyGuildInvites,
                mentions: data.notifyChatMentions,
                updates: data.notifyActStatusRealtime 
            });

        } catch (error) {
            console.error("Ошибка при загрузке:", error);
        }
    };

    fetchData();
}, []);



    const toggleNotif = async (key) => {
        const nextState = { ...notifs, [key]: !notifs[key] };
        
        setNotifs(nextState);
        
        try {
            await profileApi.updateNotice(nextState);
        } catch (error) {
            console.error("Не удалось обновить настройки:", error);
            setNotifs(notifs); 
        }
};


    const notificationList = [
        { id: 'all', label: t('allNotifications') },
        { id: 'progress', label: t('actProgress') },
        { id: 'guild', label: t('guildInvites') },
        { id: 'mentions', label: t('chatMentions') },
        { id: 'updates', label: t('realtimeActUpdates') }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img 
                        src={back} 
                        alt="back" 
                        onClick={() => navigate('/settings')} 
                        className={styles.backBtn}
                    />
                    <div className="name">
                        <h1>{t('notifications')}</h1>
                    </div>
                    <div></div>
                </div>
            </div>

            <div className={styles.cardwrapmain}>
                {notificationList.map((item) => (
                    <div 
                        key={item.id} 
                        className={styles.cardcont} 
                        onClick={() => toggleNotif(item.id)}
                    >
                        <div className={styles.card}>
                            <div className={styles.cardInfo}>
                                <p className={styles.userName}>{item.label}</p>
                            </div>
                            
                            <div className={`${styles.switch} ${notifs[item.id] ? styles.switchOn : ''}`}>
                                <div className={styles.toggle}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>  
    );
};

export default NotificationsPage;
