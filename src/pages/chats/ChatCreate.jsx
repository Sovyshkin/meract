import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ChatPage.module.css";
import back from '../../images/arrow-left.png';
import plus from '../../images/add.png';
import yes from '../../images/yes.png';
import userimg from '../../images/user.png'; // Добавьте этот импорт

import { useRef } from "react";
import { chatApi } from "../../shared/api/chat";

export default function ChatCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const avatarInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [cards, setCard] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]); // Массив выбранных участников

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const data = await chatApi.getAll();
        const filterdata = data.filter(card => card.type == 'direct');
        setCard(filterdata);
        console.log(data)
      } catch (error) {
        console.error("err:", error);
      } 
    };
    fetchTransaction();
  }, []); 

  // Функция для добавления/удаления участника
  const toggleMember = (member) => {
    setSelectedMembers(prev => {
      // Проверяем, есть ли уже такой участник в массиве
      const isSelected = prev.some(m => m.id === member.id);
      
      if (isSelected) {
        // Если уже выбран - удаляем
        return prev.filter(m => m.id !== member.id);
      } else {
        // Если не выбран - добавляем
        return [...prev, member];
      }
    });
  };

  const Save = async() => {
    const memberIds = selectedMembers.map(member => member.id);
    
    const imageFile = avatarInputRef.current?.files[0] || null;
    
    await chatApi.createChatGroup(name, memberIds, imageFile, null);
    navigate('/chats');
};

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.actsPage}>
        <div className="header">
          <div className={styles.header_cont}>
            <img src={back} alt="back" onClick={() => window.history.back()} style={{cursor: 'pointer'}}/>
            <div className="name"><h1>New chat</h1></div>
            <div></div>
          </div>
        </div>

        <div className={styles.dropparent}>
          <input 
            type="text" 
            className={styles.inputField} 
            placeholder="Name chat" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        
        <div className={styles.dropparent}>
          <h4 className={styles.elsetitle}>Avatar chat</h4>

          <div 
            className={styles.guildImgContainer} 
            onClick={() => !avatar && avatarInputRef.current.click()}
          >
            {avatar ? (
              <img src={avatar} alt="" className={styles.guildimg}/>
            ) : (
              <>
                <div style={{display:'flex',justifyContent:'space-between', alignItems:'center',width:'100%', padding:'0px 20px 0px 10px'}}>
                  <div className={styles.emptyPlaceholder}>Add photo</div>
                  <img src={plus} alt="" />
                </div>
              </>
            )}
          </div>
          
          <input 
            type="file" 
            hidden 
            ref={avatarInputRef} 
            onChange={(e) => handleFileChange(e, setAvatar)} 
            accept="image/*"
          />
          {avatar && <button className={styles.delete} onClick={() => setAvatar(null)}>Delete</button>}
        </div>
        
        <button 
          className={styles.active} 
          style={{ width: '100%', justifyContent: 'space-between', display: 'flex', marginTop: '20px', padding:'16px 20px', maxWidth:'420px' }}
          onClick={() => setIsOpen(!isOpen)}
        >
          Add members {selectedMembers.length > 0 && `(${selectedMembers.length})`}
          <img src={plus} alt="" />
        </button>
        
        {isOpen &&
          <div className={styles.cardcont} style={{marginTop:'10px'}}>
            <p style={{color:'rgb(173, 173, 173)'}}>Your contacts</p>
            {cards.length > 0 ?
              <>
                {cards.map((card) => {
                  const isSelected = selectedMembers.some(m => m.id === card.id);
                  return (
                    <div 
                      key={card.id} 
                      className={`${styles.card} ${isSelected ? styles.selected : ''}`} 
                      onClick={() => toggleMember(card)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.rankBadge}>
                        <img 
                          src={card.imageUrl || userimg} 
                          alt="no avatar" 
                          className={styles.rankImg} 
                          style={{color:'white', fontSize:'small'}}
                        />
                      </div>
          
                      <div className={styles.cardInfo}>
                        <p className={styles.userName}>{card.name || 'no name'}</p>
                      </div>
                      
                      {isSelected && <img src={yes} alt="selected" />}
                    </div>
                  );
                })}
              </>
              : <p style={{color:'white', margin:'auto', textAlign:'center'}}>No contacts</p> 
            }
          </div>
        }
      </div>
      
      <div className={styles.item}>
        <div className={styles.btncont}>
          <button 
            className={styles.active} 
            style={{ width: '100%', justifyContent: 'center', display: 'flex', marginTop: '20px', maxWidth:'420px'}}
            onClick={Save}
            disabled={selectedMembers.length === 0 || !name || !avatar} 
          >
            Create a chat 
          </button>
        </div>
      </div>
    </div>
  );
}