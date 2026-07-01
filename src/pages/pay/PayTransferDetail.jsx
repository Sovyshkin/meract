import React, { useState } from 'react';
import styles from "./PayPage.module.css";
import back from '../../images/arrow-left.png';
import userimg from '../../images/user.png';
import point from '../../images/Echo.png';

import { useNavigate, useParams } from 'react-router-dom';
import { profileApi } from '../../shared/api/profile';
import { useEffect } from 'react';
import { payApi } from '../../shared/api/pay';
import { useT } from '../../shared/hooks/useT';

const PayTransferDetail = () => {
    const navigate = useNavigate();
    const t = useT();
    const { id } = useParams();
    
    // Состояние для суммы (только целые числа)
    const [amount, setAmount] = useState('');

    // Данные получателя
    const [card, setCard] = useState({});
    useEffect(() => {
            const fetchTransaction = async () => {
                try {
                    const data = await profileApi.getUserById(id);
                    setCard(data);
                    console.log(data)
                } catch (error) {
                    console.error("err:", error);
                } 
            };
            fetchTransaction();
        }, [id]); 

    const handleInputChange = (e) => {
        const value = e.target.value;
        // Регулярное выражение /^\d*$/ пропускает только пустую строку или цифры
        if (/^\d*$/.test(value)) {
            setAmount(value);
        }
    };

    const handleSend = async() => {
        if (!amount || parseInt(amount) === 0) {
            console.log('input summ');
            return;
        }
        const data = {
            sum: parseInt(amount),
            user: card.login,
        }
        await payApi.sendEcho(data)
        console.log(`Sending ${amount} Echo to ${card.user} (ID: ${id})`);
        navigate('/wallet')
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header_cont}>
                <img 
                    src={back} 
                    alt="back" 
                    onClick={() => navigate('/wallet/transfer')} 
                    style={{ cursor: 'pointer' }} 
                />
                <div className="name"><h1>{t('walletTransferEcho')}</h1></div>
                <div style={{ width: '24px' }}></div> 
            </div>

            {/* Recipient Card */}
            <div className={styles.cardcont}>
                <h3 style={{ color: '#fff', marginBottom: '10px' }}>{t('walletRecipient')}</h3>
                <div className={styles.card}>
                    <div className={styles.rankBadge}>
                        <img src={card.avatarUrl || userimg} alt={t('noAvatar')} className={styles.rankImg} style={{color:'white',fontSize:'small',}}/>
                    </div>

                    <div className={styles.cardInfo}>
                        <p className={styles.userName}>{card.fullName || t('companionNoName')}</p>
                        <div>
                            {card.onlineStatus === 'ONLINE' ? (
                                <p style={{ color: '#00F300', fontSize: '14px' }}>{t('online')}</p>
                            ) : (
                                <p style={{ color: 'rgb(164, 164, 164)', fontSize: '14px' }}>{t('offline')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Amount Input Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                <h3 style={{ color: '#fff' }}>{t('walletAmount')}</h3>
                <div className={styles.nav}>
                    <div className={styles.searchWrapper}>
                        <input 
                            type="text" 
                            inputMode="numeric" 
                            placeholder="0" 
                            className={styles.input} 
                            style={{ padding: '15px 15px' }}
                            value={amount}
                            onChange={handleInputChange}
                        />
                        <img 
                            src={point} 
                            alt="currency" 
                            className={styles.filterIcon} 
                        />
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div className={styles.savebutton}>
                <button 
                    className={amount > 0 ? styles.active : styles.disabled} 
                    onClick={handleSend}
                    disabled={!amount || amount === '0'}
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default PayTransferDetail;
