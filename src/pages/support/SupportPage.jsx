import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SupportPage.module.css";
import back from '../../images/arrow-left.png';
import send from '../../images/send.png';
import { supportApi } from "../../shared/api/support";
import { useAuthStore } from "../../shared/stores/authStore";
import { toast } from "react-toastify";

export default function SupportPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef(null);
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
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) {
      toast.warning("Please fill in all fields");
      return;
    }
    try {
      setCreating(true);
      const ticket = await supportApi.createTicket(newTicketSubject, newTicketMessage);
      setTickets(prev => [ticket, ...prev]);
      setShowNewTicket(false);
      setNewTicketSubject("");
      setNewTicketMessage("");
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'pending':
        return '#F5A623';
      case 'resolved':
      case 'closed':
        return '#00F300';
      case 'rejected':
        return '#E74209';
      default:
        return '#888';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.header_cont}>
            <img src={back} alt="back" onClick={() => navigate('/chats')} style={{ cursor: 'pointer' }} />
            <div className="name"><h1>Support</h1></div>
            <div></div>
          </div>
        </div>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.header_cont}>
          <img src={back} alt="back" onClick={() => navigate('/chats')} style={{ cursor: 'pointer' }} />
          <div className="name"><h1>Support</h1></div>
          <div 
            className={styles.newTicketBtn}
            onClick={() => setShowNewTicket(true)}
          >
            + New
          </div>
        </div>
      </div>

      {showNewTicket && (
        <div className={styles.newTicketModal}>
          <div className={styles.newTicketContent}>
            <h3>Create Support Ticket</h3>
            <input
              type="text"
              placeholder="Subject"
              value={newTicketSubject}
              onChange={(e) => setNewTicketSubject(e.target.value)}
              className={styles.input}
            />
            <textarea
              placeholder="Describe your issue..."
              value={newTicketMessage}
              onChange={(e) => setNewTicketMessage(e.target.value)}
              className={styles.textarea}
              rows={4}
            />
            <div className={styles.modalButtons}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => setShowNewTicket(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.active} 
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
              <div className={styles.emptyState}>
                <span style={{fontSize:'48px'}}>🎫</span>
                <p>No tickets yet</p>
                <p className={styles.emptySubtext}>Create a new ticket to get help</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={styles.ticketCard}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className={styles.ticketHeader}>
                    <span 
                      className={styles.statusBadge}
                      style={{ background: getStatusColor(ticket.status) }}
                    >
                      {ticket.status || 'Open'}
                    </span>
                    <span className={styles.ticketDate}>
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                  <h4 className={styles.ticketSubject}>{ticket.subject}</h4>
                  {ticket.lastMessage && (
                    <p className={styles.ticketPreview}>{ticket.lastMessage}</p>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className={styles.chatView}>
            <div className={styles.chatHeader}>
              <img 
                src={back} 
                alt="back" 
                onClick={() => setSelectedTicket(null)}
                style={{ cursor: 'pointer' }}
              />
              <div className={styles.chatHeaderInfo}>
                <h3>{selectedTicket.subject}</h3>
                <span 
                  className={styles.statusBadge}
                  style={{ background: getStatusColor(selectedTicket.status) }}
                >
                  {selectedTicket.status || 'Open'}
                </span>
              </div>
            </div>

            <div className={styles.messagesArea}>
              {loadingMessages ? (
                <div className={styles.loading}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`${styles.message} ${
                      msg.senderId === user?.id ? styles.myMessage : styles.companionMessage
                    }`}
                  >
                    <div className={styles.messageContent}>
                      <p className={styles.messageText}>{msg.message || msg.text}</p>
                      <span className={styles.messageTime}>
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className={styles.input}
              />
              <img
                src={send}
                alt="Send"
                className={styles.sendBtn}
                onClick={handleSendMessage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}