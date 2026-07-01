import styles from "./PayPage.module.css";
import back from '../../images/arrow-left.png';
import search from '../../images/search.png'
import userimg from '../../images/user.png'
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { chatApi } from "../../shared/api/chat";
import { useT } from "../../shared/hooks/useT";

const PayTransfer = () => {
    const t = useT();
    const navigate = useNavigate();
     const [cards, setCard] = useState([]);

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
   return(
    <div className={styles.container}>
        <div className={styles.header_cont}>
                            <img src={back} alt="back" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }} />
                            <div className="name"><h1>{t('walletTransferEcho')}</h1></div>
                            <div></div>
        </div>
        <div className={styles.nav}>
                  <div className={styles.searchWrapper}>
                    <img src={search} alt="search" className={styles.searchIcon} />
                    <input type="text" placeholder="Enter username" className={styles.input} />
                  </div>
        </div>
        <div className={styles.cardcont}>
            <p style={{color:'rgb(173, 173, 173)',}}>{t('walletYourContacts')}</p>
{cards.length > 0 ?
            <>
                {cards.map((card, index) => (
                  <div 
                    key={card.id} 
                    className={styles.card} 
                    onClick={() => navigate(`/wallet/transfer/${card.partner.id}`)}
        >
                    <div className={styles.rankBadge}>
                      <img src={card.imageUrl || userimg} alt="no avatar" className={styles.rankImg} style={{color:'white', fontSize:'small',}}/>
                    </div>
        
                    <div className={styles.cardInfo}>
                      <p className={styles.userName}>{card.name || 'no name'}</p>
                      <div >
                        {/* { card.status == 'online' ?

                         <p style={{color: '#00F300'}}>{card.status}</p>
                         :
                        <p style={{color:'rgb(173, 173, 173)'}}>{card.status} hours ago</p>
                        } */}

                      </div>
                    </div>
        
                   
                  </div>
                ))}
            </>
            : <p style={{color:'white', margin:'auto', textAlign:'center',}}>No contacts</p> 

}

        </div>
    </div>
   ) 
}
export default PayTransfer;