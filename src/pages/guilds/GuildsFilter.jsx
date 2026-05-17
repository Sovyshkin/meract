import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./../acts/ActsPage.module.css";
import back from '../../images/arrow-left.png';
import notification from '../../images/notification.png';

export default function GuildsFilters() {
  const navigate = useNavigate();

  const [actType, setActType] = useState(1);
  const [streamFormat, setStreamFormat] = useState(1);
  const [heroMethod, setHeroMethod] = useState(1);
  const [navMethod, setNavMethod] = useState(1);

  const [time1, setTime1] = useState("5 min");
  const [isOpen1, setIsOpen1] = useState(false);
  const [time2, setTime2] = useState("5 min");
  const [isOpen2, setIsOpen2] = useState(false);

  const timeOptions = ["5 min", "10 min", "15 min"];

  const Save = () => {
    console.log({ actType, streamFormat, heroMethod, navMethod, time1, time2 });
    navigate('/guild');
  };

  return (
    <div className={styles.container}>
      <div className={styles.actsPage}>
        <div className="header">
          <div className={styles.header_cont}>
            <img src={back} alt="back" onClick={() => window.history.back()} style={{ cursor: 'pointer' }} />
            <div className="name"><h1>Filters</h1></div>
            <img src={notification} alt="notification" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer' }} />
          </div>
        </div>

        <div className={styles.parent}>
          <div className={styles.item}>
            <p className={styles.title}>Act type</p>
            <div className={styles.btncont}>
              <button className={actType === 0 ? styles.active : ""} onClick={() => setActType(0)}>Single hero</button>
              <button className={actType === 1 ? styles.active : ""} onClick={() => setActType(1)}>Multi hero</button>
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>Stream format</p>
            <div className={styles.btncont}>
              <button className={streamFormat === 0 ? styles.active : ""} onClick={() => setStreamFormat(0)}>Single</button>
              <button className={streamFormat === 1 ? styles.active : ""} onClick={() => setStreamFormat(1)}>Several feed</button>
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>Hero Selection Methods</p>
            <div className={styles.btncont}>
              <button className={heroMethod === 0 ? styles.active : ""} onClick={() => setHeroMethod(0)}>Voting</button>
              <button className={heroMethod === 1 ? styles.active : ""} onClick={() => setHeroMethod(1)}>Bidding</button>
              <button className={heroMethod === 2 ? styles.active : ""} onClick={() => setHeroMethod(2)}>Manual</button>
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>Navigator Selection Methods</p>
            <div className={styles.btncont}>
              <button className={navMethod === 0 ? styles.active : ""} onClick={() => setNavMethod(0)}>Voting</button>
              <button className={navMethod === 1 ? styles.active : ""} onClick={() => setNavMethod(1)}>Bidding</button>
              <button className={navMethod === 2 ? styles.active : ""} onClick={() => setNavMethod(2)}>Manual</button>
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>Stream Duration</p>
            <div className={styles.dropdownContainer}>
              <div className={styles.dropdownHeader} onClick={() => setIsOpen1(!isOpen1)}>
                <span>{time1}</span>
                <svg className={`${styles.arrowIcon} ${isOpen1 ? styles.rotate : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {isOpen1 && (
                <div className={styles.dropdownList}>
                  {timeOptions.map((opt) => (
                    <div key={opt} className={styles.dropdownItem} onClick={() => { setTime1(opt); setIsOpen1(false); }}>{opt}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.item}>
            <p className={styles.title}>Notification Interval</p>
            <div className={styles.dropdownContainer}>
              <div className={styles.dropdownHeader} onClick={() => setIsOpen2(!isOpen2)}>
                <span>{time2}</span>
                <svg className={`${styles.arrowIcon} ${isOpen2 ? styles.rotate : ""}`} width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {isOpen2 && (
                <div className={styles.dropdownList}>
                  {timeOptions.map((opt) => (
                    <div key={opt} className={styles.dropdownItem} onClick={() => { setTime2(opt); setIsOpen2(false); }}>{opt}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Исправленный блок кнопки сохранения */}
      <div className={styles.savebutton}>
        <button className={styles.active} onClick={Save}>
          Save
        </button>
      </div>
    </div>
  );
}
