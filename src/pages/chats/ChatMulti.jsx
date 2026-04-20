import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './ChatPage.module.css';
import EmojiPicker from 'emoji-picker-react';

// Изображения
import back from '../../images/arrow-left.png';
import guildMenu from '../../images/guildmenu.png';
import userimg from '../../images/user.png';
import sendIcon from '../../images/send.png';
import microphone from '../../images/microphone.png';
import trashIcon from '../../images/trash1.png';
import notificationIcon from '../../images/notification.png';
import filebutton from '../../images/filebutton.png'; 
import emoji from '../../images/emoji.png'; 
import share from '../../images/share.png';
import undo from '../../images/undo.png';
import eye from '../../images/eye.png';
import gallery from '../../images/gallery.png';

import { chatApi } from '../../shared/api/chat';
import { useAuthStore } from '../../shared/stores/authStore';
import { profileApi } from '../../shared/api/profile';

const ChatMulti = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const currentUser = useAuthStore((state) => state.user);
  
  // Состояния
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const [card, setUser] = useState({});
  const [isOwner, setIsOwner] = useState(false);
  // Меню
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMediaMenuOpen, setIsMediaMenuOpen] = useState(false);
  
  // Эмодзи
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  
  // Запись голоса
  const [mode, setMode] = useState('send'); 
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  // Файлы
  const fileInputRef = useRef(null);
  
  // Fullscreen медиа
  const [fullScreenMedia, setFullScreenMedia] = useState(null); 
  const [showControls, setShowControls] = useState(true); 
  const [currentMessageId, setCurrentMessageId] = useState(null);

  // Закрытие эмодзи-пикера при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Форматирование сообщения для отображения
  const formatMessage = (msg) => {
    // Проверяем, удалено ли сообщение
    if (msg.isDeleted) {
      return '<span style="color: #888; font-style: italic; font-size: 0.9em;">❌ Message deleted</span>';
    }
    
    if (msg.fileUrl && msg.fileType) {
      if (msg.fileType === 'image') {
        return `<img src="${msg.fileUrl}" style="max-width:200px; border-radius:10px" />`;
      } else if (msg.fileType === 'video') {
        return `<video src="${msg.fileUrl}" controls style="max-width:200px" />`;
      } else if (msg.fileType === 'audio' || msg.fileType === 'voice') {
        return `<audio src="${msg.fileUrl}" controls style="max-width:200px" />`;
      } else {
        return `📎 <a href="${msg.fileUrl}" target="_blank">File</a>`;
      }
    }
    return msg.text || '';
  };

  // Загрузка данных чата
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const [response, chatInfo, userData] = await Promise.all([
          chatApi.getMessages(id),
          chatApi.getAll(),
          profileApi.getProfile(),
        ]);

        console.log('getMessages response:', response);
        console.log(chatInfo)
        // Нормализуем сообщения
        let allMessages = [];
        if (response?.messages) {
          allMessages = response.messages.map(msg => ({
            ...msg,
            displayText: formatMessage(msg),
            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
        }

        setMessages(allMessages);

        if (Array.isArray(chatInfo)) {
          const profiledata = chatInfo.find(chat => String(chat.id) === String(id));
          if(profiledata.creatorId == userData.id) setIsOwner(true)
          if (profiledata) setUser(profiledata);
        }
        
        console.log('Все данные чата:', allMessages);
      } catch (error) {
        console.error('Ошибка при загрузке данных чата:', error);
        setMessages([]);
      }
    };

    if (id) { 
      fetchChatData();
    }
  }, [id]);

  // Закрытие меню при клике вне
  useEffect(() => {
    const closeMenu = () => setIsMenuOpen(false);
    if (isMenuOpen) {
      window.addEventListener('click', closeMenu);
    }
    return () => window.removeEventListener('click', closeMenu);
  }, [isMenuOpen]);

  // Отправка сообщения
  const pushMessage = async (content, file = null) => {
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Генерируем временный ID для оптимистичного сообщения
    const tempId = `temp-${Date.now()}`;
    
    // Оптимистичное отображение
    const optimisticMessage = { 
      id: tempId, 
      displayText: content, 
      sender: { id: currentUser?.id },
      time: timeStr,
      isOptimistic: true
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    
    // Отправка на сервер
    try {
      if (file) {
        await chatApi.sendMessage(id, null, null, null, file);
      } else {
        await chatApi.sendMessage(id, content);
      }
      
      // Не обновляем сразу - даем время серверу обработать
      // Сообщение обновится при следующем fetch
      
    } catch (error) {
      console.error("Ошибка при отправке:", error);
      // Удаляем оптимистичное сообщение при ошибке
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    }
  };

  // Отправка текста
  const sendText = () => {
    if (!text.trim()) return;
    pushMessage(text);
    setText('');
  };

  // Добавление эмодзи в текст
  const onEmojiClick = (emojiObject) => {
    setText((prevText) => prevText + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // Запись голоса
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      mediaRecorder.current = new MediaRecorder(stream);
      setIsRecording(true);

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };
      
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const audioFile = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        await pushMessage(`<audio controls src="${url}" style="max-width:200px"></audio>`, audioFile);
        
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setMode('send');
      };

      mediaRecorder.current.start();
    } catch (err) {
      console.error("Доступ к микрофону запрещен", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
    }
  };

  // Обработка кнопки отправки/записи
  const handleActionDown = () => {
    if (text.trim()) {
      sendText();
    } else if (mode === 'send') {
      setMode('mic');
    } else {
      startRecording();
    }
  };

  const handleActionUp = () => {
    if (mode === 'mic' && isRecording) {
      stopRecording();
    }
  };

  // Отправка по Enter
  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  // Выбор файла
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('Selected file:', file.name, file.type, file.size);

    const fileUrl = URL.createObjectURL(file);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    let content = '';
    if (isImage) {
      content = `<img src="${fileUrl}" style="max-width:200px; border-radius:10px" />`;
    } else if (isVideo) {
      content = `<video src="${fileUrl}" controls style="max-width:200px" />`;
    } else if (isAudio) {
      content = `<audio src="${fileUrl}" controls style="max-width:200px" />`;
    } else {
      content = `📎 ${file.name}`;
    }

    await pushMessage(content, file);
    e.target.value = '';
  };

  // Функции для работы с медиа
 const saveToGallery = async () => {
  if (!fullScreenMedia?.src) return;
  
  try {
    // Создаем ссылку для скачивания
    const link = document.createElement('a');
    link.href = fullScreenMedia.src;
    link.download = fullScreenMedia.src.split('/').pop() || 'media';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Добавляем в DOM и кликаем
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsMediaMenuOpen(false);
    
    // Показываем уведомление
    alert('Download started. Check your downloads folder.');
    
  } catch (error) {
    console.error('Error saving to gallery:', error);
    // Если не работает, просто открываем в новой вкладке
    window.open(fullScreenMedia.src, '_blank');
  }
};

  const showInChat = () => {
    setFullScreenMedia(null);
    setIsMediaMenuOpen(false);
    
    const messageElement = document.getElementById(`message-${currentMessageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.style.transition = 'background 0.5s';
      messageElement.style.background = 'rgba(0, 147, 255, 0.3)';
      setTimeout(() => {
        messageElement.style.background = '';
      }, 1000);
    }
  };

  const replyToMessage = () => {
    console.log('Reply to message:', currentMessageId);
    setText(`↪️ Replying to message... `);
    setFullScreenMedia(null);
    setIsMediaMenuOpen(false);
  };

  const deleteMessage = async () => {
    if (!currentMessageId) return;
    
    try {
      await chatApi.deleteMessage(currentMessageId);
      
      // Обновляем сообщение в списке, помечая как удаленное
      setMessages(prev => prev.map(msg => 
        msg.id === currentMessageId 
          ? { 
              ...msg, 
              isDeleted: true, 
              displayText: '<span style="color: #888; font-style: italic; font-size: 0.9em;">❌ Message deleted</span>',
              fileUrl: null,
              fileType: null,
              text: null
            } 
          : msg
      ));
      
      setFullScreenMedia(null);
      setIsMediaMenuOpen(false);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Открыть медиа на весь экран
  const openFullScreenMedia = (msg) => {
    // Не открываем удаленные сообщения
    if (msg.isDeleted) return;
    
    let src = null;
    let isVideo = false;
    
    if (msg.fileUrl) {
      src = msg.fileUrl;
      isVideo = msg.fileType === 'video';
    } else {
      const hasImg = msg.displayText?.includes('<img');
      const hasVideo = msg.displayText?.includes('<video');
      
      if (hasImg || hasVideo) {
        const match = msg.displayText?.match(/src="([^"]+)"/);
        src = match ? match[1] : null;
        isVideo = hasVideo;
      }
    }

    if (src) {
      setCurrentMessageId(msg.id);
      setFullScreenMedia({
        src: src,
        isVideo: isVideo,
        time: msg.time,
        senderName: msg.sender?.id === currentUser?.id ? 'You' : (card.login || 'User')
      });
      setShowControls(true);
    }
  };
  const deleteChat = async() => {
    await chatApi.deleteChat(id);
    navigate('/chats')
  }
  const muteChat = async() => {
    await chatApi.muteChat(id);
    setIsMenuOpen(false);
  }
  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header} style={{ borderBottom: '1px solid #FFFFFF0D', paddingBottom: '15px' }}>
        <div className={styles.header_cont}>
          <img 
            src={back} 
            alt="back" 
            onClick={() => navigate(-1)} 
            style={{ cursor: 'pointer' }} 
          />
        
          <div 
            className={styles.userClickArea}
            // onClick={() => navigate(`/profile/${id}/${userId}`)}
          >
            <div className={styles.rankBadge}>
              <img src={card.imageUrl || userimg} alt="avatar" className={styles.rankImg} />
            </div>
            <div className={styles.cardInfo}>
              <p className={styles.userName}>{card.name || 'Group'}</p>
              <p style={{ color: '#bbb', fontSize: '12px', margin: 0 }}>
                {card.membersCount === 1 
                    ? `${card.membersCount} member` 
                    : `${card.membersCount} members`
                }

              </p>
            </div>
          </div>

          <div className={styles.menuContainer}>
            <img 
              src={guildMenu} 
              alt="menu" 
              style={{ cursor: 'pointer' }} 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }} 
            />
            {isMenuOpen && (
              <div className={styles.menuDropdown} onClick={(e) => e.stopPropagation()}>
                <div className={styles.dpopitem}>
                  <img src={notificationIcon} alt="" />
                  <span onClick={() => muteChat()}>Turn off notifications</span>
                </div>
                <div className={styles.dpopitem}>
                  <img src={trashIcon} alt="" />
                  <span onClick={() => deleteChat()}>
                    {isOwner 
                    ?  <p>Delete group</p>
                    :  <p>Leave group</p>
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MESSAGES BODY */}
      <div className={styles.chatBody}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            id={`message-${msg.id}`}
            className={`${styles.chatMsg} ${
              msg.sender?.id === currentUser?.id ? styles.myMessage : styles.companionMessage
            } ${msg.isOptimistic ? styles.optimistic : ''} ${msg.isDeleted ? styles.deletedMessage : ''}`}
            onClick={() => openFullScreenMedia(msg)}
          >
            {msg.sender?.id !== currentUser?.id && (
              <span className={styles.senderName}>{msg.sender?.login || msg.sender?.email || 'User'}</span>
            )}
            <p className={styles.msgText} dangerouslySetInnerHTML={{ __html: msg.displayText || '' }} />
            <span className={styles.msgTime}>{msg.time}</span>
          </div>
        ))}
      </div>

      {/* INPUT AREA */}
      <div className={styles.inputArea}>
        <div className={styles.searchWrapper}>
          <div style={{display: 'contents' }} ref={emojiPickerRef}>
            <img 
              src={emoji} 
              alt="emoji" 
              className={styles.emojiIcon} 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{ cursor: 'pointer' }}
            />
            
            {showEmojiPicker && (
              <div style={{ position: 'absolute', bottom: '40px', left: '0', zIndex: 1000 }}>
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="Message..."
            className={styles.input}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim() && mode === 'mic') setMode('send');
            }}
            onKeyDown={handleKey}
          />
          
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*,video/*,audio/*,application/pdf" 
            onChange={handleFileChange}
          />
          
          <div className={styles.rightIcons}>
            <img 
              src={filebutton} 
              alt="file" 
              className={styles.filebutton} 
              onClick={() => fileInputRef.current?.click()} 
              style={{ cursor: 'pointer' }}
            />
            <img
              src={mode === 'send' ? sendIcon : microphone}
              alt="action"
              className={`${styles.filterIcon} ${isRecording ? styles.recordingActive : ''}`}
              onMouseDown={handleActionDown}
              onMouseUp={handleActionUp}
              onMouseLeave={handleActionUp}
              onTouchStart={handleActionDown}
              onTouchEnd={handleActionUp}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* FULLSCREEN MEDIA */}
      {fullScreenMedia && (
        <div className={styles.mediaOverlay} onClick={() => setShowControls(!showControls)}>
          <div className={`${styles.mediaHeader} ${showControls ? styles.visible : styles.hidden}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mediaHeaderLeft}>
              <img 
                src={back} 
                alt="back" 
                onClick={() => setFullScreenMedia(null)} 
                className={styles.mediaBack} 
              />
              <div className={styles.mediaUserInfo}>
                <span className={styles.mediaUserName}>{fullScreenMedia.senderName}</span>
                <span className={styles.mediaTime}>in {fullScreenMedia.time}</span>
              </div>
            </div>
            
            <div className={styles.mediaHeaderRight}>
              <img 
                src={guildMenu} 
                alt="more" 
                onClick={() => setIsMediaMenuOpen(!isMediaMenuOpen)} 
                className={styles.mediaMore}
              />
              
              {isMediaMenuOpen && (
                <div className={styles.mediaDropdown}>
                  <div className={styles.mediaDropItem} onClick={saveToGallery}>
                    <img src={gallery} alt="" />
                    <span>Save to gallery</span>
                  </div>
                  <div className={styles.mediaDropItem} onClick={showInChat}>
                    <img src={eye} alt="" />
                    <span>Show in chat</span>
                  </div>
                  <div className={styles.mediaDropItem} onClick={replyToMessage}>
                    <img src={undo} alt="" />
                    <span>Reply to</span>
                  </div>
                  <div className={styles.mediaDropItem} onClick={deleteMessage}>
                    <img src={trashIcon} alt="" />
                    <span>Delete</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.mediaWrapper} onClick={(e) => e.stopPropagation()}>
            {fullScreenMedia.isVideo ? (
              <video src={fullScreenMedia.src} controls autoPlay className={styles.mediaMain} />
            ) : (
              <img src={fullScreenMedia.src} alt="full" className={styles.mediaMain} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMulti;