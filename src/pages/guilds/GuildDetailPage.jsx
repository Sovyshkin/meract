import { use, useEffect, useId, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../shared/api/api";
import { useAuthStore } from "../../shared/stores/authStore";
import styles from "./GuildDetailPage.module.css";

import arrowLeft from '../../images/arrow-left.png';
import guildmenu from '../../images/guildmenu.png';
import iconguild from '../../images/iconguild.png?url'; 
import userimg from '../../images/user.png';
import ActCard from "../acts/components/ActCard";
import exit from '../../images/exit.png';
import about from '../../images/about.png'; 
import notification from '../../images/notification.png'; 
import adduser from '../../images/adduser.png'; 
import guildsetting from '../../images/guildsetting.png';
import { guildApi } from "../../shared/api/guild";
import { profileApi } from "../../shared/api/profile";
import { toast } from "react-toastify";

export default function GuildDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [isAdmin, setAdmin] = useState(false);

  const [userid, setUserid] = useState(null);
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  
  const [navMethod, setNavMethod] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [selectedToSwap, setSelectedToSwap] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [achivemenets, setAchivemenets] = useState([]);
  const [members, setMembers] = useState([]);

  const [joinusers, setJoin] = useState([]);
  const [myInvites, setMyInvites] = useState([]);
  const [memberTab, setMemberTab] = useState(0);

  const descRef = useRef(null);
  const [title, setTitle] = useState('Name');
  const [usersCount, setUsersCount] = useState(0);
  const [description, setDescription] = useState('');
  const [guildImg, setGuildImg] = useState(null);
  const [guildCover, setGuildCover] = useState(null);

  const [actscount, setActscount] = useState(0);
  const [acts, setActs] = useState([
        // {
        //   id: 1,
        //   title: "Voices in the Crowd",
        //   description:
        //     "Lorem ipsum is a dummy or placeholder text commonly used in graphic design, publishing",
        //   navigator: "Graphite8",
        //   heroes: ["Graphite8", "NeonFox", "ShadowWeave", "EchoStorm1"],
        //   location: "Puerto de la Cruz (ES)",
        //   distance: "2,500km Away",
        //   upvotes: 12,
        //   downvotes: 12,
        //   liveIn: "2h 15m",
        //   isMock: true,
        //   status:'ONLINE',
        // },
      ]);
useEffect(() => {
  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Загружаем гильдию и профиль параллельно
      const [guildData, profileData] = await Promise.all([
        guildApi.getGuild(id),
        profileApi.getProfile()
      ]);

      console.log('guildData:', guildData);
      
      // Обработка данных гильдии
      if (guildData) {
        setTitle(guildData.name || 'No Name');
        setDescription(guildData.description || 'no description');
        setUsersCount(guildData.members.length);
        setGuildImg(guildData.logoFileName);
        setGuildCover(guildData.coverFileName);
        setMembers(guildData.members);
        setAchivemenets(guildData.achievements);
        setActscount(guildData.actsCount);
        setActs(guildData.acts);
        
        // Проверка членства (нестрогое сравнение т.к. id может быть числом или строкой)
        const isUserMember = guildData.members.some(m => m.id == profileData.id);
        const isUserOwner = guildData.ownerId == profileData.id;

        setIsMember(isUserMember);
        setAdmin(isUserOwner);
        setUserid(profileData.id);

        // Проверяем наличие ожидающей заявки из localStorage
        const pendingKey = `guild_pending_${id}_${profileData.id}`;
        if (localStorage.getItem(pendingKey) === 'true') {
          setHasPendingRequest(true);
        }

        // Если владелец, загружаем заявки
        if (isUserOwner) {
          try {
            const joinData = await guildApi.getJoins(id);
            setJoin(joinData);
          } catch (joinError) {
            console.error("Error loading joins:", joinError);
            setJoin([]);
          }
        }

        // Если член гильдии (но не владелец), загружаем приглашения
        if (isUserMember && !isUserOwner) {
          try {
            const invitesData = await guildApi.getMyInvites();
            const guildInvites = Array.isArray(invitesData) 
              ? invitesData.filter(inv => inv.guildId === Number(id))
              : [];
            setMyInvites(guildInvites);
          } catch (inviteError) {
            console.error("Error loading invites:", inviteError);
            setMyInvites([]);
          }
        }
      }

    } catch (error) {
      console.error("error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (id) {
    loadAllData();
  }
}, [id]);

  const requestGuild = async() => {
    try {
      await guildApi.joinGuild(id);
      setHasPendingRequest(true);
      localStorage.setItem(`guild_pending_${id}_${userid}`, 'true');
      toast.success('Request submitted successfully!');
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (err?.response?.status === 400 && msg.toLowerCase().includes('pending')) {
        setHasPendingRequest(true);
        localStorage.setItem(`guild_pending_${id}_${userid}`, 'true');
        toast.info('Your request has already been submitted');
      } else if (err?.response?.status === 400 && msg.toLowerCase().includes('already a member')) {
        setIsMember(true);
      } else {
        toast.error('Failed to submit request. Please try again.');
        console.error('Failed to submit guild request:', err);
      }
    }
  }

  useEffect(() => {
    if (descRef.current) {
      setIsOverflowing(descRef.current.scrollHeight > 60);
    }
  }, [description, loading]);

  useEffect(() => {
    const closeMenu = () => setIsMenuOpen(false);
    if (isMenuOpen) {
      window.addEventListener('click', closeMenu);
    }
    return () => window.removeEventListener('click', closeMenu);
  }, [isMenuOpen]);

  const handleAchiveClick = (clickedAchive) => {
    if (!isAdmin) return;

    if (!selectedToSwap) {
      setSelectedToSwap(clickedAchive);
    } else {
      if (selectedToSwap.id === clickedAchive.id) {
        setSelectedToSwap(null);
        return;
      }

      const updated = achivemenets.map(a => {
        if (a.id === clickedAchive.id) return { ...a, isBest: selectedToSwap.isBest };
        if (a.id === selectedToSwap.id) return { ...a, isBest: clickedAchive.isBest };
        return a;
      });

      setAchivemenets(updated);
      setSelectedToSwap(null);
    }
  };

  const kickuser = async() => {
    await guildApi.kickUser(userid, id);
    navigate('/guilds')
  }

  const topBannerStyle = {
    backgroundImage: `url(${guildCover})`,
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '40vh',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
    WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
    maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'
  };

  const DenyJoin = async(joinId) => {
    await guildApi.RejectJoin(joinId);
    const updatedJoins = joinusers.filter(join => join.id !== joinId);
    setJoin(updatedJoins);
    await getmembers();
  }
  const AcceptJoin = async(joinId) => {
    await guildApi.AcceptJoin(joinId);
    const updatedJoins = joinusers.filter(join => join.id !== joinId);
    setJoin(updatedJoins);
    await getmembers();
    
  }
  const getmembers = async() => {
    const guildData = await guildApi.getGuild(id);
    setMembers(guildData.members);

  }

  const AcceptInvite = async(inviteGuildId) => {
    try {
      await guildApi.acceptInvite(inviteGuildId);
      setMyInvites(prev => prev.filter(inv => inv.guildId !== inviteGuildId));
      setIsMember(true);
      toast.success('You joined the guild!');
    } catch (err) {
      toast.error('Failed to accept invite');
    }
  }

  const RejectInvite = async(inviteGuildId) => {
    try {
      await guildApi.rejectInvite(inviteGuildId);
      setMyInvites(prev => prev.filter(inv => inv.guildId !== inviteGuildId));
      toast.info('Invite rejected');
    } catch (err) {
      toast.error('Failed to reject invite');
    }
  }

  return (
    <div className={styles.container}>
      <div style={topBannerStyle} />

      <div className={styles.contentWrapper}>
        <div className={styles.header}>
          <div className={styles.backButton} onClick={() => navigate("/guilds")}>
            <img src={arrowLeft} alt="Back" className={styles.backIcon} />
            <p className={styles.backText}>Back</p>
        </div>

        <div className={styles.menuContainer}>
        <img 
          src={guildmenu} 
          alt="Menu" 
          className={styles.menuIcon} 
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }} 
        />
        
        {isMenuOpen && (
          <div 
            className={styles.dropdown} 
            onClick={(e) => e.stopPropagation()} 
          >
            {(isMember || isAdmin) && (
            <div className={styles.dpopitem}>
              <img src={notification} alt="" />
              <div className={styles.menuItem}>Turn off notifications</div>
            </div>
            )

            }
            {isAdmin && (
            <div className={styles.dpopitem}>
              <img src={adduser} alt="" />
              <div className={styles.menuItem} onClick={() => navigate(`/guild-settings/${id}`)}>Invite member</div>
            </div>
            )}
           
            <div className={styles.dpopitem} >
              <img src={about} alt="" />
              <div className={styles.menuItem} onClick={() => navigate(`/guild-about/${id}`)}>About guild</div>
            </div>
            {isAdmin &&
             <div className={styles.dpopitem}>
              <img src={guildsetting} alt="" />
              <div className={styles.menuItem} onClick={() => navigate(`/guild-settings/${id}`)}>Guild settings</div>
            </div>
            }
            {isMember &&

             <div className={styles.dpopitem}>
              <img src={exit} alt="" />
              <div className={styles.menuItem}
              onClick={() => kickuser()}
              >Leave guild</div>
            </div>
            }
          </div>

)}
        </div>

        </div>


        <div className={styles.card}>
          <div className={styles.head}>
            <img src={guildImg} alt="" className={styles.avatar} />
            <div className={styles.headtext}>
              <h1 className={styles.title}>{title || 'no name'}</h1>
              <div className={styles.usersdiv}>
                <img src={userimg} alt="" />
                <p className={styles.desc} style={{ color: '#c9c8c8' }}>{usersCount}</p>
              </div>
            </div>
          </div>

          <div className={styles.descriptionContainer}>
            <p ref={descRef} className={`${styles.descriptionText} ${!isExpanded ? styles.collapsed : ""}`}>
              {description}
            </p>
            {isOverflowing && (
              <p className={styles.toggleBtn} onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? "Hide" : "Read it in full"}
              </p>
            )}
          </div>
          {!isMember && !isAdmin &&
            <div className={styles.savebutton}>
              {hasPendingRequest ? (
                <button disabled style={{ opacity: 0.5, cursor: 'default' }}>Request sent</button>
              ) : (
                <button className={styles.active} onClick={requestGuild}>Submit a request</button>
              )}
            </div>
          }
        </div>

        <div className={styles.item} style={{position:'relative',}}>
          <div className={styles.btncont}>
            <button className={navMethod === 0 ? styles.active : ""} onClick={() => setNavMethod(0)}>Guild Acts</button>
            <button className={navMethod === 1 ? styles.active : ""} onClick={() => setNavMethod(1)}>
              Members
              {isAdmin && joinusers.length > 0 &&
                <div style={{background:'#E74209', borderRadius:'8px', padding:'3px', padding:'1px 4px',}}>
                  +{joinusers.length}
                </div>
              }
              {(!isAdmin && isMember && myInvites.length > 0) &&
                <div style={{background:'#009DFF', borderRadius:'8px', padding:'3px', padding:'1px 4px',}}>
                  +{myInvites.length}
                </div>
              }
            </button>
            <button className={navMethod === 2 ? styles.active : ""} onClick={() => setNavMethod(2)}>Achievements</button>
          </div>
        </div>
        <div className={styles.parentnav}>

