import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSequelStore } from "../../shared/stores/sequelStore";
import NavBar from "../../shared/ui/NavBar/NavBar";
import styles from "./ActsPage.module.css";
import ActCard from "./components/ActCard";
import menu from '../../images/menu.png';
import notification from '../../images/notification.png';
import filter from '../../images/setting.png';
import search from '../../images/search.png';
import Menu from '../Menu/Menu.jsx';

import { actApi } from "../../shared/api/act.js";
import { geoApi } from "../../shared/api/geo.js";
import { useFilterStore } from "../../shared/stores/actsFilters.js";

export default function ActsPage() {
  const [acts, setActs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Диапазоны расстояний из бэка
  const [locationRanges, setLocationRanges] = useState([]); // [{ id, label, minKm, maxKm, order }]
  const [rangesLoading, setRangesLoading] = useState(true);

  const { clearAll } = useSequelStore();
  const navigate = useNavigate();

  const { selectedRangeIdx, minDistanceKm, maxDistanceKm, setDistanceRange } = useFilterStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await actApi.getAllActs();
        setActs(data);
      } catch (error) {
        console.error("Ошибка при загрузке актов:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    geoApi.getLocationRanges()
      .then(data => setLocationRanges(Array.isArray(data) ? data : []))
      .catch(() => setLocationRanges([]))
      .finally(() => setRangesLoading(false));
  }, []); 

  useEffect(() => {
    localStorage.removeItem("createActFormState");
    clearAll();
  }, [clearAll]);

  // Текущий выбранный диапазон (или null = все)
  const activeRange = selectedRangeIdx >= 0 && locationRanges[selectedRangeIdx]
    ? locationRanges[selectedRangeIdx]
    : null;

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value);
    if (idx < 0 || locationRanges.length === 0) {
      setDistanceRange(-1, null, null);
    } else {
      const r = locationRanges[idx];
      setDistanceRange(idx, r.minKm, r.maxKm);
    }
  };

  const filteredActs = useMemo(() => {
    let list = acts;
    const query = searchTerm.toLowerCase().trim();
    if (query) {
      list = list.filter(act => (act.title || act.name || '').toLowerCase().includes(query));
    }
    return list;
  }, [searchTerm, acts]);

  // Разбиваем по distanceKm: с расстоянием и без
  const { inRange, noDistance } = useMemo(() => {
    if (!activeRange) {
      // Нет фильтра — все акты в основном списке
      return { inRange: filteredActs, noDistance: [] };
    }
    const withDist = filteredActs.filter(a => a.distanceKm != null);
    const noDist = filteredActs.filter(a => a.distanceKm == null);
    const ranged = withDist.filter(
      a => a.distanceKm >= activeRange.minKm && a.distanceKm <= activeRange.maxKm
    );
    return { inRange: ranged, noDistance: noDist };
  }, [filteredActs, activeRange]);

  return (
    <div className={styles.container}>
      {isOpen && <Menu onClose={() => setIsOpen(false)} />}
      
      <div className={styles.actsPage}>
        <div className="header">
          <div className={styles.header_cont}>
            <img src={menu} alt="menu" onClick={() => setIsOpen(!isOpen)} style={{cursor: 'pointer'}} />
            <div className="name"><h1>ACT Hub</h1></div>
            <img src={notification} alt="notification" onClick={() => navigate('/notifications')} style={{cursor: 'pointer'}} />
          </div>
          <div className="nav">
            <div className={styles.searchWrapper}>
              <img src={search} alt="search" className={styles.searchIcon} />
              {/* 3. Привязка инпута к поиску */}
              <input 
                type="text" 
                placeholder="Search" 
                className={styles.input} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <img src={filter} alt="filter" className={styles.filterIcon} onClick={() => navigate('/filters')} style={{cursor: 'pointer'}} />
            </div>
          </div>
        </div>

        {/* Слайдер локаций по диапазонам из бэка */}
        <div className={styles.locationSliderSection}>
          <div className={styles.sliderHeader}>
            <h1 className={styles.sliderTitle}>Location:</h1>
            <p className={styles.currentLocation}>
              {activeRange ? activeRange.label : 'All'}
            </p>
          </div>

          {rangesLoading ? (
            <p style={{ color: '#888', fontSize: '13px' }}>Loading ranges…</p>
          ) : locationRanges.length === 0 ? (
            <p style={{ color: '#888', fontSize: '13px' }}>No ranges configured</p>
          ) : (
            <>
              <div className={styles.customRangeWrapper}>
                <div className={styles.rangeTrack}></div>
                <div
                  className={styles.activeTrack}
                  style={{
                    width: selectedRangeIdx < 0
                      ? '0%'
                      : `${((selectedRangeIdx + 1) / locationRanges.length) * 100}%`
                  }}
                />
                {/* Метки диапазонов */}
                {locationRanges.map((r, i) => (
                  <div
                    key={r.id}
                    style={{
                      position: 'absolute',
                      left: `${(i / (locationRanges.length - 1 || 1)) * 100}%`,
                      transform: 'translateX(-50%)',
                      top: '28px',
                      fontSize: '10px',
                      color: selectedRangeIdx === i ? '#3264fe' : '#888',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}
                  >
                    {r.label}
                  </div>
                ))}

                <input
                  type="range"
                  min="-1"
                  max={locationRanges.length - 1}
                  value={selectedRangeIdx}
                  step="1"
                  onChange={handleSliderChange}
                  className={styles.hiddenInput}
                />
              </div>
              {activeRange && (
                <p style={{ color: '#888', fontSize: '12px', marginTop: '36px', textAlign: 'right' }}>
                  {activeRange.minKm}–{activeRange.maxKm} km
                </p>
              )}
            </>
          )}
        </div>

        {/* CONTENT */}
        <div className={styles.contentWrapper}>
          <div className={styles.streamsList}>
            {inRange.map((act, index) => (
              <ActCard key={act.id || index} act={act} titleact={true} />
            ))}
          </div>

          {/* Акты без расстояния (только когда фильтр активен) */}
          {activeRange && noDistance.length > 0 && (
            <>
              <p style={{ color: '#888', fontSize: '13px', marginTop: '20px', marginBottom: '8px' }}>
                Without distance data
              </p>
              <div className={styles.streamsList}>
                {noDistance.map((act, index) => (
                  <ActCard key={`nd-${act.id || index}`} act={act} titleact={true} />
                ))}
              </div>
            </>
          )}

          {inRange.length === 0 && noDistance.length === 0 && !loading && (
            <div className="name" style={{ display: 'contents' }}>
              <h1 style={{ textAlign: 'center', marginTop: '20px', opacity: 0.5 }}>
                {searchTerm ? "No results found" : "No acts"}
              </h1>
            </div>
          )}
        </div>
        
        <NavBar />
      </div>
    </div>
  );
}
