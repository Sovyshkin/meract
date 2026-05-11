import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import back from '../../images/arrow-left.png';
import logo from '../../images/user.png';
import trash from '../../images/trash.png';
import styles from './Notifications.module.css';
import { noticeApi } from '../../shared/api/notifications';
import { useNotificationStore } from '../../shared/stores/notificationStore';

const NotificationCard = ({ card, isExpanded, onToggle, onDelete, onRead, canSwipe, onAccept, onReject }) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef(null);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-60, -20], [1, 0]);

  useLayoutEffect(() => {
    if (canSwipe && textRef.current) {
      const hasOverflow = textRef.current.scrollHeight > textRef.current.clientHeight;
      setIsOverflowing(hasOverflow);
    }
  }, [card.desc, canSwipe]);

  const cardContent = (
    <div
      className={styles.card}
      style={{
        flexDirection: 'column',
        alignItems: 'stretch',
        borderLeft: !card.isRead ? '3px solid #009DFF' : '3px solid transparent',
      }}
      onClick={() => !card.isRead && onRead && onRead(card.id)}
    >
      {/* Р’РµСЂС…РЅСЏСЏ С‡Р°СЃС‚СЊ: Р›РѕРіРѕ, РРјСЏ, Р’СЂРµРјСЏ Рё РўРµРєСЃС‚ */}
      <div style={{ display: 'flex', width: '100%' }}>
        <div className={styles.rankBadge}>
          <img
            src={card.avatar || logo}
            className={styles.rankImg}
            alt="user"
            onError={(e) => { e.target.src = logo; }}
          />
        </div>
        <div className={styles.cardInfo} style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className={styles.userName} style={{ color: !card.isRead ? '#fff' : undefined }}>
              {card.user}
            </p>
            <p style={{ color: 'gray', fontSize: 'smaller' }}>{card.time}</p>
          </div>
          <p
            ref={textRef}
            style={{
              color: 'white',
              display: !canSwipe ? 'block' : '-webkit-box',
              WebkitLineClamp: !canSwipe || isExpanded ? 'unset' : '1',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              marginRight: '10px'
            }}
          >
            {card.desc}
          </p>
        </div>

        {/* РЎС‚СЂРµР»РєР° С‚РѕР»СЊРєРѕ РґР»СЏ Notifications */}
        {canSwipe && (isOverflowing || isExpanded) && (
          <svg
            className={styles.arrowIcon}
            onClick={(e) => { e.stopPropagation(); onToggle(card.id); }}
            style={{
              cursor: 'pointer',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
              minWidth: '24px',
              alignSelf: 'center'
            }}
            viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        )}
      </div>

      {/* РљРЅРѕРїРєРё С‚РѕР»СЊРєРѕ РґР»СЏ Invitations (РєРѕРіРґР° canSwipe = false Рё РЅРµ act_invite) */}
      {!canSwipe && card.type !== 'act_invite' && (
        <div className={styles.btncont} style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
          <button style={{ flex: 1 }} onClick={() => onReject && onReject(card)}>
            РћС‚РєР»РѕРЅРёС‚СЊ
          </button>
          <button className={styles.active} style={{ flex: 1 }} onClick={() => onAccept && onAccept(card)}>
            РџСЂРёРЅСЏС‚СЊ
          </button>
        </div>
      )}
    </div>
  );

  if (!canSwipe) return <div style={{ marginBottom: '10px' }}>{cardContent}</div>;

  return (
    <div className={styles.swipeWrapper} style={{ position: 'relative', marginBottom: '10px' }}>
      <motion.div
        style={{ position: 'absolute', right: '20px', top: '50%', y: '-50%', opacity, zIndex: 1, cursor: 'pointer' }}
        onClick={() => onDelete(card.id)}
      >
        <img src={trash} alt="delete" style={{ width: '24px', height: '24px' }} />
      </motion.div>
      <motion.div
        drag="x"
        style={{ x, zIndex: 2, position: 'relative' }}
        dragConstraints={{ left: -70, right: 0 }}
        dragElastic={0.05}
      >
        {cardContent}
      </motion.div>
    </div>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const [expandedCards, setExpandedCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    notifications: storeNotifications,
    setNotifications,
    markRead,
    markAllRead,
    removeNotification,
  } = useNotificationStore();

  // Format date for display
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  };

  // Load notifications from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await noticeApi.getNotifications(50);
        if (Array.isArray(data)) setNotifications(data);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const currentData = storeNotifications;

  const toggleExpand = (id) => {
    setExpandedCards((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = useCallback(async (id) => {
    removeNotification(id);
    try {
      await noticeApi.deleteNotification(id);
    } catch (err) {
      console.error('Delete notification failed:', err);
    }
  }, [removeNotification]);

  const handleMarkRead = useCallback(async (id) => {
    markRead(id);
    try {
      await noticeApi.markRead(id);
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  }, [markRead]);

  const handleMarkAllRead = useCallback(async () => {
    markAllRead();
    try {
      await noticeApi.markAllRead();
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  }, [markAllRead]);

  const handleAccept = useCallback(async (card) => {
    if (card.type === 'stream_invite' && card.metadata?.actId) {
      navigate(`/stream/${card.metadata.actId}`);
    } else if (card.type === 'act_invite' && card.metadata?.actId) {
      navigate(`/acts/${card.metadata.actId}`);
    } else if (card.type === 'guild_invite' && card.metadata?.guildId) {
      navigate(`/guilds/${card.metadata.guildId}`);
    }
    markRead(card.id);
  }, [markRead, navigate]);

  const handleReject = useCallback(async (card) => {
    markRead(card.id);
  }, [markRead]);

  const unreadCount = storeNotifications.filter((n) => !n.isRead).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.header_cont}>
          <img src={back} alt="back" onClick={() => navigate('/acts')} style={{ cursor: 'pointer' }} />
          <div className={styles.name}>
            <h1>Notifications</h1>
          </div>
          {unreadCount > 0 ? (
            <span
              onClick={handleMarkAllRead}
              style={{ fontSize: '11px', color: '#009DFF', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Mark all as read
            </span>
          ) : (
            <div style={{ width: '24px' }}></div>
          )}
        </div>


      </div>

      <div className={styles.cardcont}>
        {loading ? (
          <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
            Loading...
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentData.length > 0 ? (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {currentData.map((n) => {
                  const card = {
                    id: n.id,
                    user: n.title || 'Notification',
                    desc: n.body || '',
                    time: formatTime(n.createdAt),
                    avatar: n.imageUrl || null,
                    isRead: n.isRead,
                    type: n.type,
                    metadata: n.metadata || {},
                  };
                  return (
                    <NotificationCard
                      key={card.id}
                      card={card}
                      isExpanded={expandedCards.includes(card.id)}
                      onToggle={toggleExpand}
                      onDelete={handleDelete}
                      onRead={handleMarkRead}
                      canSwipe={true}
                      onAccept={handleAccept}
                      onReject={handleReject}
                    />
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center', color: 'whitesmoke' }}
              >
                <p>No notifications</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Notifications;
