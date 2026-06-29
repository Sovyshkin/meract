import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSequelStore } from "../../shared/stores/sequelStore";
import NavBar from "../../shared/ui/NavBar/NavBar";
import styles from "./ActsPage.module.css";
import ActCard from "./components/ActCard";
import Menu from '../Menu/Menu.jsx';

import menu from '../../images/menu.png';
import notification from '../../images/notification.png';
import filter from '../../images/setting.png';
import search from '../../images/search.png';
import { profileApi } from "../../shared/api/profile.js";
import { actApi } from "../../shared/api/act.js";
import { geoApi } from "../../shared/api/geo.js";
import { useAuthStore } from "../../shared/stores/authStore.js";
import { haversineKm, getActTaskCoords } from "../../shared/utils/geo.js";
import { useT } from "../../shared/hooks/useT.js";

export default function MyActsPage() {
  const navigate = useNavigate();
  const t = useT();
  const { clearAll } = useSequelStore();
  const userLocation = useAuthStore((s) => s.location);

  const [acts, setActs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRangeIdx, setSelectedRangeIdx] = useState(-1);
  const [locationRanges, setLocationRanges] = useState([]);
  const [rangesLoading, setRangesLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.removeItem("createActFormState");
    clearAll();
  }, [clearAll]);

  useEffect(() => {
    geoApi.getLocationRanges()
      .then((data) => setLocationRanges(Array.isArray(data) ? data : []))
      .catch(() => setLocationRanges([]))
      .finally(() => setRangesLoading(false));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const profile = await profileApi.getProfile();
        const data = await profileApi.getUserById(profile.id);

        if (data.actIds && data.actIds.length > 0) {
          const actsPromises = data.actIds.map((id) => actApi.getAct(id));
          const loadedActs = await Promise.all(actsPromises);
          setActs(loadedActs);
        } else {
          setActs([]);
        }
      } catch (error) {
        console.error("Ошибка при загрузке данных:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sliderOptions = useMemo(
    () => [...locationRanges, { id: 'all', label: t('all') }],
    [locationRanges, t],
  );
  const allOptionIndex = sliderOptions.length - 1;
  const sliderValue = selectedRangeIdx < 0 ? allOptionIndex : selectedRangeIdx;

  const activeRange =
    selectedRangeIdx >= 0 && locationRanges[selectedRangeIdx]
      ? locationRanges[selectedRangeIdx]
      : null;

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value, 10);
    if (idx === allOptionIndex || locationRanges.length === 0) {
      setSelectedRangeIdx(-1);
    } else {
      setSelectedRangeIdx(idx);
    }
  };

  const filteredActs = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    let list = acts;

    if (query) {
      list = list.filter((act) => {
        const title = act.title ? String(act.title).toLowerCase() : "";
        return title.includes(query);
      });
    }

    if (!activeRange || !userLocation?.latitude || !userLocation?.longitude) {
      return [...list].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    }

    return list
      .filter((act) => {
      const coords = getActTaskCoords(act);
      if (!coords) return true;
      const distanceKm = haversineKm(
        userLocation.latitude,
        userLocation.longitude,
        coords.lat,
        coords.lng,
      );
      return distanceKm >= activeRange.minKm && distanceKm <= activeRange.maxKm;
    })
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }, [searchTerm, acts, activeRange, userLocation]);

  return (
    <div className={styles.container}>
      {isOpen && <Menu onClose={() => setIsOpen(false)} />}

      <div className={styles.actsPage}>
        <div className="header">
          <div className={styles.header_cont}>
            <img src={menu} alt="menu" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }} />
            <div className="name"><h1>{t('myActs')}</h1></div>
            <img src={notification} alt="notification" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer' }} />
          </div>

          <div className="nav">
            <div className={styles.searchWrapper}>
              <img src={search} alt="search" className={styles.searchIcon} />
              <input
                type="text"
                placeholder={t('search')}
                className={styles.input}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <img
                src={filter}
                alt="filter"
                className={styles.filterIcon}
                onClick={() => navigate('/filters')}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        <div className={styles.locationSliderSection}>
          <div className={styles.sliderHeader}>
            <h1 className={styles.sliderTitle}>{t('location')}:</h1>
            <p className={styles.currentLocation}>
              {activeRange ? activeRange.label : t('all')}
            </p>
          </div>

          {rangesLoading ? (
            <p style={{ color: '#888', fontSize: '13px' }}>{t('loadingRanges')}</p>
          ) : locationRanges.length === 0 ? (
            <p style={{ color: '#888', fontSize: '13px' }}>{t('noRangesConfigured')}</p>
          ) : (
            <>
              <div className={styles.customRangeWrapper}>
                <div className={styles.rangeTrack}></div>
                <div
                  className={styles.activeTrack}
                  style={{
                    width: sliderOptions.length <= 1
                      ? '0%'
                      : `${(sliderValue / (sliderOptions.length - 1)) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min="0"
                  max={sliderOptions.length - 1}
                  value={sliderValue}
                  step="1"
                  onChange={handleSliderChange}
                  className={styles.hiddenInput}
                />
              </div>
              <div
                className={styles.locationLabelsRow}
                style={{
                  gridTemplateColumns: `repeat(${Math.max(sliderOptions.length, 1)}, minmax(0, 1fr))`,
                }}
              >
                {sliderOptions.map((r, i) => (
                  <span
                    key={r.id}
                    className={`${styles.locationLabel} ${
                      i === 0
                        ? styles.locationLabelStart
                        : i === sliderOptions.length - 1
                          ? styles.locationLabelEnd
                          : styles.locationLabelCenter
                    } ${(selectedRangeIdx < 0 ? i === allOptionIndex : selectedRangeIdx === i) ? styles.activeLoc : ""}`}
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.contentWrapper}>
          <div className={styles.streamsList}>
            {loading ? (
              <p style={{ color: 'white', textAlign: 'center' }}>{t('loading')}</p>
            ) : filteredActs.length > 0 ? (
              filteredActs.map((act) => (
                <ActCard key={act.id} act={act} titleact={true} />
              ))
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '20px' }}>
                {searchTerm || activeRange ? t('noResults') : t('noActs')}
              </p>
            )}
          </div>
        </div>

        <NavBar />
      </div>
    </div>
  );
}