{navMethod === 1 && (
          <div className={styles.cardcont}>
            {isAdmin && (
              <div className={styles.memberSubTabs}>
                <button className={memberTab === 0 ? styles.active : ''} onClick={() => setMemberTab(0)}>
                  Requests ({joinusers.length})
                </button>
                <button className={memberTab === 1 ? styles.active : ''} onClick={() => setMemberTab(1)}>
                  Members ({members.length})
                </button>
              </div>
            )}

            {!isAdmin && isMember && myInvites.length > 0 && (
              <div className={styles.memberSubTabs}>
                <button className={memberTab === 0 ? styles.active : ''} onClick={() => setMemberTab(0)}>
                  My Invites ({myInvites.length})
                </button>
                <button className={memberTab === 1 ? styles.active : ''} onClick={() => setMemberTab(1)}>
                  Members ({members.length})
                </button>
              </div>
            )}

            {isAdmin && memberTab === 0 && joinusers.length > 0 && (
              <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop: '10px'}}>
                {joinusers.filter(m => m.user?.login || m.user?.email).map((member) => (
                  <div key={member.id} className={styles.members} style={{display:'flex', flexDirection:'column'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', width:'100%'}}>
                      <div className={styles.rankBadge}>
                        <img src={member.user.avatarUrl || userimg} alt="avatar" className={styles.rankImg} />
                      </div>
                      <div className={styles.cardInfo}>
                        <p className={styles.userName}>{member.user.login || member.user.email}</p>
                        {member.message && (
                          <p style={{color:'#888', fontSize:'12px', margin:'2px 0 0 0'}}>"{member.message}"</p>
                        )}
                      </div>
                    </div>
                    <div className={styles.btncont} style={{width:'100%'}}>
                      <button className={styles.active} onClick={() => AcceptJoin(member.id)}>Accept</button>
                      <button onClick={() => DenyJoin(member.id)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && memberTab === 1 && (
              <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop: '10px'}}>
                {members.filter(m => m.login || m.email).map((member) => (
                  <div key={member.id} className={styles.members}>
                    <div className={styles.rankBadge}>
                      <img src={member.avatarUrl || userimg} alt="avatar" className={styles.rankImg} />
                    </div>
                    <div className={styles.cardInfo}>
                      <p className={styles.userName}>{member.login || member.email}</p>
                      <p className={styles.userName} style={{ color: member.status === 'ACTIVE' ? '#00F300' : '#c0c0c0' }}>
                        {member.status == 'ACTIVE' ? <span>online</span> : <span>offline</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isAdmin && isMember && memberTab === 1 && (
              <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop: '10px'}}>
                {members.filter(m => m.login || m.email).map((member) => (
                  <div key={member.id} className={styles.members}>
                    <div className={styles.rankBadge}>
                      <img src={member.avatarUrl || userimg} alt="avatar" className={styles.rankImg} />
                    </div>
                    <div className={styles.cardInfo}>
                      <p className={styles.userName}>{member.login || member.email}</p>
                      <p className={styles.userName} style={{ color: member.status === 'ACTIVE' ? '#00F300' : '#c0c0c0' }}>
                        {member.status == 'ACTIVE' ? <span>online</span> : <span>offline</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isAdmin && isMember && myInvites.length > 0 && memberTab === 0 && (
              <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop: '10px'}}>
                {myInvites.map((invite) => (
                  <div key={invite.guildId} className={styles.members} style={{display:'flex', flexDirection:'column'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <div className={styles.rankBadge}>
                        <img src={invite.guildLogo || userimg} alt="avatar" className={styles.rankImg} />
                      </div>
                      <div className={styles.cardInfo}>
                        <p className={styles.userName}>{invite.guildName || 'Guild'}</p>
                        {invite.message && (
                          <p style={{color:'#888', fontSize:'12px', margin:'2px 0 0 0'}}>"{invite.message}"</p>
                        )}
                      </div>
                    </div>
                    <div className={styles.btncont} style={{width:'100%'}}>
                      <button className={styles.active} onClick={() => AcceptInvite(invite.guildId)}>Accept</button>
                      <button onClick={() => RejectInvite(invite.guildId)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isAdmin && !isMember && (
              <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                {members.filter(m => m.login || m.email).map((member) => (
                  <div key={member.id} className={styles.members}>
                    <div className={styles.rankBadge}>
                      <img src={member.avatarUrl || userimg} alt="avatar" className={styles.rankImg} />
                    </div>
                    <div className={styles.cardInfo}>
                      <p className={styles.userName}>{member.login || member.email}</p>
                      <p className={styles.userName} style={{ color: member.status === 'ACTIVE' ? '#00F300' : '#c0c0c0' }}>
                        {member.status == 'ACTIVE' ? <span>online</span> : <span>offline</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {navMethod === 2 && (
          <div className={styles.achivemenets}>
            { achivemenets.length != 0 ?
            <>
            <div className={styles.cardcontfirst}>
              <p className={styles.title} style={{ fontSize: '18px', margin: '0px' }}>Best achievements</p>
              {achivemenets.filter(a => a.featured).map((achive) => (
                <div 
                  key={achive.id} 
                  className={`${styles.members} ${selectedToSwap?.id === achive.id ? styles.selected : ""}`} 
                  onClick={() => handleAchiveClick(achive)}
                  style={{
                    transform: selectedToSwap?.id === achive.id ? 'translateY(-8px)' : 'none',
                    transition: 'transform 0.2s ease',
                    border: selectedToSwap?.id === achive.id ? '1px solid #3abafe' : 'none'
                  }}
                >
                  <div className={styles.rankBadge}><img src={achive.avatar} alt="avatar" className={styles.rankImg} /></div>
                  <div className={styles.cardInfo}>
                    <p className={styles.userName}>{achive.name}</p>
                    <p className={styles.userName} style={{ color: '#b5b3b3' }}>{achive.description}</p>
                  </div>
                </div>
              ))}
              
            </div>

            <div className={styles.cardcont} style={{ marginTop: '20px' }}>
              {achivemenets.filter(a => !a.featured).map((achive) => (
                <div 
                  key={achive.id} 
                  className={`${styles.members} ${selectedToSwap?.id === achive.id ? styles.selected : ""}`} 
                  onClick={() => handleAchiveClick(achive)}
                  style={{
                    transform: selectedToSwap?.id === achive.id ? 'translateY(-8px)' : 'none',
                    transition: 'transform 0.2s ease',
                    border: selectedToSwap?.id === achive.id ? '1px solid #3abafe' : 'none'
                  }}
                >
                  <div className={styles.rankBadge}><img src={achive.avatar} alt="avatar" className={styles.rankImg} /></div>
                  <div className={styles.cardInfo}>
                    <p className={styles.userName}>{achive.name}</p>
                    <p className={styles.userName} style={{ color: '#b5b3b3' }}>{achive.description}</p>
                  </div>
                </div>
              ))}
            </div>
            </>
           : <div className={styles.cardcontfirst}>
           
                 <p className={styles.title} style={{ fontSize: '18px', margin: 'auto' }}>No achievements</p>
            </div>
            }

          </div>
        )}
        {navMethod === 0 && (
          <div className={styles.cardcont}>
            <p className={styles.subtitle} style={{color:'#cecece', fontSize:'14px',}}>Guild Acts: <span style={{color:'white', fontWeight:'bolder',}}>{actscount}/160</span></p>
            {acts.map((act, index) => (
              <ActCard key={index} act={act} titleact={false}/>
            ))}
          </div>
        )}

        </div>

      </div>
    </div>
  );
}
