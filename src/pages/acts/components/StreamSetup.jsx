import React, { useState, useRef, useEffect } from 'react';
import styles from './StreamSetup.module.css';
import cameraIcon from '../../../images/points.png';
import microphoneIcon from '../../../images/microphone.png';
import closeIcon from '../../../images/Close.png';
import { useT } from '../../../shared/hooks/useT';

const StreamSetup = ({ onStartStream, onClose }) => {
  const t = useT();
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef(null);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream, audioStream]);

  // Включение/выключение камеры
  const toggleCamera = async () => {
    if (!isCameraEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setVideoStream(stream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        setIsCameraEnabled(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Failed to access camera');
      }
    } else {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
      setIsCameraEnabled(false);
    }
  };

  // Включение/выключение микрофона
  const toggleMicrophone = async () => {
    if (!isMicEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
        setIsMicEnabled(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Failed to access microphone');
      }
    } else {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      setIsMicEnabled(false);
    }
  };

  // Начало стрима
  const handleStartStream = async () => {
    setIsLoading(true);
    
    // Передаем настройки в основной компонент
    await onStartStream({
      camera: isCameraEnabled,
      microphone: isMicEnabled,
      videoStream,
      audioStream
    });
    
    setIsLoading(false);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Stream Setup</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <img src={closeIcon} alt="Close" />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            Включайте микрофон и помогайте навигатору достичь цели, направляя его.
          </p>

          {/* Превью камеры */}
          <div className={styles.previewContainer}>
            {isCameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={styles.preview}
              />
            ) : (
              <div className={styles.previewPlaceholder}>
                <p>Camera is off</p>
              </div>
            )}
          </div>

          {/* Кнопки управления */}
          <div className={styles.controls}>
            <button
              className={`${styles.controlButton} ${isCameraEnabled ? styles.active : ''}`}
              onClick={toggleCamera}
            >
              <img src={cameraIcon} alt="Camera" />
              <span>{isCameraEnabled ? 'Camera On' : 'Camera Off'}</span>
            </button>

            <button
              className={`${styles.controlButton} ${isMicEnabled ? styles.active : ''}`}
              onClick={toggleMicrophone}
            >
              <img src={microphoneIcon} alt="Microphone" />
              <span>{isMicEnabled ? 'Microphone On' : 'Microphone Off'}</span>
            </button>
          </div>

          {/* Счетчик (20) из скриншота */}
          <div className={styles.counter}>
            <span className={styles.counterNumber}>20</span>
            <span className={styles.counterLabel}>viewers waiting</span>
          </div>

          {/* Кнопка начала стрима */}
          <button
            className={styles.startButton}
            onClick={handleStartStream}
            disabled={isLoading || (!isCameraEnabled && !isMicEnabled)}
          >
            {isLoading ? t('starting') : 'Start Stream'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StreamSetup;