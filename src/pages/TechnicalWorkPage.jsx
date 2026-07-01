import styles from '../../src/features/Auth/forgotPassword/forgot.module.css';
import icon from '../images/technicalwork.png';
import { useT } from '../shared/hooks/useT';

const NotFoundPage = () => {
    const t = useT();
    const time = '1h 5min 45ses';
    return (
        <div className={styles.container}>
            <div style={{ margin: 'auto', color: 'white', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', gap: '10px' }}>
                    <img src={icon} alt="" style={{ margin: 'auto', width: 'fit-content' }} />
                    <h1>{t('technicalWork')}</h1>
                    <p>{t('technicalWorkSorry')} Until the end of the work:</p>
                    <div style={{ background: 'rgb(38, 38, 38)', borderRadius: '8px', width: 'fit-content', padding: '6px 10px', margin: 'auto' }}>
                        <p>{time}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default NotFoundPage;
