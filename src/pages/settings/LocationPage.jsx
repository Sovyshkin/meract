import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import back from '../../images/arrow-left.png';
import styles from "./SettingsPage.module.css";
import filter from '../../images/add.png'
import search from '../../images/search.png'
import { profileApi } from '../../shared/api/profile';
import { useAuthStore } from '../../shared/stores/authStore';

const LocationPage = () => {
    const navigate = useNavigate();
    const setAuthLocation = useAuthStore((state) => state.setLocation);

    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationPermission, setLocationPermission] = useState('prompt');
    const [isLoading, setIsLoading] = useState(false);

    const languages = [
        { id: 1, label: '🇺🇸 America', name:'america', },
        { id: 2, label: '🇪🇸 Spain', name:'spain', },
    ];

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setLocationPermission(result.state);
                result.addEventListener('change', () => {
                    setLocationPermission(result.state);
                });
            }).catch(() => {
                setLocationPermission('unsupported');
            });
        } else {
            setLocationPermission('unsupported');
        }
    }, []);

    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
            );
            const data = await response.json();
            return {
                city: data.address?.city || data.address?.town || data.address?.village || null,
                country: data.address?.country || null,
            };
        } catch (error) {
            console.error("Reverse geocoding failed:", error);
            return { city: null, country: null };
        }
    };

    const getLocationByIP = async () => {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            return {
                city: data.city,
                country: data.country_name,
                latitude: data.latitude,
                longitude: data.longitude,
            };
        } catch (e) {
            console.error("IP-based location failed:", e);
            return null;
        }
    };

    const saveLocation = async (position) => {
        const { latitude, longitude } = position.coords;
        const locationData = { latitude, longitude };
        setAuthLocation(locationData);
        setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

        const { city, country } = await reverseGeocode(latitude, longitude);

        if (city && country) {
            try {
                await profileApi.setCity(city);
                await profileApi.setCountry(country);
                setCurrentLocation(`${city}, ${country}`);
                alert(`Location saved: ${city}, ${country}`);
            } catch (e) {
                console.error("Failed to save location to backend:", e);
                alert(`Location detected: ${city}, ${country}`);
            }
        } else {
            alert(`Coordinates saved: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocationPermission('granted');
        setIsLoading(false);
    };

    const Save = async () => {
        const ipData = await getLocationByIP();
        if (ipData) {
            try {
                await profileApi.setCity(ipData.city || 'Unknown');
                await profileApi.setCountry(ipData.country || 'Unknown');
                setCurrentLocation(`${ipData.city}, ${ipData.country}`);
                setAuthLocation({ latitude: ipData.latitude, longitude: ipData.longitude });
                alert(`Location saved: ${ipData.city}, ${ipData.country}`);
            } catch (e) {
                setCurrentLocation(`${ipData.city}, ${ipData.country}`);
                alert(`Location: ${ipData.city}, ${ipData.country}`);
            }
            return;
        }

        if (!navigator.geolocation) {
            alert("Geolocation is not supported and IP-based location failed");
            return;
        }

        setIsLoading(true);

        const tryGeolocation = (options, retries = 2) => {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve(position);
                    },
                    (error) => {
                        if (retries > 0 && error.code === error.TIMEOUT) {
                            navigator.geolocation.getCurrentPosition(
                                (pos) => resolve(pos),
                                (err) => reject(err),
                                { ...options, timeout: 30000, maximumAge: 600000 }
                            );
                        } else {
                            reject(error);
                        }
                    },
                    options
                );
            });
        };

        try {
            let position;
            try {
                position = await tryGeolocation({
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }, 2);
            } catch (highAccuracyError) {
                try {
                    position = await tryGeolocation({
                        enableHighAccuracy: false,
                        timeout: 20000,
                        maximumAge: 300000
                    }, 2);
                } catch (lowAccuracyError) {
                    const ipData = await getLocationByIP();
                    if (ipData) {
                        try {
                            await profileApi.setCity(ipData.city || 'Unknown');
                            await profileApi.setCountry(ipData.country || 'Unknown');
                            setCurrentLocation(`${ipData.city}, ${ipData.country}`);
                            alert(`Location saved (IP-based): ${ipData.city}, ${ipData.country}`);
                        } catch (e) {
                            setCurrentLocation(`${ipData.city}, ${ipData.country}`);
                            alert(`Location (IP-based): ${ipData.city}, ${ipData.country}`);
                        }
                        setIsLoading(false);
                        return;
                    }
                    throw lowAccuracyError;
                }
            }
            await saveLocation(position);
        } catch (error) {
            setIsLoading(false);
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    setLocationPermission('denied');
                    alert("Location access denied. Please enable it in browser settings.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    alert("Location information unavailable.");
                    break;
                case error.TIMEOUT:
                    alert("Location request timed out.");
                    break;
                default:
                    alert("Failed to get location. Please try again.");
            }
        }
    };

    const getPermissionStatus = () => {
        switch (locationPermission) {
            case 'granted':
                return { text: 'Allowed', color: '#00F300' };
            case 'denied':
                return { text: 'Denied', color: '#E74209' };
            case 'prompt':
                return { text: 'Not requested', color: '#F5A623' };
            default:
                return { text: 'Not supported', color: '#888' };
        }
    };

    const status = getPermissionStatus();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                    <div className={styles.header_cont}>
                      <img
                        src={back}
                        alt="menu"
                        onClick={() => navigate('/settings/profile')}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className={styles.name}>
                        <div className="name"><h1>Location</h1></div>
                      </div>
                      <div></div>
                    </div>
                     <div >

                     </div>
                    <div className={styles.nav}>
                      <div className={styles.searchWrapper}>
                        <img src={search} alt="search" className={styles.searchIcon} />
                        <input type="text" placeholder="Search" className={styles.input} />
                        <img
                          src={filter}
                          alt="filter"
                          className={styles.filterIcon}
                          onClick={() => navigate('/chat-create')}
                        />
                      </div>
                    </div>
                  </div>

            <div className={styles.cardwrapmain}>
                <div className={styles.card} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <p className={styles.subtitle}>Browser permission status:</p>
                    <p className={styles.userName} style={{ color: status.color }}>{status.text}</p>
                    {currentLocation && (
                        <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0 0' }}>
                            Current: {currentLocation}
                        </p>
                    )}
                </div>

                {languages.map((item) => (
                    <div
                        key={item.id}
                        className={styles.cardcont}
                        onClick={() => navigate(`/settings/location/${item.name}`)}
                    >
                        <div className={styles.card}>
                            <div className={styles.cardInfo}>
                                <p className={styles.userName}>{item.label}</p>
                            </div>

                            <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                                        <polyline points="9 18 15 12 9 6"></polyline>
                                                    </svg>
                        </div>
                    </div>
                ))}
            </div>
            <div className={styles.savebutton}>
                <button
                    className={styles.active}
                    onClick={Save}
                    disabled={isLoading || locationPermission === 'denied' || locationPermission === 'unsupported'}
                >
                    {isLoading ? 'Getting location...' : 'Allow access to geodata'}
                </button>
            </div>
        </div>
    );
};

export default LocationPage;