import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import back from '../../images/arrow-left.png';
import styles from "./SettingsPage.module.css";
import selectedIcon from '../../images/yes.png';
import { profileApi } from '../../shared/api/profile';
import { useI18nStore } from '../../shared/stores/i18nStore';
import { useT } from '../../shared/hooks/useT';
import { LANGUAGES, normalizeLanguage } from '../../shared/constants/languages';

const LanguageSelection = () => {
    const navigate = useNavigate();
    const t = useT();
    const setLocaleFromLanguageName = useI18nStore((s) => s.setLocaleFromLanguageName);

    const [selectedLanguage, setSelectedLanguage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const selectedRes = await profileApi.getSelectedlang();

                if (selectedRes?.languages && selectedRes.languages.length > 0) {
                    setSelectedLanguage(normalizeLanguage(selectedRes.languages[0]));
                }
            } catch (error) {
                console.error("error", error);
            }
        };

        fetchData();
    }, []);

    const savelang = async () => {
        if (!selectedLanguage) {
            alert(t('selectLanguage'));
            return;
        }

        try {
            await profileApi.updateLang([selectedLanguage]);
            setLocaleFromLanguageName(selectedLanguage);
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
                        <h1>{t('language')}</h1>
                    </div>
                    <div></div>
                </div>
            </div>

            <div className={styles.cardwrapmain}>
                {LANGUAGES.map((item) => (
                    <div
                        key={item.value}
                        className={styles.cardcont}
                        onClick={() => setSelectedLanguage(item.value)}
                    >
                        <div className={styles.card}>
                            <div className={styles.cardInfo}>
                                <p className={styles.userName}>{item.label}</p>
                            </div>

                            <div className={styles.selectionArea}>
                                {selectedLanguage === item.value && (
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
