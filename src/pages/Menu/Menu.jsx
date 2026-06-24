import styles from './Menu.module.css';
import rank from '../../images/ranking.png';
import logout from '../../images/logout.png';
import documentimg from '../../images/document-text.png';
import wallet from '../../images/empty-wallet.png';
import medal from '../../images/medal-star.png';
import message from '../../images/message-time.png';
import close from '../../images/Close.png';
import avatar from '../../images/user.png';
import settings from '../../images/guildsetting.png';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/Auth/Login/hooks/useAuth';
import { profileApi } from '../../shared/api/profile';
import { useAuthStore } from '../../shared/stores/authStore';
import { getDisplayName } from '../../shared/utils/displayName';

const Menu = ({ onClose }) => {
    const cachedUser = useAuthStore((s) => s.user);
    const [username, setName] = useState(getDisplayName(cachedUser, ''));
    const [fullname, setFullName] = useState(cachedUser?.fullName || '');
    const [userimg, setImg] = useState(cachedUser?.avatarUrl);
    const navigate = useNavigate();
    const {signOut} = useAuth();

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await profileApi.getProfile();
                if (data) {
                    setName(getDisplayName(data, ''));
                    setFullName(data.fullName || '');
                    setImg(data.avatarUrl);
                }
            } catch (error) {
                console.error("Error loading profile:", error);
            }
        };
        loadData();
    }, []); 

    const Dologout = () =>{
         onClose();
         signOut();
    }
    return (
        
        <>
            <div className={styles.overlay} onClick={onClose} />
            
            <div className={styles.background}>
                <div className={styles.cont}>

                    <div className={styles.header}>
                        <h3 className={styles.title}>Meract</h3>
                        <img 
                            src={close} 
                            alt="close" 
                            onClick={onClose} 
                            style={{ cursor: 'pointer' }} 
                        />
                    </div>
                        <div className={styles.card} onClick={() => navigate('/settings/profile')}>
                                <div className={styles.rankBadge}>
                                  <img src={userimg || avatar} alt="" className={styles.rankImg} />
                                </div>
                    
                                <div className={styles.cardInfo}>
                                  <p className={styles.userName}>{fullname}</p>
                                  <p className={styles.un}>{username}</p>
                                 
                                </div>
                    
                                
                        </div>
                        <div style={{paddingTop:'20px', paddingBottom:'20px',}}>
                            <hr />
                        </div>
                    <div className={styles.menuItems}>
                        <div className={styles.item}
                        onClick={() => {
                            onClose();
                            navigate('/settings');
                        }
                        }
                        ><img src={settings} /> Settings</div>
                        <div className={styles.item}
                         onClick={() => {
                            onClose();
                            navigate('/rank');
                        }
                        }
                        ><img src={rank} /> Leaders</div>
                        <div className={styles.item}
                        onClick={() => {
                            onClose();
                            navigate('/wallet');
                        }
                        }
                        ><img src={wallet} /> Wallet</div>
                        <div className={styles.item}
                        onClick={() => {
                            onClose();
                            navigate('/my-achievements');
                        }
                        }
                        ><img src={medal} /> Achievements</div>
                        <div className={styles.item}
                         onClick={() => {
                            onClose();
                            navigate('/support');
                        }
                        }
                        ><img src={documentimg}/> Technical support</div>
                        <div className={styles.item}
                         onClick={() => {
                            onClose();
                            navigate('/termofuse');
                        }
                        }
                        ><img src={message} 
                         
                        /> Privacy Policy</div>
                    </div>
                    <div className={styles.menuItems} style={{marginTop:'15px',}}>
                        <p>Actions</p>
                        {/* <div className={styles.item}><img src={message} /> Create Guild</div> */}
                        <div className={styles.item}
                         onClick={() => {
                            onClose();
                            navigate('/my-acts');
                        }
                        }
                        ><img src={documentimg} />My acts</div>

                    </div>
                    <div className={styles.logout} style={{ marginTop: 'auto' }}>
                        <div className={styles.item} style={{color:'#E74209',}}
                          onClick={() => {
                            Dologout();
                        }}
                        ><img src={logout} />Logout</div>

                        
                    </div>
            </div>
                </div>

        </>
    )
}

export default Menu;
