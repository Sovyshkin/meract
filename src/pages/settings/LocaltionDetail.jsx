import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import back from '../../images/arrow-left.png';
import styles from "./SettingsPage.module.css";
import selected from '../../images/yes.png';
import filter from '../../images/add.png';
import search from '../../images/search.png';
import { useT } from '../../shared/hooks/useT';

const LocationDetailPage = () => {
    const t = useT();
    const navigate = useNavigate();
    const { name } = useParams(); 

    const [selectedCities, setSelectedCities] = useState({
        1: true 
    });

    const locations = [
        { id: 1, label: 'New York' },
        { id: 2, label: 'Madrid' },
        { id: 3, label: 'Tokyo' },
    ];

    const toggleLocation = (id) => {
        setSelectedCities(prev => ({
            [id]: !prev[id]
        }));
    };
    const Save = () => navigate('/settings/location');
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img 
                        src={back} 
                        alt={t('back')}
                        /* Исправлено: возврат на предыдущую страницу профиля */
                        onClick={() => navigate('/settings/profile')}
                        style={{ cursor: 'pointer' }}
                        className={styles.backBtn}
                    />
                    <div className={styles.name}>
                        <h1>{t('location')}: {name}</h1>
                    </div>
                    <div></div>
                </div>

                <div className={styles.nav}>
                    <div className={styles.searchWrapper}>
                        <img src={search} alt="search" className={styles.searchIcon} />
                        <input type="text" placeholder={t('search')} className={styles.input} />
                        <img 
                            src={filter} 
                            alt="add" 
                            className={styles.filterIcon} 
                        />
                    </div>
                </div>
            </div>

            <div className={styles.cardwrapmain}>
                {locations.map((item) => (
                    <div 
                        key={item.id} 
                        className={styles.cardcont} 
                        onClick={() => toggleLocation(item.id)}
                    >
                        <div className={styles.card}>
                            <div className={styles.cardInfo}>
                                <p className={styles.userName}>{item.label}</p>
                            </div>
                            
                            <div className={styles.selectionArea}>
                                {selectedCities[item.id] && (
                                    <img src={selected} alt="selected" className={styles.selectedIcon} />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
             <div className={styles.savebutton}>
                <button className={styles.active} onClick={Save}>{t('save')}</button>
            </div>
        </div>  
    );
};

export default LocationDetailPage;
