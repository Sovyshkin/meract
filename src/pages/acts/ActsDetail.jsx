import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";

import api from "../../shared/api/api";
import { useAuthStore } from "../../shared/stores/authStore";
import styles from "./ActsDetail.module.css";

import arrowLeft from '../../images/arrow-left.png';
import iconguild from '../../images/BG.png'; 
import userimg from '../../images/user.png';
import sound from '../../images/Sound.png';
import star from '../../images/star.png';
import share from'../../images/sharewhite.png';
import { actApi } from "../../shared/api/act";
import { pollApi } from "../../shared/api/pollApi";
import { profileApi } from "../../shared/api/profile";
import { useSoundStore } from "../../shared/stores/soundStore";
import { toast } from "react-toastify";

function buildRoleInfo(roleType, actTeams, apiData, fallbackImg) {
  let method = null;
  const presetList = [];

  for (const team of actTeams) {
    for (const rc of (team.roleConfigs || [])) {
      if (rc.role !== roleType) continue;
      if (rc.openVoting) {
        method = 'open_voting';
      } else if (!method && rc.candidates?.length === 1) {
        method = 'fixed';
        const c = rc.candidates[0];
        const uid = c.user?.id ?? c.id;
        presetList.push({ id: uid, teamCandidateId: c.id, name: c.user?.login || c.user?.email || `User #${uid}`, avatar: c.user?.avatarUrl || fallbackImg });
      } else if (!method && (rc.candidates?.length ?? 0) > 1) {
        method = 'voting_candidates';
        rc.candidates.forEach(c => {
          const uid = c.user?.id ?? c.id;
          presetList.push({
            id: uid,
            teamCandidateId: c.id,
            name: c.user?.login || c.user?.email || `User #${uid}`,
            avatar: c.user?.avatarUrl || fallbackImg,
            percent: '0',
          });
        });
      }
    }
  }

  const apiObj = (apiData && typeof apiData === 'object' && !Array.isArray(apiData)) ? apiData : {};
  const teamCandidatesApi = apiObj.teamCandidates || [];
  if (method === 'voting_candidates' && teamCandidatesApi.length > 0) {
    const totalVotes = teamCandidatesApi.reduce((s, c) => s + (c._count?.votes || 0), 0);
    presetList.forEach(pc => {
      const match = teamCandidatesApi.find(tc => (tc.user?.id ?? tc.userId) === pc.id);
      if (match) {
        pc.teamCandidateId = match.id;
        // обновляем имя из API — там есть email как fallback
        pc.name = match.user?.login || match.user?.email || pc.name;
        if (totalVotes > 0) pc.percent = (((match._count?.votes || 0) / totalVotes) * 100).toFixed(0);
      }
    });
  }

  const roleCands = apiObj.roleCandidates || [];
  const totalRoleVotes = roleCands.reduce((s, c) => s + (c._count?.votes || 0), 0);
  const openList = roleCands.map((item, idx) => {
    const uid = item.user?.id ?? `v${idx}`;
    return {
    id: uid,
    roleCandidateId: item.id,
    name: item.user?.login || item.user?.email || `User #${uid}`,
    avatar: item.user?.avatarUrl || fallbackImg,
    percent: totalRoleVotes > 0 ? ((item._count?.votes || 0) / totalRoleVotes * 100).toFixed(0) : '0',
  };
  });

  return {
    method: method || 'voting_candidates',
    candidates: method === 'open_voting' ? openList : presetList,
  };
}

