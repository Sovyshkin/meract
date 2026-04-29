import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import back from '../../images/arrow-left.png';
import styles from "./SettingsPage.module.css";
import selectedIcon from '../../images/yes.png';
import { profileApi } from '../../shared/api/profile';

const LanguageSelection = () => {
    const navigate = useNavigate();

    const [languages, setLanguages] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('');

      useEffect(() => {
    const fetchData = async () => {
        try {
            const allLangsRes = await profileApi.getLangs();
            setLanguages(allLangsRes.languages || []);

            const selectedRes = await profileApi.getSelectedlang();

            if (selectedRes?.languages && selectedRes.languages.length > 0) {
                setSelectedLanguage(selectedRes.languages[0]);
            }
        } catch (error) {
            console.error("error", error);
        }
    };

    fetchData();
}, []);


    const savelang = async () => {
        if (!selectedLanguage) {
            alert("Please select a language");
            return;
        }

        try {
            await profileApi.updateLang([selectedLanguage]);
            navigate('/settings/profile');
        } catch (error) {
            console.error("Ошибка при сохранении:", error);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img 
                        src={back} 
                        alt="back" 
                        onClick={savelang} 
                        className={styles.backBtn}
                    />
                    <div className="name">
                        <h1>Language</h1>
                    </div>
                    <div></div>
                </div>
            </div>

            <div className={styles.cardwrapmain}>
                {languages.map((item, index) => (
                    <div
                        key={index}
                        className={styles.cardcont}
                        onClick={() => setSelectedLanguage(item)}
                    >
                        <div className={styles.card}>
                            <div className={styles.cardInfo}>
                                <p className={styles.userName}>{item}</p>
                            </div>

                            <div className={styles.selectionArea}>
                                {selectedLanguage === item && (
                                    <img src={selectedIcon} alt="selected" className={styles.selectedIcon} />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>  
    );
};

export default LanguageSelection;
