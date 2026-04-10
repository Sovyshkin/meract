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

function buildRoleInfo(roleType, actTeams, apiData, fallbackImg, currentUserId) {
  let method = null;
  const presetList = [];
  let votingDeadline = null;
  let votingStartAt = null;

  for (const team of actTeams) {
    for (const rc of (team.roleConfigs || [])) {
      if (rc.role !== roleType) continue;
      // Дедлайн из roleConfig (есть в ответе getActById)
      if (rc.votingStartAt && !votingStartAt) {
        votingStartAt = new Date(rc.votingStartAt);
        if (rc.votingDurationHours) {
          votingDeadline = new Date(votingStartAt.getTime() + rc.votingDurationHours * 3600 * 1000);
        }
      }
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
    // Дедлайн также доступен через config первого teamCandidate
    if (!votingDeadline && teamCandidatesApi[0]?.config?.votingStartAt) {
      const tStart = new Date(teamCandidatesApi[0].config.votingStartAt);
      const tHours = teamCandidatesApi[0].config.votingDurationHours;
      if (!votingStartAt) votingStartAt = tStart;
      if (tHours) votingDeadline = new Date(tStart.getTime() + tHours * 3600 * 1000);
    }
  }

  const roleCands = apiObj.roleCandidates || [];
  const totalRoleVotes = roleCands.reduce((s, c) => s + (c._count?.votes || 0), 0);

  // Определяем, за кого голосовал текущий пользователь
  let myVotedCandidateId = null;
  let myVotedCandidateName = null;
  if (currentUserId) {
    // Для open_voting: votes[] есть в roleCandidates (roleCandidateId)
    for (const cand of roleCands) {
      if (cand.votes?.some(v => v.voterId === currentUserId)) {
        myVotedCandidateId = cand.id;
        myVotedCandidateName = cand.user?.login || cand.user?.email || null;
        break;
      }
    }

    // Для voting_candidates: votes[] теперь есть в teamCandidates (teamCandidateId)
    if (!myVotedCandidateId && method === 'voting_candidates') {
      for (const tc of teamCandidatesApi) {
        if (tc.votes?.some(v => v.voterId === currentUserId)) {
          myVotedCandidateId = tc.id; // teamCandidateId
          // Имя из presetList (уже обогащено) или напрямую из API
          const matched = presetList.find(p => p.teamCandidateId === tc.id);
          myVotedCandidateName = matched?.name || tc.user?.login || tc.user?.email || null;
          break;
        }
      }
    }
  }

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
    votingDeadline,
    votingStartAt,
    myVotedCandidateId,
    myVotedCandidateName,
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

        const currentUserId = user?.id || user?.sub;

        const results = await Promise.all(
          uniqueRoles.map(async (role) => {
            const apiData = await actApi.getRole(id, role)
              .catch(() => ({ teamCandidates: [], roleCandidates: [] }));
            return { role, roleInfo: buildRoleInfo(role, actTeams, apiData, userimg, currentUserId) };
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

        // Если для open_voting уже голосовали — восстанавливаем из данных API
        const autoVoted = {};
        Object.entries(map).forEach(([role, ri]) => {
          if (ri.myVotedCandidateId && ri.myVotedCandidateName) {
            autoVoted[role] = { candidateName: ri.myVotedCandidateName };
          }
        });
        if (Object.keys(autoVoted).length > 0) {
          setVotedRoles(prev => ({ ...prev, ...autoVoted }));
        }
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
    if (isOwner || votedRoles[role]) return;
    setSelectedRoles(prev => ({
      ...prev,
      [role]: prev[role]?.id === candidate.id ? null : candidate,
    }));
  };

  const handleVoteSelected = async (role, method) => {
    const selected = selectedRoles[role];
    if (!selected || votedRoles[role]) return;
    if (method === 'open_voting') {
      await handleVoteOpenCandidate(role, selected.roleCandidateId, selected.name);
    } else {
      await handleVoteTeamCandidate(role, selected.teamCandidateId, selected.name);
    }
  };

  const refetchRole = async (role) => {
    try {
      const currentUserId = user?.id || user?.sub;
      const apiData = await actApi.getRole(id, role)
        .catch(() => ({ teamCandidates: [], roleCandidates: [] }));
      const roleInfo = buildRoleInfo(role, actTeams, apiData, userimg, currentUserId);
      setRoleCandidates(prev => ({ ...prev, [role]: roleInfo }));
    } catch (e) {
      console.error('refetchRole error:', e);
    }
  };

  const handleVoteTeamCandidate = async (role, teamCandidateId, candidateName) => {
    if (votedRoles[role] || !teamCandidateId) return;
    try {
      await actApi.voteTeamCandidate(id, teamCandidateId);
      setVotedRoles(prev => ({ ...prev, [role]: { candidateName } }));
      await refetchRole(role);
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (msg.includes('already voted')) toast.warning('You have already voted for this role');
      else toast.error('Failed to vote');
    }
  };

  const handleVoteOpenCandidate = async (role, roleCandidateId, candidateName) => {
    if (votedRoles[role] || !roleCandidateId) return;
    try {
      await actApi.voteOpenCandidate(id, roleCandidateId);
      setVotedRoles(prev => ({ ...prev, [role]: { candidateName } }));
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

  // Герой акта может его запустить (бэкенд также должен разрешить — см. FRONTEND_FEATURE_BACKEND_REQUIREMENTS.md)
  const currentUserId = user?.id || user?.sub;
  const isHero = actTeams.some(team =>
    (team.roleConfigs || []).some(rc =>
      rc.role === 'hero' &&
      (rc.candidates || []).some(c => (c.user?.id ?? c.userId) === currentUserId)
    )
  );
  const canStartAct = (isOwner || isHero) && isLive !== 'ONLINE';

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
                {canStartAct ? (
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
            navigator:  { title: 'Navigator voting', subtitle: 'Choose who will be the navigator for this act.' },
            hero:       { title: 'Hero voting',      subtitle: 'Choose who will be the hero for this act.' },
            spot_agent: { title: 'Spot agent voting', subtitle: 'Choose who will be the spot agent for this act.' },
          };

          const formatDeadline = (date) => date.toLocaleString('en-GB', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          });

          const getVotingStatus = (votingStartAt, votingDeadline) => {
            if (!votingStartAt && !votingDeadline) return null;
            const now = Date.now();
            if (votingDeadline && now > votingDeadline.getTime()) return 'closed';
            if (votingStartAt && now < votingStartAt.getTime()) return 'not_started';
            return 'open';
          };

          const uniqueRoles = [...new Set(
            actTeams.flatMap(t => (t.roleConfigs || []).map(rc => rc.role))
          )];
          return uniqueRoles.map(role => {
            const roleInfo = roleCandidates[role] || { method: null, candidates: [] };
            const { method, candidates, votingDeadline, votingStartAt } = roleInfo;
            const label = ROLE_LABELS[role] || { title: `Vote: ${role}`, subtitle: '' };
            const maxPct = candidates.length > 0 ? Math.max(...candidates.map(c => parseFloat(c.percent) || 0)) : 0;
            const votingStatus = getVotingStatus(votingStartAt, votingDeadline);
            const votedInfo = votedRoles[role]; // { candidateName } | undefined

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
            const selectedCandidate = selectedRoles[role] || null;
            // Голосование заблокировано если статус != open или нет статуса но дедлайн прошёл
            const votingBlocked = votingStatus === 'closed' || votingStatus === 'not_started';
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
                        ? 'Open voting — anyone can apply, the audience chooses the winner.'
                        : label.subtitle}
                    </p>

                    {/* Дедлайн голосования */}
                    {(votingStatus || votingDeadline) && (
                      <div style={{
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: votingStatus === 'closed'
                          ? 'rgba(239,68,68,0.1)'
                          : votingStatus === 'not_started'
                            ? 'rgba(251,191,36,0.1)'
                            : 'rgba(34,197,94,0.1)',
                        border: votingStatus === 'closed'
                          ? '1px solid rgba(239,68,68,0.3)'
                          : votingStatus === 'not_started'
                            ? '1px solid rgba(251,191,36,0.3)'
                            : '1px solid rgba(34,197,94,0.3)',
                        color: votingStatus === 'closed'
                          ? '#ef4444'
                          : votingStatus === 'not_started'
                            ? '#fbbf24'
                            : '#22c55e',
                      }}>
                        <span style={{ fontSize: '16px' }}>
                          {votingStatus === 'closed' ? '🔒' : votingStatus === 'not_started' ? '⏳' : '🗳️'}
                        </span>
                        <span>
                          {votingStatus === 'closed' && `Voting ended · ${votingDeadline ? formatDeadline(votingDeadline) : ''}`}
                          {votingStatus === 'not_started' && `Voting starts ${votingStartAt ? formatDeadline(votingStartAt) : ''}`}
                          {votingStatus === 'open' && votingDeadline && `Voting open until ${formatDeadline(votingDeadline)}`}
                        </span>
                      </div>
                    )}

                    {/* Показываем за кого проголосовал */}
                    {!isOwner && hasVotedThisRole && votedInfo?.candidateName && (
                      <div style={{
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        background: 'rgba(0,157,255,0.08)',
                        border: '1px solid rgba(0,157,255,0.25)',
                        color: '#009DFF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        ✓ Your vote: <strong>{votedInfo.candidateName}</strong>
                      </div>
                    )}

                    {/* Apply button for open_voting */}
                    {isOpenVoting && !isOwner && !votingBlocked && (
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
                        {isOpenVoting ? 'No applications yet' : 'No candidates'}
                      </p>
                    ) : (
                      <>
                        {!isOwner && !hasVotedThisRole && !votingBlocked && (
                          <p style={{ color: '#888', fontSize: '12px', marginTop: '10px', marginBottom: '2px' }}>
                            Select a participant to vote
                          </p>
                        )}
                        {candidates.map((candidate) => {
                          const isMax = parseFloat(candidate.percent) === maxPct && maxPct > 0;
                          const isSelected = selectedCandidate?.id === candidate.id;
                          const isMyVote = hasVotedThisRole && votedInfo?.candidateName === candidate.name;
                          const canSelect = !isOwner && !hasVotedThisRole && !votingBlocked;
                          return (
                            <div
                              key={candidate.id}
                              className={`${styles.members} ${isSelected ? styles.selected : ''}`}
                              onClick={() => canSelect && handleRoleClick(role, candidate)}
                              style={{
                                transform: isSelected ? 'translateY(-4px)' : 'none',
                                transition: 'transform 0.2s ease, border 0.2s ease, background 0.2s ease',
                                border: isMyVote
                                  ? '1.5px solid #009DFF'
                                  : isSelected
                                    ? '1.5px solid #009DFF'
                                    : '1px solid rgba(255,255,255,0.07)',
                                cursor: canSelect ? 'pointer' : 'default',
                                background: isMyVote
                                  ? 'rgba(0,157,255,0.06)'
                                  : isSelected
                                    ? 'rgba(0,157,255,0.08)'
                                    : undefined,
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
                                {isMyVote && (
                                  <span style={{ color: '#009DFF', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>✓ My vote</span>
                                )}
                                {isSelected && !hasVotedThisRole && (
                                  <span style={{ color: '#009DFF', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>✓ Selected</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Кнопка голосования */}
                        {!isOwner && !votingBlocked && (
                          <div
                            role="button"
                            onClick={() => !hasVotedThisRole && selectedCandidate && handleVoteSelected(role, method)}
                            style={{
                              marginTop: '14px',
                              padding: '13px',
                              background: hasVotedThisRole
                                ? 'rgba(255,255,255,0.04)'
                                : selectedCandidate
                                  ? 'rgba(0,157,255,0.18)'
                                  : 'rgba(255,255,255,0.04)',
                              color: hasVotedThisRole ? '#555' : selectedCandidate ? '#009DFF' : '#444',
                              borderRadius: '10px',
                              fontSize: '15px',
                              fontWeight: '600',
                              textAlign: 'center',
                              cursor: hasVotedThisRole || !selectedCandidate ? 'default' : 'pointer',
                              border: selectedCandidate && !hasVotedThisRole
                                ? '1px solid rgba(0,157,255,0.4)'
                                : '1px solid rgba(255,255,255,0.07)',
                              userSelect: 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {hasVotedThisRole ? '✓ Vote cast' : 'Vote'}
                          </div>
                        )}
                      </>
                    )}
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