export default function ActDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = true; // Временно для тестирования
  
  const { soundStates, toggleSound } = useSoundStore();
  const isEnabled = !!soundStates[id];
  
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actOwnerId, setActOwnerId] = useState(null);
  const [startingAct, setStartingAct] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [navMethod, setNavMethod] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Состояния для данных с сервера — динамически по ролям
  const [roleCandidates, setRoleCandidates] = useState({}); // { navigator: [], hero: [], spot_agent: [] }
  const [selectedRoles, setSelectedRoles] = useState({});   // { navigator: null, hero: null, ... }
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [votedRoles, setVotedRoles] = useState({});
  const [appliedRoles, setAppliedRoles] = useState({});

  // Голосования
  const [polls, setPolls] = useState([]);
  const [userVotes, setUserVotes] = useState({});

  const [isLive, setIsLive] = useState('');
  const [title, setTitle] = useState('Loading');
  const [description, setDescription] = useState('loading');
  const [seasons, setSeasons] = useState('');
  const [sequel, setSequel] = useState(null);
  const [scheduledAt, setScheduledAt] = useState(null);
  const [date, setDate] = useState('');
  const [rating, setRating] = useState(0);
  const [genre, setGenre] = useState([]);
  const [time, setTime] = useState('0 min');
  const [sequelData, setSequelData] = useState(null);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const [actChapterId, setActChapterId] = useState(null);
  const [actTeams, setActTeams] = useState([]);

  // Загрузка деталей акта
  useEffect(() => {
    const fetchActDetails = async () => {
      try {
        const data = await actApi.getAct(id);
        console.log("Act data:", data);

        if (data) {
          setIsLive(data.status);
          setTitle(data.title || 'Untitled');
          setDescription(data.description || 'No description available');
          
          if (data.startedAt) {
            setDate(new Date(data.startedAt).getFullYear().toString());
          }

          if (data.tags && data.tags.length > 0) {
            setGenre(data.tags.map(t => (typeof t === 'string' ? t : t.name || String(t))));
          }

          if (data.startedAt && data.endedAt) {
            const diffMs = new Date(data.endedAt) - new Date(data.startedAt);
            const totalSec = Math.round(diffMs / 1000);
            if (totalSec < 60) {
              setTime(`${totalSec} sec`);
            } else {
              const mins = Math.floor(totalSec / 60);
              const secs = totalSec % 60;
              setTime(secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`);
            }
          }
          
          setRating(data.likes || 0);
          if (data.userId) setActOwnerId(data.userId);
          if (data.sequel) setSequel(data.sequel);
          if (data.chapterId) setActChapterId(data.chapterId);
          if (data.scheduledAt) setScheduledAt(data.scheduledAt);
          if (data.sequel?._count?.chapters) setSeasons(data.sequel._count.chapters);
          if (data.teams) setActTeams(data.teams);
        }
      } catch (error) {
        console.error("Ошибка загрузки акта:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchActDetails();
  }, [id]);

  // Загрузка сиквела с главами и эпизодами
  useEffect(() => {
    if (!sequel?.id) return;
    api.get(`/sequel/${sequel.id}`)
      .then(r => {
        setSequelData(r.data);
        if (actChapterId) {
          const idx = (r.data.chapters || []).findIndex(ch => ch.id === actChapterId);
          if (idx !== -1) setSelectedSeasonIdx(idx);
        }
      })
      .catch(() => {});
  }, [sequel?.id, actChapterId]);

  // Загрузка ролей динамически по всем roleConfigs в actTeams
  useEffect(() => {
    const fetchRoles = async () => {
      if (!id || actTeams.length === 0) return;
      setLoadingRoles(true);
      try {
        const uniqueRoles = [...new Set(
          actTeams.flatMap(t => (t.roleConfigs || []).map(rc => rc.role))
        )];

        const results = await Promise.all(
          uniqueRoles.map(async (role) => {
            const apiData = await actApi.getRole(id, role)
              .catch(() => ({ teamCandidates: [], roleCandidates: [] }));
            return { role, roleInfo: buildRoleInfo(role, actTeams, apiData, userimg) };
          })
        );

        const map = {};
        results.forEach(({ role, roleInfo }) => { map[role] = roleInfo; });

        // Обогащаем кандидатов без логина через /user/get-user/:id
        const needFetch = [];
        Object.values(map).forEach(ri => {
          ri.candidates.forEach(c => {
            if (c.id && typeof c.id === 'number' && (!c.name || c.name.startsWith('User #'))) {
              needFetch.push({ userId: c.id });
            }
          });
        });
        if (needFetch.length > 0) {
          const uniqueUserIds = [...new Set(needFetch.map(x => x.userId))];
          const userDataMap = {};
          await Promise.all(uniqueUserIds.map(async (uid) => {
            try {
              const u = await profileApi.getUserById(uid);
              userDataMap[uid] = u.login || u.email || null;
            } catch { /* ignore */ }
          }));
          Object.values(map).forEach(ri => {
            ri.candidates.forEach(c => {
              if (userDataMap[c.id]) c.name = userDataMap[c.id];
            });
          });
        }

        setRoleCandidates(map);
      } catch (error) {
        console.error('❌ Ошибка загрузки ролей:', error);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, [id, actTeams]);

  // Загрузка голосований
  useEffect(() => {
    if (!id) return;
    const fetchPolls = async () => {
      try {
        const data = await pollApi.getActivePolls(id);
        setPolls(Array.isArray(data) ? data : []);
      } catch {
        setPolls([]);
      }
    };
    fetchPolls();
    const interval = setInterval(fetchPolls, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const handleVote = async (pollId, optionId) => {
    if (userVotes[pollId] !== undefined) return;
    try {
      await pollApi.vote(pollId, optionId);
      setUserVotes(prev => ({ ...prev, [pollId]: optionId }));
      const data = await pollApi.getActivePolls(id);
      setPolls(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to vote");
    }
  };

  const handleRoleClick = (role, candidate) => {
    if (!isAdmin) return;
    setSelectedRoles(prev => ({
      ...prev,
      [role]: prev[role]?.id === candidate.id ? null : candidate,
    }));
  };

  const refetchRole = async (role) => {
    try {
      const apiData = await actApi.getRole(id, role)
        .catch(() => ({ teamCandidates: [], roleCandidates: [] }));
      const roleInfo = buildRoleInfo(role, actTeams, apiData, userimg);
      setRoleCandidates(prev => ({ ...prev, [role]: roleInfo }));
    } catch (e) {
      console.error('refetchRole error:', e);
    }
  };

  const handleVoteTeamCandidate = async (role, teamCandidateId) => {
    if (votedRoles[role] || !teamCandidateId) return;
    try {
      await actApi.voteTeamCandidate(id, teamCandidateId);
      setVotedRoles(prev => ({ ...prev, [role]: true }));
      await refetchRole(role);
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('already voted')) toast.warning('You have already voted for this role');
      else toast.error('Failed to vote');
    }
  };

  const handleVoteOpenCandidate = async (role, roleCandidateId) => {
    if (votedRoles[role] || !roleCandidateId) return;
    try {
      await actApi.voteOpenCandidate(id, roleCandidateId);
      setVotedRoles(prev => ({ ...prev, [role]: true }));
      await refetchRole(role);
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('already voted')) toast.warning('You have already voted for this role');
      else toast.error('Failed to vote');
    }
  };

  const handleApplyForRole = async (role) => {
    if (appliedRoles[role]) return;
    try {
      await actApi.applyForRole(id, role);
      setAppliedRoles(prev => ({ ...prev, [role]: true }));
      toast.success('Application submitted!');
      await refetchRole(role);
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('not open')) toast.error('This role is not open for applications');
      else toast.error('Failed to apply for role');
    }
  };

  const isOwner = user && actOwnerId && user.id === actOwnerId;

  const handleStart = async () => {
    if (isLive === 'ONLINE') {
      navigate(`/stream/${id}`, { state: { act: { id, title, description } } });
      return;
    }
    setStartingAct(true);
    try {
      await actApi.startAct(id);
      setIsLive('ONLINE');
      navigate(`/stream/${id}`, { state: { act: { id, title, description } } });
    } catch {
      toast.error('Failed to start act');
    } finally {
      setStartingAct(false);
    }
  };

  const join = () => {
    navigate(`/stream/${id}`, { state: { act: { id, title, description } } });
  };

  const bannerUrl = iconguild;
  const topBannerStyle = {
    backgroundImage: `url(${bannerUrl})`,
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
const copyShareLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl)
      .then(() => {
        toast.success("Link copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
  };
  if (loading) {
    return (
      <div className={styles.container}>
        <div style={topBannerStyle} />
        <div className={styles.contentWrapper}>
          <div className={styles.header}>
            <div className={styles.backButton} onClick={() => navigate("/acts")}>
              <img src={arrowLeft} alt="Back" className={styles.backIcon} />
            </div>
          </div>
          <div className={styles.loading}>loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={topBannerStyle} />

      <div className={styles.contentWrapper}>
        <div className={styles.header}>
          <div className={styles.backButton} onClick={() => navigate("/acts")}>
            <img src={arrowLeft} alt="Back" className={styles.backIcon} />
          </div>

          <div className={styles.menuContainer}>
            <img 
              src={sound} 
              alt="Sound" 
              className={`${styles.menuIcon} ${isEnabled ? styles.activeIcon : ""}`} 
              onClick={() => toggleSound(id)} 
            />
            <img src={share} alt="Share" className={styles.menuIcon} onClick={copyShareLink}/>
          </div>
        </div>

        <div className={`${styles.card} ${styles.firstcard}`} style={{ marginTop: '100px' }}>
          <div className={styles.infoblock} style={{ width: '100%' }}>
            <div className={styles.inner}>
              {isLive === 'ONLINE' && (
                <div className={styles.online}> 
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
                    <circle cx="10" cy="10" r="5" fill="white" />
                  </svg>
                  <p className={styles.live}>Live</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '5px', alignItems: 'baseline' }}>
                <h1 className={styles.title}>{title}</h1>
              </div>
              <p className={styles.desc}>{description}</p>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <img src={star} alt="" style={{ width: '20px', height: '20px' }} />
                  <p style={{ color: '#00F300' }}>{rating}</p>
                </div>
                <p className={styles.desc} style={{ color: '#c0c0c0' }}>{date}</p>
                {seasons && seasons == 1 
                  ? <p className={styles.desc} style={{ color: '#c0c0c0' }}>1 Season</p>
                  : <p className={styles.desc} style={{ color: '#c0c0c0' }}>{seasons || 0} Seasons</p>
                }
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', padding: '2px 0' }}>
                {genre.map((item, index) => (
                  <span key={index} style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#ccc',
                    fontSize: '12px',
                    fontFamily: 'Oxanium, sans-serif',
                  }}>{item}</span>
                ))}
              </div>
            </div>
            <div className={styles.savecard}>
              {isLive === 'PLANNED' && scheduledAt && (
                <p style={{ color: '#FFA500', fontSize: '13px', margin: '0 0 6px 0' }}>
                  Scheduled: {new Date(scheduledAt).toLocaleString()}
                </p>
              )}
              <div style={{ display: 'flex', gap: '5px' }}>
                {time[0] != '0' ? (
                  <>
                    <h3>Duration:</h3>
                    <p style={{ color: '#c0c0c0' }}>{time}</p>
                  </>
                ) : (
                  <h3>Live</h3>
                )}
              </div>
              <div className={styles.savebutton} style={{ marginTop: '0px' }}>
                {isOwner && isLive !== 'ONLINE' ? (
                  <button
                    className={styles.active}
                    onClick={handleStart}
                    disabled={startingAct}
                    style={startingAct ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                  >
                    {startingAct ? 'Starting...' : 'Start Act'}
                  </button>
                ) : (
                  <button
                    className={styles.active}
                    onClick={join}
                    disabled={isLive !== 'ONLINE'}
                    style={isLive !== 'ONLINE' ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                  >
                    {isLive === 'PLANNED' ? 'Scheduled' : isLive === 'OFFLINE' ? 'Ended' : 'Watch'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kinopoisk-стиль: сезоны и эпизоды */}
        {sequelData && sequelData.chapters?.length > 0 && actChapterId && (
          <div style={{ padding: '0 16px 24px' }}>
            {/* Табы сезонов */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0 12px', scrollbarWidth: 'none' }}>
              {sequelData.chapters.map((ch, idx) => (
                <div key={ch.id}
                  onClick={() => setSelectedSeasonIdx(idx)}
                  style={{
                    padding: '7px 18px', borderRadius: '20px', cursor: 'pointer',
                    background: selectedSeasonIdx === idx ? '#009DFF' : 'rgba(255,255,255,0.07)',
                    color: selectedSeasonIdx === idx ? 'white' : '#888',
                    fontSize: '13px', fontFamily: 'Oxanium, sans-serif',
                    fontWeight: selectedSeasonIdx === idx ? 600 : 400,
                    whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >Season {idx + 1}</div>
              ))}
            </div>

            {/* Список эпизодов */}
            {(() => {
              const eps = sequelData.chapters[selectedSeasonIdx]?.acts || [];
              if (eps.length === 0) return (
                <p style={{ color: '#555', fontSize: '13px', fontFamily: 'Oxanium, sans-serif' }}>No episodes yet</p>
              );
              return eps.map((ep, epIdx) => {
                const isCurrent = ep.id === Number(id);
                const statusColor = ep.status === 'ONLINE' ? '#00F300' : ep.status === 'PLANNED' ? '#FFA500' : '#555';
                const statusLabel = ep.status === 'ONLINE' ? 'Live' : ep.status === 'PLANNED' ? 'Scheduled' : 'Ended';
                const thumb = ep.previewFileName
                  ? `${import.meta.env.VITE_API_URL}/uploads/${ep.previewFileName}`
                  : null;
                return (
                  <div key={ep.id}
                    onClick={() => !isCurrent && navigate(`/acts/${ep.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px', borderRadius: '14px', marginBottom: '8px',
                      background: isCurrent ? 'rgba(0,157,255,0.1)' : 'rgba(255,255,255,0.03)',
                      border: isCurrent ? '1px solid rgba(0,157,255,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      cursor: isCurrent ? 'default' : 'pointer',
                    }}
                  >
                    {/* Номер эпизода */}
                    <span style={{ color: '#444', fontSize: '13px', fontFamily: 'Oxanium, sans-serif', minWidth: '28px', flexShrink: 0 }}>
                      E{epIdx + 1}
                    </span>
                    {/* Миниатюра */}
                    {thumb ? (
                      <img src={thumb} alt="" style={{ width: '52px', height: '34px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '52px', height: '34px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                    )}
                    {/* Заголовок */}
                    <span style={{
                      color: isCurrent ? '#009DFF' : 'white',
                      fontSize: '14px', fontFamily: 'Oxanium, sans-serif',
                      fontWeight: isCurrent ? 600 : 400,
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>{ep.title}</span>
                    {/* Статус */}
                    <span style={{
                      padding: '3px 8px', borderRadius: '8px', fontSize: '11px',
                      background: `${statusColor}18`,
                      color: statusColor,
                      fontFamily: 'Oxanium, sans-serif', flexShrink: 0,
                    }}>{statusLabel}</span>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Секции ролей — fixed / voting_candidates / open_voting */}
        {(() => {
          const ROLE_LABELS = {
            navigator:  { title: 'Select the act navigator', subtitle: 'We need to decide who will be the navigator in the act.' },
            hero:       { title: 'Select an Act Hero',        subtitle: 'We need to decide who will be the hero in the act.' },
            spot_agent: { title: 'Select a Spot Agent',       subtitle: 'We need to decide who will be the spot agent in the act.' },
          };
          const uniqueRoles = [...new Set(
            actTeams.flatMap(t => (t.roleConfigs || []).map(rc => rc.role))
          )];
          return uniqueRoles.map(role => {
            const roleInfo = roleCandidates[role] || { method: null, candidates: [] };
            const { method, candidates } = roleInfo;
            const label = ROLE_LABELS[role] || { title: `Select ${role}`, subtitle: '' };
            const selected = selectedRoles[role] || null;
            const maxPct = candidates.length > 0 ? Math.max(...candidates.map(c => parseFloat(c.percent) || 0)) : 0;

            // Fixed: one pre-assigned person, no voting
            if (method === 'fixed') {
              const person = candidates[0];
              return (
                <div key={role} className={styles.parentnav}>
                  <div className={styles.navigators}>
                    <div className={styles.cardcontfirst}>
                      <p className={styles.title} style={{ fontSize: '18px', margin: '0px' }}>{label.title}</p>
                      <p className={styles.subtitle} style={{ fontSize: '14px', margin: '0px', color: 'rgb(181, 179, 179)' }}>{label.subtitle}</p>
                      {person ? (
                        <div className={styles.members} style={{ border: '1px solid #00c853', marginTop: '10px', cursor: 'default' }}>
                          <div className={styles.rankBadge}><img src={person.avatar} alt="avatar" className={styles.rankImg} /></div>
                          <div className={styles.cardInfo}><p className={styles.userName}>{person.name}</p></div>
                          <span style={{ marginLeft: 'auto', color: '#00c853', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>✔ Confirmed</span>
                        </div>
                      ) : (
                        <p style={{ color: '#555', fontSize: '13px', marginTop: '8px' }}>Not assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Voting (creator's candidates) or open voting
            const isOpenVoting = method === 'open_voting';
            const hasVotedThisRole = !!votedRoles[role];
            return (
              <div key={role} className={styles.parentnav}>
                <div className={styles.navigators}>
                  <div className={styles.cardcontfirst}>
                    <p className={styles.title} style={{ fontSize: '18px', margin: '0px' }}>
                      {label.title}
                      {loadingRoles && <span style={{ marginLeft: '10px', fontSize: '14px', color: '#888' }}>Loading...</span>}
                    </p>
                    <p className={styles.subtitle} style={{ fontSize: '14px', margin: '0px', color: 'rgb(181, 179, 179)' }}>
                      {isOpenVoting
                        ? 'Open voting — anyone can apply, viewers choose the winner.'
                        : label.subtitle}
                    </p>

                    {/* Apply button for open_voting */}
                    {isOpenVoting && !isOwner && (
                      <div
                        role="button"
                        onClick={() => !appliedRoles[role] && handleApplyForRole(role)}
                        style={{
                          marginTop: '12px', marginBottom: '4px',
                          padding: '10px 18px',
                          background: appliedRoles[role] ? 'rgba(255,255,255,0.06)' : '#FF3B57',
                          color: appliedRoles[role] ? '#888' : '#fff',
                          borderRadius: '8px', fontSize: '14px',
                          textAlign: 'center',
                          cursor: appliedRoles[role] ? 'default' : 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        {appliedRoles[role] ? '✓ Application sent' : 'Apply for role'}
                      </div>
                    )}

                    {candidates.length === 0 ? (
                      <p style={{ color: '#555', fontSize: '13px', marginTop: '8px' }}>
                        {isOpenVoting ? 'No applicants yet' : 'No candidates'}
                      </p>
                    ) : candidates.map((candidate) => {
                      const isMax = parseFloat(candidate.percent) === maxPct && maxPct > 0;
                      const isSelected = selected?.id === candidate.id;
                      return (
                        <div
                          key={candidate.id}
                          className={`${styles.members} ${isSelected ? styles.selected : ''}`}
                          onClick={() => handleRoleClick(role, candidate)}
                          style={{
                            transform: isSelected ? 'translateY(-8px)' : 'none',
                            transition: 'transform 0.2s ease',
                            border: isSelected ? '1px solid #009DFF' : 'none',
                            cursor: isAdmin ? 'pointer' : 'default',
                          }}
                        >
                          <div className={styles.rankBadge}>
                            <img src={candidate.avatar} alt="avatar" className={styles.rankImg} />
                          </div>
                          <div className={styles.cardInfo}>
                            <p className={styles.userName}>{candidate.name}</p>
                          </div>
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {maxPct > 0 && (
                              <p style={{ fontWeight: 'bold', color: isMax ? '#009DFF' : '#FFFFFFB2', margin: 0 }}>
                                {candidate.percent}%
                              </p>
                            )}
                            {!isOwner && (
                              <div
                                role="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isOpenVoting) handleVoteOpenCandidate(role, candidate.roleCandidateId);
                                  else handleVoteTeamCandidate(role, candidate.teamCandidateId);
                                }}
                                style={{
                                  padding: '5px 12px',
                                  background: hasVotedThisRole ? 'rgba(255,255,255,0.05)' : 'rgba(0,157,255,0.15)',
                                  color: hasVotedThisRole ? '#555' : '#009DFF',
                                  borderRadius: '6px', fontSize: '12px',
                                  cursor: hasVotedThisRole ? 'default' : 'pointer',
                                  border: '1px solid rgba(0,157,255,0.2)',
                                  userSelect: 'none',
                                }}
                              >
                                {hasVotedThisRole ? 'Voted' : 'Vote'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          });
        })()}

        {/* Секция голосований */}
        {polls.length > 0 && (
          <div className={styles.parentnav}>
            <div className={styles.navigators}>
              <div className={styles.cardcontfirst}>
                <p className={styles.title} style={{ fontSize: '18px', margin: '0px' }}>Polls</p>
                <p className={styles.subtitle} style={{ fontSize: '14px', margin: '0px', color: 'rgb(181, 179, 179)' }}>
                  Active vote(s) for this act
                </p>
                {polls.map((poll) => {
                  const voted = userVotes[poll.id] !== undefined;
                  return (
                    <div key={poll.id} style={{ marginTop: '12px', background: '#1a1a1a', borderRadius: '12px', padding: '14px' }}>
                      <p style={{ color: 'white', fontWeight: 'bold', marginBottom: '8px' }}>{poll.title}</p>
                      {poll.options.map((opt) => {
                        const isChosen = userVotes[poll.id] === opt.id;
                        const isLeading = voted && opt.percent === Math.max(...poll.options.map(o => o.percent));
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleVote(poll.id, opt.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              marginBottom: '8px',
                              cursor: voted ? 'default' : 'pointer',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: isChosen ? '1px solid #009DFF' : '1px solid #333',
                              background: '#111',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            {/* прогресс-бар */}
                            {voted && (
                              <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${opt.percent}%`,
                                background: isLeading ? 'rgba(0,157,255,0.15)' : 'rgba(255,255,255,0.05)',
                                transition: 'width 0.4s ease',
                                borderRadius: '8px',
                              }} />
                            )}
                            <span style={{ position: 'relative', color: isChosen ? '#009DFF' : 'white', flex: 1, zIndex: 1 }}>{opt.text}</span>
                            {voted && (
                              <span style={{ position: 'relative', color: isLeading ? '#009DFF' : '#b5b3b3', fontWeight: 'bold', zIndex: 1 }}>
                                {opt.percent}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {poll.endsAt && (
                        <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                          Ends: {new Date(poll.endsAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}