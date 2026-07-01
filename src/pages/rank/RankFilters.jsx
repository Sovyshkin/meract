import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./RankPage.module.css";
import back from '../../images/arrow-left.png';
import notification from '../../images/notification.png';
import { useT } from '../../shared/hooks/useT';

const RANK_FILTERS_KEY = "rankFilters";

export default function RankFilters() {
  const t = useT();
  const navigate = useNavigate();
  const locationState = useLocation();

  const initialFilters = useMemo(
    () => locationState.state?.rankFilters || {},
    [locationState.state],
  );

  const [sortBy, setSortBy] = useState(initialFilters.sortBy || "points_desc");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [scope, setScope] = useState(initialFilters.scope || "all");
  const [isScopeOpen, setIsScopeOpen] = useState(false);

  const sortOptions = [
    { value: "points_desc", label: t('rankPointsHighLow') },
    { value: "points_asc", label: t('rankPointsLowHigh') },
    { value: "acts_desc", label: "Acts count: high to low" },
    { value: "name_asc", label: "Name: A to Z" },
  ];

  const scopeOptions = [
    { value: "all", label: t('rankAllLeaders') },
    { value: "top10", label: t('rankTop10') },
    { value: "top50", label: t('rankTop50') },
  ];

  const selectedSortLabel =
    sortOptions.find((opt) => opt.value === sortBy)?.label || sortOptions[0].label;
  const selectedScopeLabel =
    scopeOptions.find((opt) => opt.value === scope)?.label || scopeOptions[0].label;

  const save = () => {
    const payload = { sortBy, scope };
    localStorage.setItem(RANK_FILTERS_KEY, JSON.stringify(payload));
    navigate('/rank', { state: { rankFilters: payload } });
  };

  return (
    <div className={styles.container}>
      <div className={styles.actsPage}>
        <div className="header">
          <div className={styles.header_cont}>
            <img src={back} alt="back" onClick={() => window.history.back()} style={{ cursor: 'pointer' }} />
            <div className="name"><h1>{t('rankSortTitle')}</h1></div>
            <img src={notification} alt="notification" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer' }} />
          </div>
        </div>

        <div className={styles.dropparent}>
          <div className={styles.dropdownContainer}>
            <p className={styles.title}>{t('rankSortBy')}</p>
            <div className={styles.dropdownHeader} onClick={() => setIsSortOpen(!isSortOpen)}>
              <span>{selectedSortLabel}</span>
              <svg className={`${styles.arrowIcon} ${isSortOpen ? styles.rotate : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isSortOpen && (
              <div className={styles.dropdownList}>
                {sortOptions.map((opt) => (
                  <div key={opt.value} className={styles.dropdownItem} onClick={() => { setSortBy(opt.value); setIsSortOpen(false); }}>
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.dropdownContainer}>
            <p className={styles.title}>{t('rankScope')}</p>
            <div className={styles.dropdownHeader} onClick={() => setIsScopeOpen(!isScopeOpen)}>
              <span>{selectedScopeLabel}</span>
              <svg className={`${styles.arrowIcon} ${isScopeOpen ? styles.rotate : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isScopeOpen && (
              <div className={styles.dropdownList}>
                {scopeOptions.map((opt) => (
                  <div key={opt.value} className={styles.dropdownItem} onClick={() => { setScope(opt.value); setIsScopeOpen(false); }}>
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.item}>
        <div className={styles.btncont}>
          <button
            className={styles.active}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', marginTop: '20px' }}
            onClick={save}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
