import { useNavigate } from "react-router-dom";
import default_back from '../../../images/act_back_default.png';
import styles from "./ActCard.module.css";
import star from '../../../images/star.png';
import { actApi } from "../../../shared/api/act";
import { buildPreviewUrl } from "../../../shared/utils/previewUrl";
import { useEffect, useState } from "react";
import { getDisplayName } from "../../../shared/utils/displayName";
import { useT } from "../../../shared/hooks/useT";

const reverseLocationCache = new Map();

async function reverseGeocodeTask(lat, lng) {
  if (lat == null || lng == null) return null;
  const key = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  if (reverseLocationCache.has(key)) return reverseLocationCache.get(key);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address || {};
    const city = a.city || a.town || a.village || a.hamlet || "";
    const road = a.road || a.pedestrian || a.path || "";
    const house = a.house_number || "";
    const country = a.country || "";

    const readable = [city, [road, house].filter(Boolean).join(" "), country]
      .filter(Boolean)
      .join(", ");

    const value = readable || data?.display_name || null;
    reverseLocationCache.set(key, value);
    return value;
  } catch {
    return null;
  }
}

export default function ActCard({ act, titleact }) {
  const navigate = useNavigate();
  const t = useT();
  const id = act.publicId || act.id;
const [isLive, setIsLive] = useState(null);
const [title, setTitle] = useState('');
const [description, setDescription] = useState('');
const [heroes, setHeroes] = useState('no heroes');
const [navigator, setNavigator] = useState('no navigators');
const [heroMethod, setHeroMethod] = useState('');
const [navigatorMethod, setNavigatorMethod] = useState('');
const [scheduledAt, setScheduledAt] = useState(act.scheduledAt || null);
const [countdownText, setCountdownText] = useState('');
const [roleSummary, setRoleSummary] = useState({ hero: '', navigator: '' });
const [location, setLocation] = useState('no location');
const [distance, setDistance] = useState('no distance');
const [streamLocation, setStreamLocation] = useState(null);
const [rating, setRating] = useState(0.0);
const [rawImageUrl, setRawImageUrl] = useState(act.previewFileName || null);
const [displayImage, setDisplayImage] = useState(default_back);
const [achivemenets, setAchivemenets] = useState([]);
const [navMethod, setNavMethod] = useState(1);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setRawImageUrl(act.previewFileName || null);
}, [act.previewFileName]);

useEffect(() => {
  const loadAllData = async () => {
    try {
      setLoading(true);
      const actsdata = await actApi.getAct(id);
      if (actsdata) {
        let effectiveStatus = actsdata.status;
        if (actsdata.status === 'ONLINE') {
          try {
            const heroStreams = await actApi.getHeroStreams(actsdata.id ?? id);
            const hasStreams = Array.isArray(heroStreams) && heroStreams.length > 0;
            const hasOnlineHero = Array.isArray(heroStreams)
              ? heroStreams.some((s) => s?.status === 'ONLINE')
              : false;
            if (hasStreams && !hasOnlineHero) {
              effectiveStatus = 'OFFLINE';
            }
          } catch (_e) {
            // Keep backend status if hero-stream endpoint is temporarily unavailable.
          }
        }

        setIsLive(effectiveStatus);
        setTitle(actsdata.title || actsdata.name || 'Untitled');
        setDescription(actsdata.description || 'No description');
        setHeroMethod(actsdata.heroMethods || '');
        setNavigatorMethod(actsdata.navigatorMethods || '');
        setScheduledAt(actsdata.scheduledAt || null);

        const allRoleConfigs = (actsdata.teams || []).flatMap(t => t.roleConfigs || []);
        const allTeamTasks = (actsdata.teams || []).flatMap(t => t.tasks || []);
        const heroNames = allRoleConfigs
          .filter(rc => rc.role === 'hero')
          .flatMap(rc => (rc.candidates || []).map(c => getDisplayName(c.user)).filter(Boolean));
        const navNames = allRoleConfigs
          .filter(rc => rc.role === 'navigator')
          .flatMap(rc => (rc.candidates || []).map(c => getDisplayName(c.user)).filter(Boolean));

        const getRoleSummary = (role) => {
          const config = allRoleConfigs.find((rc) => rc.role === role);
          if (!config) return '';
          if (config.openVoting) return 'Open voting';
          const names = (config.candidates || [])
            .map((c) => getDisplayName(c.user))
            .filter(Boolean);
          if (names.length === 1) return names[0];
          if (names.length > 1) return 'Voting';
          return '';
        };

        setRoleSummary({
          hero: getRoleSummary('hero'),
          navigator: getRoleSummary('navigator'),
        });
        setHeroes(heroNames.length > 0 ? heroNames.join(', ') : 'open voting');
        setNavigator(navNames.length > 0 ? navNames.join(', ') : 'open voting');

        const city = actsdata?.user?.city || null;
        const country = actsdata?.user?.country || null;
        const firstTaskWithAddress = allTeamTasks.find((t) => t?.address && String(t.address).trim().length > 0);
        const firstTaskWithCoords = allTeamTasks.find((t) => t?.lat != null && t?.lng != null);
        if (city || country) {
          setLocation([city, country].filter(Boolean).join(', '));
        } else if (firstTaskWithAddress) {
          setLocation(firstTaskWithAddress.address);
        } else if (firstTaskWithCoords) {
          const resolved = await reverseGeocodeTask(firstTaskWithCoords.lat, firstTaskWithCoords.lng);
          setLocation(resolved || 'no location');
        } else {
          setLocation('no location');
        }

        setDistance(typeof actsdata.distanceKm === 'number' ? actsdata.distanceKm : null);

        if (actsdata.teams) {
          for (const team of actsdata.teams) {
            if (team.tasks && team.tasks.length > 0) {
              const taskWithCoords = team.tasks.find(t => t.lat != null && t.lng != null);
              if (taskWithCoords) {
                setStreamLocation({ lat: taskWithCoords.lat, lng: taskWithCoords.lng, address: taskWithCoords.address || null });
                break;
              }
            }
          }
        }

        setRating(actsdata.rating || 0.0);
        if (!act.previewFileName && actsdata.previewFileName) {
          setRawImageUrl(actsdata.previewFileName);
        }
        setAchivemenets(allTeamTasks);

        if (actsdata.navigatorMethods === "VOTING") {
          setNavMethod(2);
        }
      }
    } catch (error) {
      console.error("err", error);
    } finally {
      setLoading(false);
    }
  };

  if (id) {
    loadAllData();
  }
}, [id, act.previewFileName]);

