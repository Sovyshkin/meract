import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import userimg from '../../images/user.png';
import styles from "./MyAchieve.module.css";
import notification from '../../images/notification.png';
import back from '../../images/arrow-left.png';
import { achievementApi } from "../../shared/api/achievementApi";
import { profileApi } from "../../shared/api/profile";
const MyAchieve = () =>{
    const navigate = useNavigate();

    const isAdmin = true;
    const [selectedToSwap, setSelectedToSwap] = useState(null);
     const [loading, setLoading] = useState(true);
    const [achivemenets, setAchivemenets] = useState([]);

     useEffect(() => {
        const loadAllData = async () => {
            try {
                setLoading(true);
                const usedata = await profileApi.getProfile();
                
                const avievedata = await achievementApi.getUserAchievements(usedata.id);  
                console.log(avievedata)
                setAchivemenets(avievedata);
            } catch (error) {
                console.error("❌ err:", error);
            } finally {
                setLoading(false); 
            }
        };
        
        loadAllData();
    }, []);
    const handleAchiveClick = async(clickedAchive) => {
  setAchivemenets(prev => prev.map(a => 
    // Используем achievementId, так как в логе именно он
    a.achievementId === clickedAchive.achievementId 
      ? { ...a, isBest: !a.isBest } 
      : a
  ));
      await achievementApi.changeIsBest(clickedAchive.achievementId)

};

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
    return(
         <div className={styles.container}>
      
              <div className={styles.actsPage}>
                <div className="header">
                  <div className={styles.header_cont}>
                    <img src={back} alt="back" onClick={() => window.history.back()} style={{cursor: 'pointer'}}/>
                    <div className="name"><h1>My achievements</h1></div>
                    <img src={notification} alt="notification" onClick={() => navigate('/notifications')} style={{cursor: 'pointer'}}/>
                  </div>
                </div>
                {achivemenets.length > 0 ?
                 <div className={styles.achivemenets}>
                            <div className={styles.cardcontfirst}>
                                <div style={{display:'flex',flexDirection:'column',gap:'5px',}}>

                              <p className={styles.title} style={{ fontSize: '18px', margin: '0px' }}>Best achievements</p>
                             {isAdmin && <p className={styles.subtitle} style={{ fontSize: '14px', margin: '0px' }}>Indicate achievements that you are especially proud of</p>}
                                </div>
                              
                              {achivemenets.filter(a => a.isBest).map((achive) => (
                                <div 
                                  key={achive.id} 
                                  className={`${styles.members}`} 
                                  onClick={() => handleAchiveClick(achive)}
                                 
                                >
                                  <div className={styles.rankBadge}><img src={achive.achievement.imageUrl} alt="no avatar" className={styles.rankImg} style={{color:'white',}}/></div>
                                  <div className={styles.cardInfo}>
                                    <p className={styles.userName}>{achive.achievement.name}</p>
                                     <p className={styles.userName} style={{ color: '#b5b3b3', fontSize: 'small' }}>
                                        Date of achievement: {formatDate(achive.awardedAt)}
                                      </p>
                                  </div>
                                </div>
                                
                              ))}
                              {achivemenets.filter(a => !a.isBest).length > 0 &&
                                <div className={styles.addachieve}>Add achievements</div>
                              }
                            </div>
                
                            <div className={styles.cardcont} style={{ marginTop: '20px' }}>
                              {achivemenets.filter(a => !a.isBest).map((achive) => (
                                <div 
                                  key={achive.id} 
                                  className={`${styles.members}`} 
                                  onClick={() => handleAchiveClick(achive)}
                                 
                                >
                                  <div className={styles.rankBadge}><img src={achive.achievement.imageUrl} alt="no avatar" className={styles.rankImg} style={{color:'white',}}/></div>
                                  <div className={styles.cardInfo}>
                                    <p className={styles.userName}>{achive.achievement.name}</p>
                                    <p className={styles.userName} style={{ color: '#b5b3b3', fontSize: 'small' }}>
                                        Date of achievement: {formatDate(achive.awardedAt)}
                                      </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                 </div>
                  : <p style={{color:'white', margin:'auto', textAlign:'center',}}>No achievements</p> 
                }

            </div>
        </div>

    )
}
export default MyAchieve;