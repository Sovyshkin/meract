import notification from '../../images/notification.png';
import styles from "./PayPage.module.css";
import back from '../../images/arrow-left.png';
import zxc from '../../images/newpoint.png';
import copyIcon from '../../images/copy.png'; 
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { payApi } from '../../shared/api/pay';

const PayDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [item, setItem] = useState(null);

    useEffect(() => {
        const fetchTransaction = async () => {
            try {
                const data = await payApi.getOne(id);
                setItem(data);
            } catch (error) {
                console.error("err:", error);
            } 
        };
        fetchTransaction();
    }, [id]); // Добавили id в зависимости

    if (!item) {
        return <div className={styles.container}>Loading...</div>;
    }

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => alert('Copied!'))
            .catch(err => console.error('Error', err));
    };

    // Массив деталей на основе ключей из вашего API объекта
    const details = [
        { label: 'Status:', value: item.status, isStatus: true },
        { label: 'Date & time:', value: item.date },
        { label: 'Transaction ID:', value: item.id, isCopyable: true }, 
        { label: 'Type:', value: item.type },
        { label: 'Sender:', value: item.sender },
    ];

    // Проверяем статус для выбора цвета (Completed или success)
    const isSuccess = item.status === 'Completed' || item.status === 'success';
    // Проверяем, отрицательное ли число, чтобы не дублировать минусы
    const displayAmount = item.amount > 0 ? `+${item.amount}` : item.amount;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.header_cont}>
                    <img src={back} alt="back" onClick={() => window.history.back()} style={{ cursor: 'pointer' }} />
                    <div className={styles.name}><h1>Transaction</h1></div>
                    <img src={notification} alt="notifications" onClick={() => navigate('/notifications')} />
                </div>
            </div>

            <div style={{display:'flex', justifyContent:'center', flexDirection:'column', alignItems:'center', gap:'20px'}}>
                <div className={styles.pointwrap}>
                    <img src={zxc} alt="" style={{width:'60px'}}/>
                </div>
                {/* Цвет меняется в зависимости от того, положительная сумма или отрицательная */}
                <h1 style={{ 
                    color: parseFloat(item.amount) > 0 ? '#00F300' : '#FF4B4B', 
                    fontWeight: 'bold', 
                    marginTop:'2px' 
                }}>
                    {displayAmount}
                </h1>
            </div>

            <div className={styles.parent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {details.map((detail, index) => (
                    <div key={index} className={styles.card} style={{ 
                        background: 'rgba(28, 28, 28, 0.74)', 
                        border: '1px solid #FFFFFF0D',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0 20px',
                        minHeight: '66px'
                    }}>
                        <p className={styles.cardname} style={{ margin: 0 }}>{detail.label}</p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {detail.isStatus ? (
                                <div className={isSuccess ? styles.succes : styles.fail}>
                                    <p style={{ margin: 0 }}>{detail.value}</p>
                                </div>
                            ) : (
                                <div className={styles.itemcard} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <p style={{ margin: 0, color: 'white' }}>{detail.value}</p>
                                    {detail.isCopyable && (
                                        <img 
                                            src={copyIcon} 
                                            alt="copy" 
                                            onClick={() => handleCopy(detail.value)}
                                            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PayDetail;
