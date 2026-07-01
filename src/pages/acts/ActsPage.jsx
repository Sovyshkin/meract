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
import { profileApi } from "../../shared/api/profile.js";
import { useFilterStore } from "../../shared/stores/actsFilters.js";
import api from "../../shared/api/api.js";
import { useNotificationStore } from "../../shared/stores/notificationStore.js";
import { useAuthStore } from "../../shared/stores/authStore.js";
import { useT } from "../../shared/hooks/useT.js";
import { getCategoryTranslationKey } from "../../shared/i18n/categoryKeys.js";

export default function ActsPage() {
  const t = useT();
  const [acts, setActs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [myActIds, setMyActIds] = useState(new Set());

  // Диапазоны расстояний из бэка
  const [locationRanges, setLocationRanges] = useState([]); // [{ id, label, minKm, maxKm, order }]
  const [rangesLoading, setRangesLoading] = useState(true);

  const { clearAll } = useSequelStore();
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const userLocation = useAuthStore((s) => s.location);

  const {
    selectedRangeIdx,
    selectedStatus,
    minRating,
    maxRating,
    setDistanceRange,
  } = useFilterStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await actApi.getAllActs(userLocation);
        setActs(data);
      } catch (error) {
        console.error("Failed to load acts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userLocation]);

  useEffect(() => {
    profileApi.getProfile()
      .then((profile) => profileApi.getUserById(profile.id))
      .then((data) => {
        const ids = Array.isArray(data?.actIds) ? data.actIds : [];
        setMyActIds(new Set(ids.map((id) => Number(id))));
      })
      .catch(() => setMyActIds(new Set()));
  }, []);

  // Load active categories for tabs
  useEffect(() => {
    api.get('/admin/categories')
      .then(res => {
        const cats = Array.isArray(res.data)
          ? res.data.filter((cat) => cat?.isActive === true)
          : [];
        setCategories(cats);
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

  // Slider options: backend ranges + explicit "All" as the rightmost selectable option
  const sliderOptions = useMemo(
    () => [...locationRanges, { id: 'all', label: t('all') }],
    [locationRanges, t],
  );
  const allOptionIndex = sliderOptions.length - 1;
  const sliderValue = selectedRangeIdx < 0 ? allOptionIndex : selectedRangeIdx;

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value);
    if (idx === allOptionIndex || locationRanges.length === 0) {
      setDistanceRange(-1, null, null);
    } else {
      const r = locationRanges[idx];
      setDistanceRange(idx, r.minKm, r.maxKm);
    }
  };

  const searchedActs = useMemo(() => {
    let list = acts;
    const query = searchTerm.toLowerCase().trim();
    if (query) {
      list = list.filter(act => (act.title || act.name || '').toLowerCase().includes(query));
    }
    return list;
  }, [searchTerm, acts]);

  const visibleActs = useMemo(() => {
    if (!activeRange) return searchedActs;
    return searchedActs.filter((act) => {
      if (act.distanceKm == null) return true;
      return act.distanceKm >= activeRange.minKm && act.distanceKm <= activeRange.maxKm;
    });
  }, [searchedActs, activeRange]);

  const filteredByStatusActs = useMemo(() => {
    let list = visibleActs;

    if (selectedStatus === "all") {
      list = visibleActs;
    } else if (selectedStatus === "active") {
      list = visibleActs.filter((act) => act.status === "ONLINE");
    } else if (selectedStatus === "inactive") {
      list = visibleActs.filter((act) => act.status !== "ONLINE");
    }

    return list.filter((act) => {
      if (act.rating == null) return true;
      return act.rating >= minRating && act.rating <= maxRating;
    });
  }, [visibleActs, selectedStatus, minRating, maxRating]);

  const groupedCategories = useMemo(() => {
    const sortNewestFirst = (list) =>
      [...list].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

    const categorizedGroups = categories
      .map((category) => {
        if (category.key === 'my_acts') {
          return {
            ...category,
            acts: sortNewestFirst(
              filteredByStatusActs.filter((act) => myActIds.has(Number(act.id))),
            ),
          };
        }

        return {
          ...category,
          acts: sortNewestFirst(
            filteredByStatusActs.filter((act) => Number(act.categoryId) === Number(category.id)),
          ),
        };
      })
      .filter((group) => group.acts.length > 0);

    const uncategorizedActs = sortNewestFirst(
      filteredByStatusActs.filter((act) => act.categoryId == null),
    );
    if (uncategorizedActs.length > 0) {
      categorizedGroups.push({
        id: 'uncategorized',
        name: t('uncategorized'),
        acts: uncategorizedActs,
      });
    }

    return categorizedGroups;
  }, [categories, filteredByStatusActs, myActIds, t]);

  return (
    <div className={styles.container}>
      {isOpen && <Menu onClose={() => setIsOpen(false)} />}
      
      <div className={styles.actsPage}>
        <div className="header">
          <div className={styles.header_cont}>
            <img src={menu} alt="menu" onClick={() => setIsOpen(!isOpen)} style={{cursor: 'pointer'}} />
            <div className="name"><h1>{t('actHub')}</h1></div>
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
                placeholder={t('search')} 
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
                      : `${(sliderValue / (sliderOptions.length - 1)) * 100}%`
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
              {activeRange && (
                <p style={{ color: '#888', fontSize: '12px', marginTop: '8px', textAlign: 'right' }}>
                  {activeRange.minKm}–{activeRange.maxKm} km
                </p>
              )}
            </>
          )}
        </div>

        <div className={styles.contentWrapper}>
          {groupedCategories.map((group) => (
            <div key={group.id} className={styles.categorySection}>
              <h2 className={styles.categoryTitle}>
                {(() => {
                  const catKey = getCategoryTranslationKey(group);
                  return catKey ? t(catKey) : group.name;
                })()}
              </h2>
              <div className={styles.horizontalScroll}>
                {group.acts.map((act, index) => (
                  <div key={act.id || index} className={styles.horizontalCard}>
                    <ActCard act={act} titleact={true} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {groupedCategories.length === 0 && !loading && (
            <div className="name" style={{ display: 'contents' }}>
              <h1 style={{ textAlign: 'center', marginTop: '20px', opacity: 0.5 }}>
                {searchTerm ? t('noResults') : t('noActs')}
              </h1>
            </div>
          )}
        </div>
        
        <NavBar />
      </div>
    </div>
  );
}
