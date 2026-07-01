import notification from '../../images/notification.png'
import styles from "./PayPage.module.css";
import back from '../../images/arrow-left.png';
import point from '../../images/Echo.png';
import redpoint from '../../images/redpoint.png';
import newpoint from '../../images/newpoint.png';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { payApi } from '../../shared/api/pay';
import { useT } from '../../shared/hooks/useT';

const PayPage = () => {
    const t = useT();
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    
    // const cards = [
    //     { id: 1, type: 'Purchase Echo', desc: 'meract shop', value: 1000, date: '25/02/26' },
    //     { id: 2, type: 'Purchase Echo', desc: 'meract shop', value: 1000, date: '25/02/26' },
    //     { id: 3, type: 'Purchase Echo', desc: 'meract shop', value: 1000, date: '20/02/26' },
    // ];
    const [cards, setCards] = useState([]);

    useEffect(() => {
        const fetchUserRanks = async () => {
          try {
            const data = await payApi.getAll();
            console.log(data)
            setBalance(data.balance)
            setCards(data.data)
          } catch (error) {
            console.error(error);
          } 
        };
        fetchUserRanks();
      }, []);

    const groupedCards = cards.reduce((acc, card) => {
        if (!acc[card.date]) {
            acc[card.date] = [];
        }
        acc[card.date].push(card);
        return acc;
    }, {});


    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img 
                        src={back} 
                        alt="back" 
                        onClick={() => window.history.back()} 
                        style={{ cursor: 'pointer' }} 
                    />
                    <div className={styles.name}>
                        <div className="name"><h1>{t('walletTitle')}</h1></div>
                    </div>
                    <img src={notification} alt="notifications" onClick={() => navigate('/notifications')}/>
                </div>
            </div>

            <div className={styles.card} style={{flexDirection:'column', gap:'20px', alignItems:"flex-start",}}>
                <div style={{display: 'flex', flexDirection:'column', gap:'5px',}}>
                    <p style={{color:'#FFFFFF66',}}>{t('walletBalance')}</p>
                    <div style={{display:'flex', gap:'5px',}}>
                        <img src={newpoint} alt="" style={{maxHeight:'40px',}}/>
                        <h1 style={{color:'white',}}>{balance}</h1>
                    </div>
                </div>
                <div className={styles.btncont}>
                    <button className={styles.active} onClick={() => navigate('/wallet/shop')}>
                        Buy
                        <img src={newpoint} alt="" style={{maxHeight:'40px',}}/>

                    </button>
                    <button onClick={() => navigate('/wallet/transfer')}>{t('walletTransfer')}</button>
                </div>
            </div>

            <div className={styles.parent}>
                <p style={{color:'white', fontWeight:'500', fontSize:'21px', marginBottom: '15px'}}>
                    Transaction history
                </p>
                {cards.length > 0 ?
                <>
                {Object.keys(groupedCards).map((date) => (
                    <div key={date} className={styles.dateGroup}>
                        <p style={{ color: '#bbbbbb', fontSize: '14px', margin: '10px 0' }}>{date}</p>
                        
                        {groupedCards[date].map((item) => (
                            <div key={item.id} 
                            className={styles.card}
                             style={{ marginBottom: '10px' }}
                        onClick={() => navigate(`/wallet/${item.id}`)} 

                             >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center',  }}
                                
                                >
                                    <div style={{display:'flex', flexDirection:'column', gap:'5px',}}>
                                        <p style={{ color: 'white', margin: 0 }}>{item.type}</p>
                                        <p style={{ color: '#FFFFFF66', fontSize: '14px', margin: 0 }}>{item.counterpart}</p>
                                    </div>
                                    <div className={styles.flex}>
                                        {item.amount[0] == '-' ?
                                        <>
                                        <p style={{ color: '#E74209', fontWeight: 'bold', marginTop:'2px', }}>{item.amount}</p>
                                        <img src={redpoint} alt="" />
                                        
                                        </>
                                        :
                                        <>
                                        <p style={{ color: '#00F300', fontWeight: 'bold', marginTop:'2px', }}>{item.amount}</p>
                                        <img src={point} alt="" />
                                        </>
                                        
                                        }

                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                </>
                : <p style={{color:'white', margin:'auto', textAlign:'center',}}>{t('walletNoTransactions')}</p>  
                }

            </div>
        </div> 
    );
}

export default PayPage;
