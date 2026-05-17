import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSequelStore } from "../../shared/stores/sequelStore";
import NavBar from "../../shared/ui/NavBar/NavBar";
import styles from "./ActsPage.module.css";
import ActCard from "./components/ActCard";
import Menu from '../Menu/Menu.jsx';

// Изображения
import menu from '../../images/menu.png';
import notification from '../../images/notification.png';
import filter from '../../images/setting.png';
import search from '../../images/search.png';
import thumb from '../../images/thumb.png';

// API
import { profileApi } from "../../shared/api/profile.js";
import { actApi } from "../../shared/api/act.js";

const locations = ["Japan", "Spain", "Russia", 'Kazahstan', 'USA'];

export default function MyActsPage() {
  const navigate = useNavigate();
  const { clearAll } = useSequelStore();

  // Состояния
  const [acts, setActs] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // Для поиска
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocIndex, setSelectedLocIndex] = useState(1);
  const [loading, setLoading] = useState(true);

  // Сброс стора при входе
  useEffect(() => {
    localStorage.removeItem("createActFormState");
    clearAll();
  }, [clearAll]);

  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const profile = await profileApi.getProfile();
        const data = await profileApi.getUserById(profile.id);

        if (data.actIds && data.actIds.length > 0) {
          const actsPromises = data.actIds.map(id => actApi.getAct(id));
          const loadedActs = await Promise.all(actsPromises);
          setActs(loadedActs);
        }
      } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Логика фильтрации (поиск по названию или имени автора)
 const filteredActs = useMemo(() => {
      const query = searchTerm.toLowerCase().trim();
    
    // 2. Если строка пустая — возвращаем все акты
    if (!query) return acts;

    // 3. Фильтруем только по тем полям, которые точно есть в твоем объекте (id, title, status)
    return acts.filter((act) => {
        // Безопасно приводим к строке, чтобы избежать ошибок если title вдруг null
        const title = act.title ? String(act.title).toLowerCase() : "";
        const status = act.status ? String(act.status).toLowerCase() : "";
        const id = act.id ? String(act.id) : "";

        return (
            title.includes(query) 
        );
    });
}, [searchTerm, acts]);



  return (
    <div className={styles.container}>
      {isOpen && <Menu onClose={() => setIsOpen(false)} />}
      
      <div className={styles.actsPage}>
        {/* HEADER */}
        <div className="header">
          <div className={styles.header_cont}>
            <img src={menu} alt="menu" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }} />
            <div className="name"><h1>My Acts</h1></div>
            <img src={notification} alt="notification" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer' }} />
          </div>
          
          <div className="nav">
            <div className={styles.searchWrapper}>
              <img src={search} alt="search" className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search..." 
                className={styles.input}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} // Обновление поиска
              />
              <img 
                src={filter} 
                alt="filter" 
                className={styles.filterIcon} 
                onClick={() => navigate('/filters')}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* LOCATION SLIDER */}
        <div className={styles.locationSliderSection}>
          <div className={styles.sliderHeader}>
            <h1 className={styles.sliderTitle}>Location:</h1>
            <p className={styles.currentLocation}>{locations[selectedLocIndex]}</p>
          </div>

          <div className={styles.customRangeWrapper}>
            <div className={styles.rangeTrack}></div>
            <div 
              className={styles.activeTrack} 
              style={{ width: `${(selectedLocIndex / (locations.length - 1)) * 100}%` }}
            ></div>
            
            <div 
              className={styles.thumbcont}
              style={{ left: `${(selectedLocIndex / (locations.length - 1)) * 100}%` }}
            >
              <img src={thumb} alt="thumb" className={styles.rangeThumb} />
            </div>

            <input 
              type="range" 
              min="0" 
              max={locations.length - 1} 
              value={selectedLocIndex} 
              step="1"
              onChange={(e) => setSelectedLocIndex(parseInt(e.target.value))}
              className={styles.hiddenInput}
            />
          </div>
        </div>

        {/* CONTENT */}
        <div className={styles.contentWrapper}>
          <div className={styles.streamsList}>
            {loading ? (
              <p style={{ color: 'white', textAlign: 'center' }}>Loading...</p>
            ) : filteredActs.length > 0 ? (
              filteredActs.map((act) => (
                <ActCard key={act.id} act={act} titleact={true} />
              ))
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '20px' }}>
                {searchTerm ? "No results found" : "You have no acts yet"}
              </p>
            )}
          </div>
        </div>
        
        <NavBar />
      </div>
    </div>
  );
}
