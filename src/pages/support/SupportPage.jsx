import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SupportPage.module.css";
import backImg from '../../images/arrow-left.png';
import sendImg from '../../images/send.png';
import supportIcon from '../../images/notification.png';
import emojiIcon from '../../images/emoji.png';
import fileIcon from '../../images/filebutton.png';
import { supportApi } from "../../shared/api/support";
import { useAuthStore } from "../../shared/stores/authStore";
import { toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react";

export default function SupportPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    document.body.classList.add('no-overlay');
    return () => document.body.classList.remove('no-overlay');
  }, []);

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = isAdmin
        ? await supportApi.getAllTickets()
        : await supportApi.getMyTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load tickets:", error);
      toast.error("Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId) => {
    try {
      setLoadingMessages(true);
      const data = await supportApi.getTicketMessages(ticketId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load messages:", error);
      toast.error("Failed to load messages");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.warning("Please fill in all fields");
      return;
    }
    try {
      setCreating(true);
      const ticket = await supportApi.createTicket(subject, body);
      setTickets(prev => [ticket, ...prev]);
      setShowModal(false);
      setSubject("");
      setBody("");
      setSelectedTicket(ticket);
      toast.success("Ticket created!");
    } catch (error) {
      console.error("Failed to create ticket:", error);
      toast.error("Failed to create ticket");
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      const message = await supportApi.sendTicketMessage(selectedTicket.id, newMessage);
      setMessages(prev => [...prev, message]);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket) return;

    try {
      const message = await supportApi.sendTicketMessage(selectedTicket.id, null, file);
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error("Failed to send file:", error);
      toast.error("Failed to send file");
    }
    e.target.value = "";
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'pending':
        return { background: '#F5A623', color: '#000' };
      case 'resolved':
      case 'closed':
        return { background: '#00F300', color: '#000' };
      case 'rejected':
        return { background: '#E74209', color: '#fff' };
      default:
        return { background: 'rgba(255, 255, 255, 0.2)', color: '#fff' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (msg, index) => {
    const isMine = msg.user?.id === user?.id || msg.user?.id === user?.sub;
    const isAdmin = msg.user?.isadmin === true;
    const hasMedia = msg.fileUrl && msg.fileType;
    const text = msg.message || msg.text || '';
    const apiUrl = import.meta.env.VITE_API_URL.replace('/api', '');

    return (
      <div
        key={msg.id || index}
        className={`${styles.msg} ${isMine ? styles.msgMine : styles.msgOther}`}
      >
        {hasMedia && (
          <div className={styles.mediaContainer}>
            {msg.fileType === 'image' && (
              <img
                src={`${apiUrl}${msg.fileUrl}`}
                alt=""
                className={styles.mediaImage}
              />
            )}
            {msg.fileType === 'video' && (
              <video
                src={`${apiUrl}${msg.fileUrl}`}
                controls
                className={styles.mediaVideo}
              />
            )}
            {msg.fileType === 'audio' && (
              <audio
                src={`${apiUrl}${msg.fileUrl}`}
                controls
                className={styles.mediaAudio}
              />
            )}
            {(msg.fileType === 'file' || !msg.fileType) && (
              <a
                href={`${apiUrl}${msg.fileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.fileAttachment}
              >
                📎 File
              </a>
            )}
          </div>
        )}
        {text && !text.startsWith('[File:') && text !== 'File attachment' && (
          <p className={styles.msgText}>{text}</p>
        )}
        <span className={styles.msgTime}>{formatDate(msg.createdAt)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <button className={styles.backBtn} onClick={() => navigate('/chats')}>
              <img src={backImg} alt="back" />
            </button>
            <h1 className={styles.title}>Support</h1>
            <div style={{ width: 50 }} />
          </div>
        </header>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button
            className={styles.backBtn}
            onClick={() => selectedTicket ? setSelectedTicket(null) : navigate('/chats')}
          >
            <img src={backImg} alt="back" />
          </button>
          <h1 className={styles.title}>
            {selectedTicket ? (selectedTicket.title || selectedTicket.subject) : 'Support'}
          </h1>
          {!selectedTicket && (
            <button className={styles.newBtn} onClick={() => setShowModal(true)}>
              + New
            </button>
          )}
          {selectedTicket && <div style={{ width: 50 }} />}
        </div>
      </header>

      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Create Ticket</h3>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={styles.modalInput}
            />
            <textarea
              placeholder="Describe your issue in detail..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={styles.modalTextarea}
            />
            <div className={styles.modalBtns}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleCreateTicket}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {!selectedTicket ? (
          <div className={styles.ticketList}>
            {tickets.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🎫</div>
                <p className={styles.emptyText}>No tickets yet</p>
                <p className={styles.emptySubtext}>Create a new ticket to get help</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={styles.ticketCard}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className={styles.ticketIcon}>
                    <img src={supportIcon} alt="support" />
                  </div>
                  <div className={styles.ticketInfo}>
                    <div className={styles.ticketTop}>
                      <span className={styles.status} style={getStatusStyle(ticket.status)}>
                        {ticket.status || 'Open'}
                      </span>
                      <span className={styles.date}>{formatDate(ticket.createdAt)}</span>
                    </div>
                    <h4 className={styles.ticketSubject}>{ticket.title || ticket.subject}</h4>
                    {ticket.lastMessage && (
                      <p className={styles.ticketPreview}>{ticket.lastMessage}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className={styles.chatView}>
            <div className={styles.messages}>
              {loadingMessages ? (
                <div className={styles.loading}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>💬</div>
                  <p className={styles.emptyText}>No messages yet</p>
                  <p className={styles.emptySubtext}>Start the conversation</p>
                </div>
              ) : (
                messages.map(renderMessage)
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <div className={styles.searchWrapper} ref={emojiPickerRef}>
                <img
                  src={emojiIcon}
                  alt="emoji"
                  className={styles.emojiIcon}
                  onClick={() => setShowEmoji(!showEmoji)}
                />
                {showEmoji && (
                  <div className={styles.emojiPickerWrapper}>
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Message..."
                  className={styles.input}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
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
                    src={fileIcon}
                    alt="file"
                    className={styles.filebutton}
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <img
                    src={sendImg}
                    alt="send"
                    className={styles.sendMsgBtn}
                    onClick={handleSendMessage}
                    style={{ opacity: newMessage.trim() ? 1 : 0.5 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
