import { useNavigate } from "react-router-dom";
import default_back from '../../../images/act_back_default.png';
import styles from "./ActCard.module.css";
import star from '../../../images/star.png';
import { actApi } from "../../../shared/api/act";
import { useEffect, useState } from "react";
export default function ActCard({ act, titleact }) {
  const navigate = useNavigate();
  const id = act.id;
// 1. ОБЪЯВЛЯЕМ ВСЕ ПЕРЕМЕННЫЕ ЧЕРЕЗ USESTATE
const [isLive, setIsLive] = useState(null);
const [title, setTitle] = useState('');
const [description, setDescription] = useState('');
const [heroes, setHeroes] = useState('no heroes');
const [navigator, setNavigator] = useState('no navigators');
const [location, setLocation] = useState('no location');
const [distance, setDistance] = useState('no distance');
const [rating, setRating] = useState(0.0);
const [rawImageUrl, setRawImageUrl] = useState(act.previewFileName || null);
const [displayImage, setDisplayImage] = useState(default_back);
const [achivemenets, setAchivemenets] = useState([]); 
const [navMethod, setNavMethod] = useState(1);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadAllData = async () => {
    try {
      setLoading(true);
      const actsdata = await actApi.getAct(id);
      if (actsdata) {
        setIsLive(actsdata.status);
        setTitle(actsdata.title || actsdata.name || 'Untitled');
        setDescription(actsdata.description || 'No description');
        
        // Extract heroes/navigators from teams structure
        const allRoleConfigs = (actsdata.teams || []).flatMap(t => t.roleConfigs || []);
        const heroNames = allRoleConfigs
          .filter(rc => rc.role === 'hero')
          .flatMap(rc => (rc.candidates || []).map(c => c.user?.login).filter(Boolean));
        const navNames = allRoleConfigs
          .filter(rc => rc.role === 'navigator')
          .flatMap(rc => (rc.candidates || []).map(c => c.user?.login).filter(Boolean));
        setHeroes(heroNames.length > 0 ? heroNames.join(', ') : 'open voting');
        setNavigator(navNames.length > 0 ? navNames.join(', ') : 'open voting');
        
        if (actsdata.initiator) {
          setLocation(`${actsdata.initiator.city || ''}, ${actsdata.initiator.country || ''}`);
        }

        setDistance(actsdata.distanceKm || null);
        setRating(actsdata.rating || 0.0);
        setRawImageUrl(actsdata.previewFileName || act.previewFileName || null);
        if (actsdata.tasks) {
          setAchivemenets(actsdata.tasks); 
        }

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
}, [id]);

 const resolvePreviewUrl = (value) => {
  if (!value) return default_back;

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');

  let path = String(value).trim();
  if (!path) return default_back;

  if (path.startsWith('uploads/')) {
    path = `/${path}`;
  } else if (path.startsWith('acts/')) {
    path = `/uploads/${path}`;
  } else if (!path.startsWith('/uploads/')) {
    path = `/uploads/acts/${path.replace(/^\/+/, '')}`;
  }

  return `${apiBase}${path}`;
 };

 const resolvedPreviewUrl = resolvePreviewUrl(rawImageUrl);

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
    backgroundImage: `url(${displayImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  const handleCardClick = () => {
    navigate(`/acts/${act.id}`, { state: { act } });
  };

  if (act.isMock) {
    return (
      <div className={styles.parent}>
        { titleact === true &&

        <p className={styles.subtitle}>Popular</p>
        }
        <div className={styles.actCard} onClick={handleCardClick} style={cardStyle}>
          <div className={styles.infoblock}>
            <div className={styles.inner}>
              {isLive === 'ONLINE' && (
                <div className={styles.online}> 
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
                    <circle cx="10" cy="10" r="5" fill="white" />
                  </svg>
                  <p className={styles.live}>Live</p>
                </div>
              )}
                     <div style={{display:'flex',gap:'5px', alignItems:'baseline',}}>

          <h1 className={styles.title}>{title}</h1>
          <div style={{display:'flex',gap:'5px'}}>
            <img src={star} alt="" style={{width: '20px',
  height: '20px',}}/>
            <p style={{color:'#00F300'}}>{rating}</p>
          </div>
          </div>
              <p className={styles.desc}>{description}</p>
             <div style={{gap:'2px', background:'#181818', width:'fit-content', padding:'4px 5px', borderRadius:'10px',}}>
           <p className={styles.desc} style={{fontSize:'small',color:'white',fontWeight:'bolder'}}>Heroes: {heroes}</p>
          <p className={styles.desc} style={{fontSize:'small',color:'white', fontWeight:'bolder'}}>Navigator: {navigator}</p>
          </div>
              <div style={{display:'flex', gap:'5px', alignItems:'center',}}>
                <div style={{ background:'#111111', width:'fit-content', padding:'4px 5px', borderRadius:'8px', border:'none',}}>
              <p className={styles.desc} style={{ color:'#c0c0c0',}}>{location}</p>
                </div>
              <div style={{  padding: '2px 4px', borderRadius: '8px' }}>
                <div style={{ background:'#252525', width:'fit-content', padding:'4px 5px', borderRadius:'8px', border:'none',}}>
                  <p className={styles.desc} style={{ color:'#c0c0c0',}}>{distance}km away</p>
                </div>
              </div>

              </div>
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
              <p className={styles.live}>Live</p>
            </div>
          )}
          <div style={{display:'flex',gap:'5px', alignItems:'baseline',}}>
          <h1 className={styles.title}>{title}</h1>
          <div style={{display:'flex',gap:'5px'}}>
            <img src={star} alt="" style={{width: '20px',
  height: '20px',}}/>
            <p style={{color:'#00F300'}}>{rating}</p>
          </div>
          </div>
          <p className={styles.desc}>{description}</p>
        <div style={{gap:'2px', background:'#181818', width:'fit-content', padding:'4px 5px', borderRadius:'10px',}}>
           <p className={styles.desc} style={{fontSize:'small',color:'white',fontWeight:'bolder'}}>Heroes: {heroes}</p>
          <p className={styles.desc} style={{fontSize:'small',color:'white', fontWeight:'bolder'}}>Navigator: {navigator}</p>
          </div>

            <div style={{display:'flex', gap:'5px', alignItems:'center',}}>
                <div style={{ background:'#111111', width:'fit-content', padding:'4px 5px', borderRadius:'8px', border:'none',}}>
              <p className={styles.desc} style={{ color:'#c0c0c0',}}>{location}</p>
                </div>
              <div style={{  padding: '2px 4px', borderRadius: '8px' }}>
                <div style={{ background:'#252525', width:'fit-content', padding:'4px 5px', borderRadius:'8px', border:'none',}}>
                  {distance ?
                    <p className={styles.desc} style={{ color:'#c0c0c0',}}>{distance}km away</p>
                  :
                    <p className={styles.desc} style={{ color:'#c0c0c0',}}>no distance</p>
                  
                  }
                </div>
              </div>

              </div>
        </div>
      </div>

      {/* <div className={styles.stripe}></div>
      <div className={styles.blocks}>
        <p>{act.location}</p>
        <p>{act.distance}</p>
      </div>
      <div className={styles.info}>
        <div className={styles.arrows}>
          <span className={styles.arrow}>
            <img src="/icons/arrowUp.svg" alt="arrow" />
            <h2>{act.upvotes}</h2>
          </span>
          <span className={styles.arrow}>
            <img src="/icons/arrowDown.svg" alt="arrow" />
            <h2>{act.downvotes}</h2>
          </span>
        </div>
        <h4>{act.liveIn}</h4>
      </div> */}
    </div>
  );
}
