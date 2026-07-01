import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImage } from '../../utils/cropImage';
import styles from './AvatarCropModal.module.css';
import { useT } from '../../hooks/useT';

export default function AvatarCropModal({ imageSrc, onCancel, onSave }) {
  const t = useT();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImage(imageSrc, croppedAreaPixels);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await onSave(file);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{t('avatarCropTitle')}</h3>

        <div className={styles.cropArea}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <label className={styles.zoomLabel}>
          {t('avatarCropZoom')}
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className={styles.zoomSlider}
          />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t('avatarCropSaving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