useEffect(() => {
  if (!scheduledAt) {
    setCountdownText('');
    return;
  }

  const formatRemaining = () => {
    const diff = new Date(scheduledAt).getTime() - Date.now();
    if (!Number.isFinite(diff) || diff <= 0) {
      setCountdownText('');
      return;
    }
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      setCountdownText(`${days}d ${hours}h`);
      return;
    }
    if (hours > 0) {
      setCountdownText(`${hours}h ${minutes}m`);
      return;
    }
    setCountdownText(`${minutes}m`);
  };

  formatRemaining();
  const timer = setInterval(formatRemaining, 30000);
  return () => clearInterval(timer);
}, [scheduledAt]);

const addCacheBuster = (url) => {
  if (!url || url === default_back) return url;
  const separator = url.includes('?') ? '&' : '?';
  const fingerprint = encodeURIComponent(id + '-' + String(rawImageUrl || ''));
  return url + separator + 'cb=' + fingerprint;
};

const resolvedPreviewUrl = addCacheBuster(buildPreviewUrl(rawImageUrl) || default_back);

useEffect(() => {
  if (!resolvedPreviewUrl || resolvedPreviewUrl === default_back) {
    setDisplayImage(default_back);
    return;
  }

  let isActive = true;
  const image = new Image();
  image.onload = () => {
    if (isActive) setDisplayImage(resolvedPreviewUrl);
  };
  image.onerror = () => {
    if (isActive) setDisplayImage(default_back);
  };
  image.src = resolvedPreviewUrl;

  return () => {
    isActive = false;
  };
}, [resolvedPreviewUrl]);

  const cardStyle = {
    backgroundImage: "url(" + displayImage + ")",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  const handleCardClick = () => {
    navigate("/acts/" + (act.publicId || act.id), { state: { act } });
  };

  const heroText = roleSummary.hero || (heroMethod === 'VOTING'
    ? t('voting')
    : heroMethod === 'BIDDING'
      ? t('bidding')
      : heroes);

  const navigatorText = roleSummary.navigator || (navigatorMethod === 'VOTING'
    ? t('voting')
    : navigatorMethod === 'BIDDING'
      ? t('bidding')
      : navigator);

  if (act.isMock) {
    return (
      <div className={styles.parent}>
        { titleact === true && (
        <p className={styles.subtitle}>{t('popular')}</p>
        )}
        <div className={styles.actCard} onClick={handleCardClick} style={cardStyle}>
          <div className={styles.infoblock}>
            <div className={styles.inner}>
              {isLive === 'ONLINE' && (
                <div className={styles.online}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
                    <circle cx="10" cy="10" r="5" fill="white" />
                  </svg>
                  <p className={styles.live}>{t('live')}</p>
                </div>
              )}
              {isLive !== 'ONLINE' && countdownText && (
                <div className={styles.online}>
                  <p className={styles.live}>{t('startsIn')} {countdownText}</p>
                </div>
              )}
              <div style={{display:'flex',gap:'5px', alignItems:'baseline'}}>
                <h1 className={styles.title}>{title}</h1>
                <div style={{display:'flex',gap:'5px'}}>
                  <img src={star} alt="" style={{width: '20px', height: '20px'}}/>
                  <p style={{color:'#00F300'}}>{rating}</p>
                </div>
              </div>
              <p className={styles.desc}>{description}</p>
              <div style={{gap:'2px', background:'#181818', width:'fit-content', padding:'4px 5px', borderRadius:'10px'}}>
                <p className={styles.desc} style={{fontSize:'small',color:'white',fontWeight:'bolder'}}>Heroes: {heroText}</p>
                <p className={styles.desc} style={{fontSize:'small',color:'white', fontWeight:'bolder'}}>Navigator: {navigatorText}</p>
              </div>
              <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                <div style={{ background:'#111111', width:'fit-content', padding:'4px 5px', borderRadius:'8px', border:'none'}}>
                  <p className={styles.desc} style={{ color:'#c0c0c0'}}>{location}</p>
                </div>
                <div style={{ padding: '2px 4px', borderRadius: '8px' }}>
                  <div style={{ background:'#252525', width:'fit-content', padding:'4px 5px', borderRadius:'8px', border:'none'}}>
                    {distance != null ? (
                      <p className={styles.desc} style={{ color:'#c0c0c0'}}>{Number(distance).toFixed(1)}km away</p>
                    ) : (
                      <p className={styles.desc} style={{ color:'#c0c0c0'}}>{t('noDistance')}</p>
                    )}
                  </div>
                </div>
              </div>
              {achivemenets.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {achivemenets.slice(0, 4).map((task, idx) => (
                    <div
                      key={task.id || idx}
                      title={task.description || `Task ${idx + 1}`}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgba(0, 147, 255, 0.28)',
                        border: '1px solid rgba(0, 147, 255, 0.75)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </div>
                  ))}
                  {achivemenets.length > 4 && (
                    <span className={styles.desc} style={{ color: '#8ecbff', fontSize: '12px' }}>
                      +{achivemenets.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.actCard} style={cardStyle} onClick={handleCardClick}>
      <div className={styles.overlay} />
      <div className={styles.infoblock}>
        <div className={styles.inner}>
          {isLive === 'ONLINE' && (
            <div className={styles.online}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
                <circle cx="10" cy="10" r="5" fill="white" />
              </svg>
              <p className={styles.live}>{t('live')}</p>
            </div>
          )}
          {isLive !== 'ONLINE' && countdownText && (
            <div className={styles.online}>
              <p className={styles.live}>{t('startsIn')} {countdownText}</p>
            </div>
          )}
          <div style={{display:'flex',gap:'5px', alignItems:'baseline'}}>
            <h1 className={styles.title}>{title}</h1>
            <div style={{display:'flex',gap:'5px'}}>
              <img src={star} alt="" style={{width: '20px', height: '20px'}}/>
              <p style={{color:'#00F300'}}>{rating}</p>
            </div>
          </div>
          <p className={styles.desc}>{description}</p>
          <div style={{gap:'2px', background:'#181818', width:'fit-content', padding:'4px 5px', borderRadius:'10px'}}>
            <p className={styles.desc} style={{fontSize:'small',color:'white',fontWeight:'bolder'}}>Heroes: {heroText}</p>
            <p className={styles.desc} style={{fontSize:'small',color:'white', fontWeight:'bolder'}}>Navigator: {navigatorText}</p>
          </div>
          <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
            <div style={{ background:'#111111', width:'fit-content', padding:'4px 5px', borderRadius:'8px', border:'none'}}>
              <p className={styles.desc} style={{ color:'#c0c0c0'}}>{location}</p>
            </div>
            <div style={{ padding: '2px 4px', borderRadius: '8px' }}>
              <div style={{ background:'#252525', width:'fit-content', padding:'4px 5px', borderRadius:'8px', border:'none'}}>
                {distance != null ? (
                  <p className={styles.desc} style={{ color:'#c0c0c0'}}>{Number(distance).toFixed(1)}km away</p>
                ) : (
                  <p className={styles.desc} style={{ color:'#c0c0c0'}}>{t('noDistance')}</p>
                )}
              </div>
            </div>
            {achivemenets.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {achivemenets.slice(0, 4).map((task, idx) => (
                  <div
                    key={task.id || idx}
                    title={task.description || `Task ${idx + 1}`}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(0, 147, 255, 0.28)',
                      border: '1px solid rgba(0, 147, 255, 0.75)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  >
                    {idx + 1}
                  </div>
                ))}
                {achivemenets.length > 4 && (
                  <span className={styles.desc} style={{ color: '#8ecbff', fontSize: '12px' }}>
                    +{achivemenets.length - 4}
                  </span>
                )}
              </div>
            )}
            {isLive === 'ONLINE' && streamLocation && (
              <div style={{ background:'#1a3a1a', width:'fit-content', padding:'4px 8px', borderRadius:'8px', border:'none', display:'flex', alignItems:'center', gap:'4px'}}>
                <span style={{color:'#00FF00', fontSize:'10px'}}>📍</span>
                <p className={styles.desc} style={{ color:'#00FF00'}}>
                  {streamLocation.address || (streamLocation.lat != null ? streamLocation.lat.toFixed(4) + ', ' + streamLocation.lng.toFixed(4) : '')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
