import styles from './SettingsPage.module.css';
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import notification from '../../images/notification.png'
import back from '../../images/arrow-left.png';
import { profileApi } from '../../shared/api/profile';
import { getLanguageLabel } from '../../shared/constants/languages';
import { useT } from '../../shared/hooks/useT';

const SettingsPage = () => {
    const t = useT();
    const navigate = useNavigate();
    const [lang, setLang] = useState('English');

    useEffect(() => {
      const fetchLang = async () => {
        try {
          const data = await profileApi.getSelectedlang();
          if (data?.languages && data.languages.length > 0) {
            setLang(data.languages.map(getLanguageLabel).join(', '));
          }
        } catch (e) {
          console.error('Failed to fetch languages:', e);
        }
      };
      fetchLang();
    }, []);
    return(
        <div className={styles.container}>
              <div className={styles.header}>
                <div className={styles.header_cont}>
                  <img 
                    src={back} 
                    alt="back" 
                    onClick={() => navigate('/acts', { replace: true })}
                    style={{ cursor: 'pointer' }}
                  />
                  <div className={styles.name}>
                    <div className="name"><h1>{t('settings')}</h1></div>
                  </div>
                  <img src={notification} alt="notifications" onClick={() => navigate('/notifications')}/>
                </div>
                 <div >
                  </div>
                
              </div>
        
              <div className={styles.cardcont} style={{gap:'15px',}}>
                  <div 
                    className={styles.card} 
                    // onClick={() => navigate(`/rank/${card.id}`)}
                    style={{padding:'20px',}}
                    onClick={() => navigate('/settings/profile')} 

        >       
                    <div className={styles.cardInfo}>
                      <p className={styles.userName}>{t('personalInfo')}</p>
                    </div>
        
                    <svg 
                      className={styles.arrowIcon} 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                  <div 
                    className={styles.card} 
                    onClick={() => navigate(`/settings/notifications`)}
                    style={{padding:'20px',}}
        >   
                    <div className={styles.cardInfo}>
                      <p className={styles.userName}>{t('notifications')}</p>
                    </div>
        
                    <svg 
                      className={styles.arrowIcon} 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                  <div 
                    className={styles.card} 
                    onClick={() => navigate(`/settings/security`)}
                    style={{padding:'20px',}}
        >   
                    <div className={styles.cardInfo}>
                      <p className={styles.userName}>{t('security')}</p>
                    </div>
        
                    <svg 
                      className={styles.arrowIcon} 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                  <div 
                    className={styles.card} 
                    onClick={() => navigate(`/settings/lang`)}
                    style={{padding:'20px',}}
        >   
                    <div className={styles.cardInfo}>
                      <p className={styles.userName}>{t('languageLabel')}: {lang}</p>
                    </div>
        
                    <svg 
                      className={styles.arrowIcon} 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
              </div>
            </div>
    )
}
export default SettingsPage;
