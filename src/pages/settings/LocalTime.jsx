import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import back from '../../images/arrow-left.png';
import styles from "./SettingsPage.module.css";
import selected from '../../images/yes.png';
import { profileApi } from '../../shared/api/profile';
const LocalTime = () => {
    const navigate = useNavigate();
    const {name} = useParams();

    const [timeZones, setTimeZones] = useState([]);
    const [selectedZone, setSelectedZone] = useState(name || ''); 
    const [isAutoDetected, setIsAutoDetected] = useState(false);
    
    useEffect(() => {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const fetchData = async () => {
            try {
            const data = await profileApi.getTimezone();
            setTimeZones(data.zones);
            console.log(data, 'localllllllll');
            
            if (!name) {
                setSelectedZone(browserTz);
                setIsAutoDetected(true);
                try {
                    await profileApi.updateTimezone(browserTz);
                } catch (e) {
                    console.error("Failed to auto-save timezone:", e);
                }
            }
    
            } catch (error) {
            console.error("Ошибка при загрузке:", error);
            }
        };
        fetchData();
    }, [name])
    const handleSelect = async (zone) => {
    setSelectedZone(zone); 
    setIsAutoDetected(false);
    try {
        await profileApi.updateTimezone(zone);
    } catch (e) {
        console.error("error:", e);
    }
};

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img 
                        src={back} 
                        alt="back" 
                        onClick={() => navigate('/settings/profile')} 
                        className={styles.backBtn}
                    />
                    <div className="name">
                        <h1>Local time</h1>
                        {isAutoDetected && (
                            <p style={{ fontSize: '11px', color: '#00F300', margin: '2px 0 0 0' }}>
                                Auto-detected from browser
                            </p>
                        )}
                    </div>
                    <div></div>
                </div>
            </div>

            <div className={styles.cardwrapmain}>
    {timeZones.map((item, index) => (
        <div 
            key={index} 
            className={styles.cardcont} 
            onClick={() => handleSelect(item)} 
        >
            <div className={styles.card}>
                <div className={styles.cardInfo}>
                    <p className={styles.userName}>{item}</p>
                </div>
                
                <div className={styles.selectionArea}>
                    {selectedZone === item && (
                        <img src={selected} alt="selected" className={styles.selectedIcon} />
                    )}
                </div>
            </div>
        </div>
    ))}
</div>

        </div>  
    );
};

export default LocalTime;
