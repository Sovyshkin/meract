import styles from '../../src/features/Auth/forgotPassword/forgot.module.css';
import { useT } from '../shared/hooks/useT';

const NotFoundPage = () => {
    const t = useT();
    return (
        <div className={styles.container}>
            <div style={{ margin: 'auto', color: 'white', textAlign: 'center' }}>
                <h1 style={{ fontSize: '52px' }}>404</h1>
                <p>{t('notFound')}</p>
            </div>
        </div>
    );
};
export default NotFoundPage;
