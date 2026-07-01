import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../shared/stores/authStore";
import styles from "./RankPage.module.css";
import notification from '../../images/notification.png';
import filter from '../../images/setting.png';
import search from '../../images/search.png';
import rang1 from '../../images/rang1.png';
import rang2 from '../../images/rang2.png';
import rang3 from '../../images/rang3.png';
import rang4 from '../../images/rang4.png';
import points from '../../images/points.png';
import back from '../../images/arrow-left.png';
import { rankApi } from "../../shared/api/rank";
import { useT } from '../../shared/hooks/useT';

const RANK_FILTERS_KEY = "rankFilters";

export default function RankPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [nav, setNav] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState({
    0: [],
    1: [],
    2: []
  });

  const fetchData = async (type) => {
    setLoading(true);
    try {
      let result = [];
      if (type === 0) result = await rankApi.getInitiators();
      else if (type === 1) result = await rankApi.getNavigators();
      else if (type === 2) result = await rankApi.getHeroes();
      setData(prev => ({ ...prev, [type]: result }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0);
  }, []);

  const rankFilters = useMemo(() => {
    if (location.state?.rankFilters) {
      return location.state.rankFilters;
    }
    try {
      const raw = localStorage.getItem(RANK_FILTERS_KEY);
      if (!raw) return { sortBy: "points_desc", scope: "all" };
      const parsed = JSON.parse(raw);
      return {
        sortBy: parsed?.sortBy || "points_desc",
        scope: parsed?.scope || "all",
      };
    } catch {
      return { sortBy: "points_desc", scope: "all" };
    }
  }, [location.state]);

  const filteredList = useMemo(() => {
    const list = data[nav] || [];
    const searched = !searchTerm.trim()
      ? list
      : list.filter(item =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );

    const sorted = [...searched];
    if (rankFilters.sortBy === "points_asc") {
      sorted.sort((a, b) => (a.points || 0) - (b.points || 0));
    } else if (rankFilters.sortBy === "acts_desc") {
      sorted.sort((a, b) => (b.actsCount || 0) - (a.actsCount || 0));
    } else if (rankFilters.sortBy === "name_asc") {
      sorted.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    } else {
      sorted.sort((a, b) => (b.points || 0) - (a.points || 0));
    }

    const withRank = sorted.map((item, index) => ({ ...item, rank: index + 1 }));
    if (rankFilters.scope === "top10") return withRank.slice(0, 10);
    if (rankFilters.scope === "top50") return withRank.slice(0, 50);
    return withRank;
  }, [searchTerm, data, nav, rankFilters.sortBy, rankFilters.scope]);

  const handleNavChange = (type) => {
    setNav(type);
    if (data[type].length === 0) {
      fetchData(type);
    }
  };

  const getRankImage = (index) => {
    const images = [rang1, rang2, rang3];
    return images[index] || rang4;
  };

  const getCardStyle = (index) => {
    const baseBg = "rgba(255, 255, 255, 0.08)";
    const gradientEnd = "rgba(0, 149, 252, 0) 100%"; 
    const colors = [
      "rgba(135, 87, 183, 0.4)", 
      "rgba(135, 209, 255, 0.25)", 
      "rgba(253, 147, 77, 0.25)"
    ];

    if (index > 2) return { background: baseBg };

    return {
      background: `linear-gradient(90deg, ${colors[index]} 0%, ${gradientEnd}), ${baseBg}`,
      backgroundBlendMode: "normal", 
    };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.header_cont}>
          <img src={back} alt="back" onClick={() => window.history.back()} style={{ cursor: 'pointer' }} />
          <div className={styles.name}>
            <h1>{t('rankLeaders')}</h1>
          </div>
          <img src={notification} alt="notifications" onClick={() => navigate('/notifications')}/>
        </div>
        <div className={styles.btncont}>
          <button className={nav === 0 ? styles.active : ""} onClick={() => handleNavChange(0)}>{t('rankInitiator')}</button>
          <button className={nav === 1 ? styles.active : ""} onClick={() => handleNavChange(1)}>{t('rankNavigator')}</button>
          <button className={nav === 2 ? styles.active : ""} onClick={() => handleNavChange(2)}>{t('rankHero')}</button>
        </div>
        <div className={styles.nav}>
          <div className={styles.searchWrapper}>
            <img src={search} alt="search" className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search" 
              className={styles.input} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <img
              src={filter}
              alt="filter"
              className={styles.filterIcon}
              onClick={() => navigate('/rank-filters', { state: { rankFilters } })}
            />
          </div>
        </div>
      </div>

      <div className={styles.cardcont}>
        {loading ? (
          <h3 style={{color:'white', margin:'auto'}}>Loading...</h3>
        ) : filteredList.length > 0 ? (
          filteredList.map((card, index) => (
            <div 
              key={card.userId || index} 
              className={styles.card} 
              style={getCardStyle(index)}
              onClick={() => navigate(`/rank/${card.userId}`)}
            >
              <div className={styles.rankBadge}>
                <img src={getRankImage(index)} alt="rank" className={styles.rankImg} />
                <span className={styles.rankId}>{card.rank}</span>
              </div>
              <div className={styles.cardInfo}>
                <p className={styles.userName}>{card.name || 'no name'}</p>
                <div className={styles.pointsWrapper}>
                  <img src={points} alt="points" />
                  <p style={{color:'white'}}>{card.points || 0}</p>
                </div>
              </div>
              <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          ))
        ) : (
          <h3 style={{color:'white', margin:'auto'}}>Nothing found</h3>
        )}
      </div>
    </div>
  );
}
