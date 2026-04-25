import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from './TechnicalSupport.module.css';
import arrowLeft from '../../images/arrow-left.png';
import notification from '../../images/notification.png';
import add from '../../images/add.png';

const TechnicalSupport = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const evidenceInputRef = useRef(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const [evidences, setEvidences] = useState([]);

    // Обработка добавления новой карточки в список
    const handleAddEvidence = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newEvidence = {
                    id: Date.now(), // Уникальный ключ
                    src: reader.result,
                    type: file.type.startsWith('video') ? 'video' : 'image'
                };
                setEvidences(prev => [...prev, newEvidence]);
            };
            reader.readAsDataURL(file);
        }
        // Сбрасываем значение инпута, чтобы можно было выбрать тот же файл повторно
        e.target.value = '';
    };

    // Удаление карточки из списка
    const removeEvidence = (id) => {
        setEvidences(prev => prev.filter(item => item.id !== id));
    };

    const Save = () => {
        console.log('Saving data:', { name, description, avatar, evidences });
        navigate(`/guilds/${id}`);
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.backButton} onClick={() => navigate(`/acts`)}>
                    <img src={arrowLeft} alt="Back" className={styles.backIcon} />
                </div>
                <h1>Technical support</h1>
                <img src={notification} alt="Notification" onClick={() => navigate('/notifications')}/>
            </div>

            <div className={styles.content}>
                <div className={styles.paragraph}>
                    <h3 className={styles.elsetitle}>Basic information</h3>
                    <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <textarea
                        className={styles.textareaField}
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className={styles.paragraph}>
                    <h4 className={styles.elsetitle}>Photo/Video</h4>
                </div>

                {evidences.map((item) => (
                    <div key={item.id} className={styles.paragraph}>
                        <div className={styles.guildImgContainer}>
                            {item.type === 'video' ? (
                                <video src={item.src} className={styles.guildimg} controls />
                            ) : (
                                <img src={item.src} alt="Evidence" className={styles.guildimg} />
                            )}
                        </div>
                        <button className={styles.deleteButton} onClick={() => removeEvidence(item.id)}>
                            Delete
                        </button>
                    </div>
                ))}

                <div className={styles.paragraph}>
                    <div
                        className={styles.guildImgContainer}
                        onClick={() => evidenceInputRef.current.click()}
                        style={{ maxHeight: '50px', cursor: 'pointer' }}
                    >
                        <div className={styles.emptyPlaceholder} style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                            <p>add photo/video evidence</p>
                            <img src={add} alt="Add icon" />
                        </div>
                    </div>
                    <input
                        type="file"
                        hidden
                        ref={evidenceInputRef}
                        onChange={handleAddEvidence}
                        accept="image/*,video/*"
                    />
                </div>

                <div className={styles.paragraph}>
                    <button className={styles.savebutton} onClick={Save}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TechnicalSupport;
