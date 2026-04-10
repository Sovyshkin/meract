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
import api from "../../shared/api/api.js";
import { useNotificationStore } from "../../shared/stores/notificationStore.js";

export default function ActsPage() {
  const [acts, setActs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Категории из админки
  const [categories, setCategories] = useState([]);
  const [categoryActs, setCategoryActs] = useState({}); // { [categoryId]: Act[] }

  // Диапазоны расстояний из бэка
  const [locationRanges, setLocationRanges] = useState([]); // [{ id, label, minKm, maxKm, order }]
  const [rangesLoading, setRangesLoading] = useState(true);

  const { clearAll } = useSequelStore();
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

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

  // Загрузка категорий и актов по каждой категории
  useEffect(() => {
    api.get('/admin/categories')
      .then(res => {
        const cats = Array.isArray(res.data) ? res.data : [];
        setCategories(cats);
        // Загружаем акты для каждой категории
        cats.forEach(cat => {
          api.get(`/admin/categories/${cat.id}/acts`)
            .then(r => {
              const actsData = r.data?.Act || r.data?.acts || [];
              setCategoryActs(prev => ({ ...prev, [cat.id]: actsData }));
            })
            .catch(() => {});
        });
      })
      .catch(() => {});
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
      return { inRange: filteredActs, noDistance: [] };
    }
    const withDist = filteredActs.filter(a => a.distanceKm != null);
    const noDist = filteredActs.filter(a => a.distanceKm == null);
    const ranged = withDist.filter(
      a => a.distanceKm >= activeRange.minKm && a.distanceKm <= activeRange.maxKm
    );
    return { inRange: ranged, noDistance: noDist };
  }, [filteredActs, activeRange]);

  // Фильтрация актов по категориям с учётом поиска
  const filteredCategoryActs = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return categoryActs;
    const result = {};
    Object.entries(categoryActs).forEach(([catId, catActsList]) => {
      result[catId] = catActsList.filter(a => (a.title || a.name || '').toLowerCase().includes(query));
    });
    return result;
  }, [categoryActs, searchTerm]);

  // Есть ли хоть одна категория с актами
  const hasCategoryContent = categories.some(c => (filteredCategoryActs[c.id] || []).length > 0);

  return (
    <div className={styles.container}>
      {isOpen && <Menu onClose={() => setIsOpen(false)} />}
      
      <div className={styles.actsPage}>
        <div className="header">
          <div className={styles.header_cont}>
            <img src={menu} alt="menu" onClick={() => setIsOpen(!isOpen)} style={{cursor: 'pointer'}} />
            <div className="name"><h1>ACT Hub</h1></div>
            <div
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => navigate('/notifications')}
            >
              <img src={notification} alt="notification" />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#FF3B30',
                  color: 'white',
                  borderRadius: '50%',
                  minWidth: 16,
                  height: 16,
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  boxSizing: 'border-box',
                  lineHeight: 1,
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
          <div className="nav">
            <div className={styles.searchWrapper}>
              <img src={search} alt="search" className={styles.searchIcon} />
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
                {locationRanges.map((r, i) => (
                  <div
                    key={r.id}
                    style={{
                      position: 'absolute',
                      left: `${(i / (locationRanges.length - 1 || 1)) * 100}%`,
                      transform: 'translateX(-50%)',
                      top: '24px',
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
                <p style={{ color: '#888', fontSize: '12px', marginTop: '32px', textAlign: 'right' }}>
                  {activeRange.minKm}–{activeRange.maxKm} km
                </p>
              )}
            </>
          )}
        </div>

        {/* КАТЕГОРИИ с горизонтальной прокруткой */}
        {hasCategoryContent && (
          <div className={styles.contentWrapper}>
            {categories.map(cat => {
              const catActsList = filteredCategoryActs[cat.id] || [];
              if (catActsList.length === 0) return null;
              return (
                <div key={cat.id} className={styles.categorySection}>
                  <h2 className={styles.categoryTitle}>{cat.name}</h2>
                  <div className={styles.horizontalScroll}>
                    {catActsList.map((act, index) => (
                      <div key={act.id || index} className={styles.horizontalCard}>
                        <ActCard act={act} titleact={true} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CONTENT — акты без категорий / фильтр по расстоянию */}
        <div className={styles.contentWrapper}>
          <div className={styles.streamsList}>
            {inRange.map((act, index) => (
              <ActCard key={act.id || index} act={act} titleact={true} />
            ))}
          </div>

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

          {inRange.length === 0 && noDistance.length === 0 && !hasCategoryContent && !loading && (
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
