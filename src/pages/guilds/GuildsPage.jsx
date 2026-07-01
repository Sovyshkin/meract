import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../shared/ui/NavBar/NavBar";
import styles from "./GuildsPage.module.css";
import GuildCard from "./components/GuildCard";
import Menu from '../Menu/Menu.jsx';
import menu from '../../images/menu.png';
import notification from '../../images/notification.png';
import filter from '../../images/setting.png';
import search from '../../images/search.png';
import { guildApi } from "../../shared/api/guild.js";
import { useT } from '../../shared/hooks/useT';

export default function GuildsPage() {
  const t = useT();
  const navigate = useNavigate();  
  const [isOpen, setIsOpen] = useState(false);
  const [guilds, setGuilds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await guildApi.getAllGuilds();
        console.log('Guilds API response:', data);
        setGuilds(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); 

  const filteredGuilds = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return guilds;
    return guilds.filter(guild => 
      guild.name?.toLowerCase().includes(query)
    );
  }, [searchTerm, guilds]);

  return (
    <div className={styles.container}>
      {isOpen && <Menu onClose={() => setIsOpen(false)} />}
      
      <div className={styles.actsPage}>
        <div className="header">
          <div className={styles.header_cont}>
            <img src={menu} alt="menu" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }} />
            <div className="name"><h1>{t('guildTitle')}</h1></div>
            <img src={notification} alt="notifications" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer' }} />
          </div>
          <div className="nav">
            <div className={styles.searchWrapper}>
              <img src={search} alt="search" className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder={t('search')} 
                className={styles.input} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <img src={filter} alt="filter" className={styles.filterIcon} onClick={() => navigate('/guilds-filters')} style={{ cursor: 'pointer' }} />
            </div>
          </div>
        </div>

        <div className={styles.contentWrapper}>
          <div className={styles.streamsList}>
            {loading ? (
              <h3 style={{ color: 'white', textAlign: 'center' }}>Loading...</h3>
            ) : filteredGuilds.length > 0 ? (
              filteredGuilds.map((guild, index) => (
                <GuildCard key={guild.id || index} guild={guild} />
              ))
            ) : (
              <h3 style={{ color: 'white', textAlign: 'center', opacity: 0.5 }}>
                {t('guildNoGuilds')}
              </h3>
            )}
          </div>
        </div>
        
        <NavBar />
      </div>
    </div>
  );
}
