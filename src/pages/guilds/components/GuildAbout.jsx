import styles from './GuildAbout.module.css'
import arrowLeft from '../../../images/arrow-left.png';
import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';
import iconguild from '../../../images/iconguild.png'; 
import { guildApi } from '../../../shared/api/guild';
import { useEffect, useState } from 'react';
import { useT } from '../../../shared/hooks/useT';

 const GuildAbout = () => {
    const t = useT();
    const { id } = useParams();
// ... внутри компонента
const [title, setTitle] = useState('');
const [date, setDate] = useState('');
const [guildDescription, setGuildDescription] = useState('');
const [usersCount, setUsersCount] = useState(0);
const [guildImg, setGuildImg] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
    const loadAllData = async () => {
        try {
            setLoading(true);
            const guildData = await guildApi.getGuild(id);

            if (guildData) {
                setTitle(guildData.name || 'No Name');
                setGuildDescription(guildData.description || 'No description provided');
                setUsersCount(guildData.members?.length || 0);
                setGuildImg(guildData.logoFileName);
                
                if (guildData.createdAt) {
                    setDate(new Date(guildData.createdAt).toLocaleDateString());
                }
            }
        } catch (error) {
            console.error("Ошибка при загрузке гильдии:", error);
        } finally {
            setLoading(false);
        }
    };

    if (id) {
        loadAllData();
    }
}, [id]); 

  const navigate = useNavigate();
   return (
     <div className={styles.container}>
       <div className={styles.backButton} onClick={() => navigate(`/guilds/${id}`)}>
         <img src={arrowLeft} alt={t('back')} className={styles.backIcon} />
         <p className={styles.backText}>
           {t('back')}
         </p>
       </div>
       <div className={styles.paragraph}>
         <h3 className={styles.elsetitle}>{t('guildAbout')}</h3>
         <div style={{display:'flex', gap:'10px', alignItems:'center',}}>
            <img src={guildImg || iconguild} alt=''className={styles.iconguild}/>
            <p className={styles.elsetitle}>{loading ? t('loading') : title}</p>
         </div>
       </div>
       <div className={styles.paragraph}>
         <h3 className={styles.elsetitle}>Сreation date</h3>
         <p className={styles.subtitle}>{date}</p>
       </div>
       <div className={styles.paragraph}>
         <h3 className={styles.elsetitle}>Description</h3>
         <p className={styles.subtitle}>{guildDescription}</p>
       </div>
       <div className={styles.paragraph}>
         <h3 className={styles.elsetitle}>Members</h3>
         <p className={styles.subtitle}>{usersCount} members</p>
       </div>
     
     </div>
   )
 }


export default GuildAbout
