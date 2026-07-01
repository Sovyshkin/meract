import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../shared/stores/authStore";
import styles from "./ChatPage.module.css";
import notification from '../../images/notification.png';
import filter from '../../images/add.png';
import search from '../../images/search.png';
import back from '../../images/menu.png';
import Menu from '../Menu/Menu.jsx';
import NavBar from "../../shared/ui/NavBar/NavBar";
import userimg from '../../images/user.png';
import { chatApi } from "../../shared/api/chat.js";
import api from "../../shared/api/api.js";
import { useNotificationStore } from "../../shared/stores/notificationStore.js";
import { noticeApi } from "../../shared/api/notifications.js";
import { useT } from '../../shared/hooks/useT';

const getPreviewText = (msg, t) => {
  if (!msg) return t('chatNoMessages');
  if (msg.fileType) {
    switch (msg.fileType) {
      case 'image': return `🖼 ${t('chatPhoto')}`;
      case 'video': return `📹 ${t('chatVideo')}`;
      case 'audio':
      case 'voice': return `🎤 ${t('chatVoice')}`;
      default: return `📎 ${t('chatFile')}`;
    }
  }
  if (msg.text) {
    const text = msg.text;
    return text.length > 35 ? text.substring(0, 35) + '...' : text;
  }
  return t('chatNoMessages');
};

export default function ChatPage() {
  const t = useT();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'acts' | 'contacts'
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const { markAllRead } = useNotificationStore();

  // Сбрасываем счётчик непрочитанных чат-уведомлений при открытии страницы чата
  useEffect(() => {
    noticeApi.markAllRead().catch(() => {});
    markAllRead();
  }, []);

  // Поиск пользователей по username с debounce
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const res = await api.get('/user/all-users-for-guild');
        const query = searchTerm.toLowerCase().trim();
        setUserResults((res.data || []).filter(u => u.login?.toLowerCase().includes(query)));
      } catch {
        setUserResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const openUserChat = async (userId) => {
    try {
      const chat = await chatApi.createChat(userId);
      navigate(`/chat/${chat.id}/${userId}`);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await chatApi.getAll();
        console.log(data)
        setCards(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const filteredChats = useMemo(() => {
    let list = cards;
    if (activeFilter === 'acts') list = list.filter(c => c.actId != null);
    else if (activeFilter === 'contacts') list = list.filter(c => c.type === 'direct');
    const query = searchTerm.toLowerCase().trim();
    if (!query) return list;
    return list.filter(card => card.name?.toLowerCase().includes(query));
  }, [searchTerm, cards, activeFilter]);

  const toChat = (type, id, userId) => {
    type === 'direct' ? navigate(`/chat/${id}/${userId}`) : navigate(`/group/${id}`);
  };

  return (
    <div className={styles.container}>
      {isOpen && <Menu onClose={() => setIsOpen(false)} />}
      
      <div className={styles.header}>
        <div className={styles.header_cont} style={{ padding: '20px 0px' }}>
          <img 
            src={back} 
            alt="menu" 
            onClick={() => setIsOpen(!isOpen)}
            style={{ cursor: 'pointer' }} 
          />
          <div className={styles.name}>
            <h1>{t('chatTitle')}</h1>
          </div>
          <img src={notification} alt="notifications" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer' }} />        </div>

        <div className={styles.nav}>
          <div className={styles.searchWrapper}>
            <img src={search} alt="search" className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder={t('search')} 
              className={styles.input} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <img 
              src={filter} 
              alt="filter" 
              className={styles.filterIconnew} 
              onClick={() => navigate('/chat-create')} 
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>

        <div className={styles.btncont} style={{ marginBottom: '12px' }}>
          <button
            className={activeFilter === 'all' ? styles.active : ''}
            onClick={() => setActiveFilter('all')}
          >{t('chatAll')}</button>
          <button
            className={activeFilter === 'acts' ? styles.active : ''}
            onClick={() => setActiveFilter('acts')}
          >{t('chatActs')}</button>
          <button
            className={activeFilter === 'contacts' ? styles.active : ''}
            onClick={() => setActiveFilter('contacts')}
          >{t('chatContacts')}</button>
        </div>
      </div>

      <div className={styles.cardcont}>
        <div 
          className={styles.card}
          onClick={() => navigate('/support')}
          style={{ borderLeft: '3px solid #009DFF' }}
        >
          <div className={styles.rankBadge}>
            <img src={notification} alt="support" className={styles.rankImg} />
          </div>
          <div className={styles.cardInfo}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className={styles.userName}>{t('chatSupport')}</p>
            </div>
            <p style={{ 
              color: '#bbb', 
              fontSize: '13px', 
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {t('chatSupportSubtitle')}
            </p>
          </div>
        </div>

        {loading ? (
          <h3 style={{ color: 'white', margin: 'auto' }}>Loading...</h3>
        ) : filteredChats.length > 0 ? (
          filteredChats.map((card) => (
            <div 
              key={card.id} 
              className={styles.card} 
              onClick={() => toChat(card.type, card.id, card.partner?.id)}
            >
              <div className={styles.rankBadge}>
                <img src={card.imageUrl || userimg} alt="no avatar" className={styles.rankImg} style={{color:'white', fontSize:'small',}}/>
              </div>

              <div className={styles.cardInfo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className={styles.userName}>{card.name}</p>
                  <p style={{ color: 'gray', fontSize: 'smaller' }}>
                    {card.lastMessageAt ? new Date(card.lastMessageAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ 
                    color: '#bbb', 
                    fontSize: '13px', 
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '80%'
                  }}>
                    {getPreviewText(card.lastMessage, t)}
                  </p>
                  {card.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>{card.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <h3 style={{ color: 'white', margin: 'auto' }}>
            {searchTerm ? t('chatNoChats') : t('chatNothingFound')}
          </h3>
        )}

        {/* People section — user search results */}
        {searchTerm.trim().length >= 2 && (
          <div style={{ width: '100%', marginTop: '16px' }}>
            <p style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', padding: '0 4px' }}>
              {t('chatPeople')}
            </p>
            {userSearchLoading ? (
              <p style={{ color: '#666', fontSize: '13px', padding: '0 4px' }}>Searching...</p>
            ) : userResults.length > 0 ? (
              userResults.map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                  }}
                  onClick={() => openUserChat(u.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={u.imageUrl || userimg} alt={u.login} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <p style={{ color: '#fff', fontSize: '15px', margin: 0 }}>{u.login}</p>
                      {u.email && <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>{u.email}</p>}
                    </div>
                  </div>
                  <span style={{ color: '#FF3B57', fontSize: '13px', fontWeight: 500 }}>{t('chatMessage')}</span>
                </div>
              ))
            ) : (
              <p style={{ color: '#666', fontSize: '13px', padding: '0 4px' }}>{t('chatNoUsers')}</p>
            )}
          </div>
        )}
      </div>
      <NavBar />
    </div>
  );
}
