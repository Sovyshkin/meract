import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ActsPage.module.css";
import back from '../../images/arrow-left.png';
import notification from '../../images/notification.png';
import { useFilterStore } from '../../shared/stores/actsFilters';
import { LANGUAGES, getLanguageLabel } from '../../shared/constants/languages';
import { useT } from '../../shared/hooks/useT';

export default function ActsFilters() {
  const navigate = useNavigate();
  const store = useFilterStore();
  const t = useT();

  const minGap = 1.0;
  const maxValue = 10.0;
  const minVal = 0;
  const range = maxValue - minVal;
  const [localFilters, setLocalFilters] = useState({
    actType: store.actType,
    heroMethod: store.heroMethod,
    navMethod: store.navMethod,
    selectedLang: store.selectedLang,
    selectedDistance: store.selectedDistance,
    selectedStatus: store.selectedStatus,
    minRating: store.minRating ?? 1.0,
    maxRating: store.maxRating ?? 10.0,
  });

  const [sliderMin, setSliderMin] = useState(localFilters.minRating);
  const [sliderMax, setSliderMax] = useState(localFilters.maxRating);

  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [isOpen3, setIsOpen3] = useState(false);

  const langOptions = LANGUAGES;
  const distanceOptions = ["1km", "10km"];
  const statusOptions = [
    { value: "all", label: t('statusAll') },
    { value: "active", label: t('statusActive') },
    { value: "inactive", label: t('statusInactive') },
  ];

  const handleSliderOne = (e) => {
    const value = parseFloat(e.target.value);
    let newValue;
    if (sliderMax - value <= minGap) {
      newValue = parseFloat((sliderMax - minGap).toFixed(1));
    } else {
      newValue = value;
    }
    setSliderMin(newValue);
    updateLocal('minRating', newValue);
  };

  const handleSliderTwo = (e) => {
    const value = parseFloat(e.target.value);
    let newValue;
    if (value - sliderMin <= minGap) {
      newValue = parseFloat((sliderMin + minGap).toFixed(1));
    } else {
      newValue = value;
    }
    setSliderMax(newValue);
    updateLocal('maxRating', newValue);
  };

  const updateLocal = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const Save = () => {
    store.setActType(localFilters.actType);
    store.setHeroMethod(localFilters.heroMethod);
    store.setNavMethod(localFilters.navMethod);
    store.setSelectedLang(localFilters.selectedLang);
    store.setSelectedDistance(localFilters.selectedDistance);
    store.setSelectedStatus(localFilters.selectedStatus);
    if (store.setMinRating) store.setMinRating(localFilters.minRating);
    if (store.setMaxRating) store.setMaxRating(localFilters.maxRating);

    navigate('/acts');
  };

  const statusLabel =
    statusOptions.find((opt) => opt.value === localFilters.selectedStatus)?.label
    || localFilters.selectedStatus;

  return (
    <div className={styles.container}>
      <div className={styles.actsPage}>
        <div className="header">
          <div className={styles.header_cont}>
            <img src={back} alt="back" onClick={() => window.history.back()} style={{ cursor: 'pointer' }} />
            <div className="name"><h1>{t('filters')}</h1></div>
            <img src={notification} alt="notification" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer' }} />
          </div>
        </div>

        <div className={styles.parent}>
          <div className={styles.locationSliderSection}>
            <div className={styles.sliderHeader}>
              <h1 className={styles.sliderTitle}>{t('rating')}:</h1>
              <p className={styles.currentLocation}>
                {Number(sliderMin).toFixed(1)} - {Number(sliderMax).toFixed(1)}
              </p>
            </div>

            <div className={styles.customRangeWrapper}>
              <div className={styles.rangeTrack}></div>
              <div
                className={styles.activeTrack}
                style={{
                  left: `${((sliderMin - minVal) / range) * 100}%`,
                  width: `${((sliderMax - sliderMin) / range) * 100}%`,
                }}
              />
              <input
                type="range"
                min="0"
                max={maxValue}
                step="0.1"
                value={sliderMin}
                onChange={handleSliderOne}
                className={`${styles.hiddenInput} ${styles.rangeInputMin}`}
              />
              <input
                type="range"
                min="0"
                max={maxValue}
                step="0.1"
                value={sliderMax}
                onChange={handleSliderTwo}
                className={`${styles.hiddenInput} ${styles.rangeInputMax}`}
              />
            </div>
            <div className={styles.sliderValuesRow}>
              <span>{Number(sliderMin).toFixed(1)}</span>
              <span>{Number(sliderMax).toFixed(1)}</span>
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>{t('language')}</p>
            <div className={styles.dropdownContainer}>
              <div className={styles.dropdownHeader} onClick={() => setIsOpen1(!isOpen1)}>
                <span>{getLanguageLabel(localFilters.selectedLang)}</span>
                <svg className={`${styles.arrowIcon} ${isOpen1 ? styles.rotate : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {isOpen1 && (
                <div className={styles.dropdownList}>
                  {langOptions.map((opt) => (
                    <div key={opt.value} className={styles.dropdownItem} onClick={() => { updateLocal('selectedLang', opt.value); setIsOpen1(false); }}>
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>{t('proximity')}</p>
            <div className={styles.dropdownContainer}>
              <div className={styles.dropdownHeader} onClick={() => setIsOpen2(!isOpen2)}>
                <span>{localFilters.selectedDistance}</span>
                <svg className={`${styles.arrowIcon} ${isOpen2 ? styles.rotate : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {isOpen2 && (
                <div className={styles.dropdownList}>
                  {distanceOptions.map((opt) => (
                    <div key={opt} className={styles.dropdownItem} onClick={() => { updateLocal('selectedDistance', opt); setIsOpen2(false); }}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>{t('actStatus')}</p>
            <div className={styles.dropdownContainer}>
              <div className={styles.dropdownHeader} onClick={() => setIsOpen3(!isOpen3)}>
                <span>{statusLabel}</span>
                <svg className={`${styles.arrowIcon} ${isOpen3 ? styles.rotate : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {isOpen3 && (
                <div className={styles.dropdownList}>
                  {statusOptions.map((opt) => (
                    <div key={opt.value} className={styles.dropdownItem} onClick={() => { updateLocal('selectedStatus', opt.value); setIsOpen3(false); }}>
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>{t('actType')}</p>
            <div className={styles.btncont}>
              <button className={localFilters.actType === 0 ? styles.active : ""} onClick={() => updateLocal('actType', 0)}>{t('singleHero')}</button>
              <button className={localFilters.actType === 1 ? styles.active : ""} onClick={() => updateLocal('actType', 1)}>{t('multiHero')}</button>
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>{t('heroSelectionMethods')}</p>
            <div className={styles.btncont}>
              <button className={localFilters.heroMethod === 0 ? styles.active : ""} onClick={() => updateLocal('heroMethod', 0)}>{t('voting')}</button>
              <button className={localFilters.heroMethod === 1 ? styles.active : ""} onClick={() => updateLocal('heroMethod', 1)}>{t('bidding')}</button>
              <button className={localFilters.heroMethod === 2 ? styles.active : ""} onClick={() => updateLocal('heroMethod', 2)}>{t('manual')}</button>
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>{t('navigatorSelectionMethods')}</p>
            <div className={styles.btncont}>
              <button className={localFilters.navMethod === 0 ? styles.active : ""} onClick={() => updateLocal('navMethod', 0)}>{t('voting')}</button>
              <button className={localFilters.navMethod === 1 ? styles.active : ""} onClick={() => updateLocal('navMethod', 1)}>{t('bidding')}</button>
              <button className={localFilters.navMethod === 2 ? styles.active : ""} onClick={() => updateLocal('navMethod', 2)}>{t('manual')}</button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.savebutton}>
        <button className={styles.active} onClick={Save}>{t('save')}</button>
      </div>
    </div>
  );
}
