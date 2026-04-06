// TeamDetail.jsx (полная версия с заданиями)
import arrowLeft from '../../images/arrow-left.png';
import team from '../../images/teamhero.png';
import teamicon from '../../images/icon1.png';
import points from '../../images/points.png';
import styles from "./CreateAct.module.css";
import trash from '../../images/trash.png';
import navigator from '../../images/compas.png';
import { toast } from 'react-toastify';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import agent from '../../images/agent.png';
import useTeamStore from '../../shared/stores/teamStore';
import { profileApi } from '../../shared/api/profile';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons for Vite/webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

const TeamDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const processedMemberRef = useRef(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskFormData, setTaskFormData] = useState({ id: null, description: '', address: '', lat: null, lng: null });
    const [gettingLocation, setGettingLocation] = useState(false);
    
    const { 
        heroes, 
        navigators, 
        agents, 
        teamName,
        currentTeamId,
        heroMethod,
        navigatorMethod,
        agentMethod,
        heroVotingStartTime,
        heroVotingStartDate,
        heroVotingHours,
        navigatorVotingStartTime,
        navigatorVotingStartDate,
        navigatorVotingHours,
        agentVotingStartTime,
        agentVotingStartDate,
        agentVotingHours,
        setTeamName,
        setHeroMethod,
        setNavigatorMethod,
        setAgentMethod,
        setHeroVotingTime,
        setHeroVotingDate,
        setHeroVotingHours,
        setNavigatorVotingTime,
        setNavigatorVotingDate,
        setNavigatorVotingHours,
        setAgentVotingTime,
        setAgentVotingDate,
        setAgentVotingHours,
        addHero,
        addNavigator,
        addAgent,
        removeMember,
        tasks,
        addTask,
        removeTask,
        updateTask,
        saveCurrentTeam,
        deleteTeam,
        resetCurrentTeam,
        getTeamById
    } = useTeamStore();

    const isEditingExistingTeam = currentTeamId && getTeamById(currentTeamId);

    useEffect(() => {
        const fetchUserAndAdd = async () => {
            if (location.state?.selectedMember) {
                const { selectedMember } = location.state;
                
                if (processedMemberRef.current === selectedMember.id) {
                    navigate('/team', { replace: true, state: {} });
                    return;
                }
                
                processedMemberRef.current = selectedMember.id;
                
                try {
                    const user = await profileApi.getUserById(selectedMember.id);
                    
                    const isDuplicate = () => {
                        switch(selectedMember.type) {
                            case 'hero':
                                return heroes.some(h => h.id === selectedMember.id);
                            case 'navigator':
                                return navigators.some(n => n.id === selectedMember.id);
                            case 'agent':
                                return agents.some(a => a.id === selectedMember.id);
                            default:
                                return false;
                        }
                    };

                    if (isDuplicate()) {
                        toast.warning(`This ${selectedMember.type} has already been added!`);
                    } else {
                        const newMember = {
                            id: selectedMember.id,
                            img: selectedMember.img || selectedMember.imageUrl || teamicon, 
                            name: selectedMember.name,
                            points: user.points || '1000'
                        };

                        switch(selectedMember.type) {
                            case 'hero':
                                addHero(newMember);
                                toast.success(`✅ Hero ${selectedMember.name} added successfully!`);
                                break;
                            case 'navigator':
                                addNavigator(newMember);
                                toast.success(`🧭 Navigator ${selectedMember.name} added successfully!`);
                                break;
                            case 'agent':
                                addAgent(newMember);
                                toast.success(`🕵️ Agent ${selectedMember.name} added successfully!`);
                                break;
                        }
                    }
                    
                    navigate('/team', { replace: true, state: {} });
                    
                } catch (error) {
                    console.error('err:', error);
                    toast.error('❌ Failed to add member. Please try again.');
                    navigate('/team', { replace: true, state: {} });
                } finally {
                    setTimeout(() => {
                        processedMemberRef.current = null;
                    }, 500);
                }
            }
        };

        fetchUserAndAdd();
    }, [location.state, addHero, addNavigator, addAgent, navigate, heroes, navigators, agents]);

    const handleSave = () => {
        const savedTeam = saveCurrentTeam();
        
        if (savedTeam) {
            toast.success(`Team "${savedTeam.name}" saved successfully!`);
            navigate('/create-act');
        }
    };

    const openAddTask = () => {
        setTaskFormData({ id: null, description: '', address: '', lat: null, lng: null });
        setShowTaskForm(true);
    };

    const openEditTask = (task) => {
        setTaskFormData({ ...task });
        setShowTaskForm(true);
    };

    const handleTaskMapPick = (lat, lng) => {
        setTaskFormData(prev => ({ ...prev, lat, lng }));
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setTaskFormData(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
                setGettingLocation(false);
            },
            () => {
                toast.error('Could not get your location');
                setGettingLocation(false);
            }
        );
    };

    const handleSaveTask = () => {
        if (!taskFormData.description.trim()) {
            toast.error('Task description is required');
            return;
        }
        if (taskFormData.id) {
            updateTask(taskFormData.id, {
                description: taskFormData.description,
                address: taskFormData.address,
                lat: taskFormData.lat,
                lng: taskFormData.lng,
            });
            toast.success('Task updated');
        } else {
            addTask({
                id: Date.now().toString(),
                description: taskFormData.description,
                address: taskFormData.address,
                lat: taskFormData.lat,
                lng: taskFormData.lng,
            });
            toast.success('Task added');
        }
        setShowTaskForm(false);
    };

    const handleDelete = () => {
        if (currentTeamId) {
            setShowDeleteConfirm(true);
        }
    };

    const confirmDelete = () => {
        if (currentTeamId) {
            deleteTeam(currentTeamId);
            toast.success('Team deleted successfully!');
            setShowDeleteConfirm(false);
            navigate('/create-act');
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    const handleBack = () => {
        resetCurrentTeam();
        navigate('/create-act');
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.backButton} onClick={handleBack}>
                    <img src={arrowLeft} alt="Back" className={styles.backIcon} />
                </div>
                <h1>Team</h1>
                <div></div>
            </div>
            
            <div className={styles.paragraph}>
                <input 
                    type="text" 
                    className={styles.inputField} 
                    placeholder="Team Name" 
                    value={teamName} 
                    onChange={(e) => setTeamName(e.target.value)}
                />
            </div>

            {/* Heroes Section */}
            <h4 className={styles.elsetitle}>Invite a hero</h4>
            <p style={{color:'rgb(192, 192, 192)'}}>Indicate the possible heroes for whom the audience will vote.</p>

            {/* Hero Method Selector */}
            <div style={{display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap'}}>
                {[
                    { value: 'fixed', label: 'Fixed' },
                    { value: 'voting_candidates', label: 'Voting (my candidates)' },
                    { value: 'open_voting', label: 'Open voting' },
                ].map(opt => (
                    <div
                        key={opt.value}
                        role="button"
                        onClick={() => setHeroMethod(opt.value)}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '20px',
                            background: heroMethod === opt.value ? '#FF3B57' : 'rgba(255,255,255,0.08)',
                            color: heroMethod === opt.value ? '#fff' : '#BFBFBF',
                            cursor: 'pointer',
                            fontSize: '13px',
                            border: `1px solid ${heroMethod === opt.value ? '#FF3B57' : 'rgba(255,255,255,0.15)'}`,
                            userSelect: 'none',
                        }}
                    >
                        {opt.label}
                    </div>
                ))}
            </div>

            {/* Card grid for fixed / voting_candidates */}
            {heroMethod !== 'open_voting' && (
                <div className={styles.teamsGrid}> 
                    {(heroMethod === 'fixed' ? heroes.slice(0, 1) : heroes).map((hero) => (
                        <div className={styles.paragraph} key={hero.id}>
                            <div className={styles.teamwrap}>
                                <div className={styles.guildImgContainer} style={{border:'none'}}>
                                    <div className={styles.emptyPlaceholder}>
                                        <img src={hero.img || teamicon} alt={hero.name} style={{width:'100%', maxWidth:'100%', height:'auto', objectFit:'contain'}}/>
                                    </div>
                                </div>
                                <h4 className={styles.elsetitle}>{hero.name}</h4>
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <div className={styles.pointsWrapper}>
                                        <img src={points} alt="points" />
                                        <p style={{color:'white'}}>{hero.points}</p>
                                    </div>
                                    <img 
                                        src={trash} 
                                        alt="delete" 
                                        onClick={() => removeMember('hero', hero.id)}
                                        style={{cursor: 'pointer'}}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                
                    {(heroMethod !== 'fixed' || heroes.length === 0) && (
                        <div className={styles.paragraph}>
                            <div 
                                className={styles.guildImgContainer} 
                                onClick={() => navigate('/add-member/hero')} 
                                style={{height:'260px', padding:'10px 0px', cursor: 'pointer'}}
                            >
                                <div className={styles.emptyPlaceholder}>
                                    <img src={team} alt="Add icon" style={{width:'fit-content'}}/>
                                    <p style={{color:'#BFBFBF'}}>
                                        {heroMethod === 'fixed' ? 'Pick a hero' : 'Add candidate'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Open voting config for heroes */}
            {heroMethod === 'open_voting' && (
                <div className={styles.recruitmentDetails}>
                    <p style={{color:'#aaa', fontSize:'13px', marginBottom:'12px'}}>
                        Any user can apply for the hero role. The winner is determined by viewer voting.
                    </p>
                    <div className={styles.recruitmentItem}>
                        <p className={styles.recruitmentLabel}>Voting start date</p>
                        <div className={styles.datetimeContainer}>
                            <input 
                                type="time" 
                                className={styles.timeInput} 
                                value={heroVotingStartTime}
                                onChange={(e) => setHeroVotingTime(e.target.value)}
                            />
                            <input 
                                type="date" 
                                className={styles.dateInput} 
                                value={heroVotingStartDate}
                                onChange={(e) => setHeroVotingDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className={styles.recruitmentItem}>
                        <p className={styles.recruitmentLabel}>Voting duration</p>
                        <div className={styles.votingTimeContainer}>
                            <div className={styles.inputWrapper}>
                                <input 
                                    type="number" 
                                    className={styles.hoursInput} 
                                    value={heroVotingHours}
                                    onChange={(e) => setHeroVotingHours(parseInt(e.target.value) || 1)}
                                    min="1" 
                                    max="168"
                                />
                                <span className={styles.inputSuffix}>hours</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Navigators Section */}
            <div style={{marginTop:'28px'}}>
                <h4 className={styles.elsetitle}>Invite a navigator</h4>
                <p style={{color:'rgb(192, 192, 192)'}}>Specify possible navigators for which viewers will vote.</p>

                {/* Navigator Method Selector */}
                <div style={{display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap'}}>
                    {[
                        { value: 'fixed', label: 'Fixed' },
                        { value: 'voting_candidates', label: 'Voting (my candidates)' },
                        { value: 'open_voting', label: 'Open voting' },
                    ].map(opt => (
                        <div
                            key={opt.value}
                            role="button"
                            onClick={() => setNavigatorMethod(opt.value)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '20px',
                                background: navigatorMethod === opt.value ? '#FF3B57' : 'rgba(255,255,255,0.08)',
                                color: navigatorMethod === opt.value ? '#fff' : '#BFBFBF',
                                cursor: 'pointer',
                                fontSize: '13px',
                                border: `1px solid ${navigatorMethod === opt.value ? '#FF3B57' : 'rgba(255,255,255,0.15)'}`,
                                userSelect: 'none',
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>

                {navigatorMethod !== 'open_voting' && (
                    <div className={styles.teamsGrid}> 
                        {(navigatorMethod === 'fixed' ? navigators.slice(0, 1) : navigators).map((nav) => (
                            <div className={styles.paragraph} key={nav.id}>
                                <div className={styles.teamwrap}>
                                    <div className={styles.guildImgContainer} style={{border:'none'}}>
                                        <div className={styles.emptyPlaceholder}>
                                            <img src={nav.img || teamicon} alt={nav.name} style={{width:'100%', maxWidth:'100%', height:'auto', objectFit:'contain'}}/>
                                        </div>
                                    </div>
                                    <h4 className={styles.elsetitle}>{nav.name}</h4>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <div className={styles.pointsWrapper}>
                                            <img src={points} alt="points" />
                                            <p style={{color:'white'}}>{nav.points}</p>
                                        </div>
                                        <img 
                                            src={trash} 
                                            alt="delete" 
                                            onClick={() => removeMember('navigator', nav.id)}
                                            style={{cursor: 'pointer'}}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    
                        {(navigatorMethod !== 'fixed' || navigators.length === 0) && (
                            <div className={styles.paragraph}>
                                <div 
                                    className={styles.guildImgContainer} 
                                    onClick={() => navigate('/add-member/navigator')} 
                                    style={{height:'260px', padding:'10px 0px', cursor: 'pointer'}}
                                >
                                    <div className={styles.emptyPlaceholder}>
                                        <img src={navigator} alt="Add icon" style={{width:'fit-content'}}/>
                                        <p style={{color:'#BFBFBF'}}>
                                            {navigatorMethod === 'fixed' ? 'Pick a navigator' : 'Add candidate'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {navigatorMethod === 'open_voting' && (
                    <div className={styles.recruitmentDetails}>
                        <p style={{color:'#aaa', fontSize:'13px', marginBottom:'12px'}}>
                            Any user can apply for the navigator role. The winner is determined by viewer voting.
                        </p>
                        <div className={styles.recruitmentItem}>
                            <p className={styles.recruitmentLabel}>Voting start date</p>
                            <div className={styles.datetimeContainer}>
                                <input 
                                    type="time" 
                                    className={styles.timeInput} 
                                    value={navigatorVotingStartTime}
                                    onChange={(e) => setNavigatorVotingTime(e.target.value)}
                                />
                                <input 
                                    type="date" 
                                    className={styles.dateInput} 
                                    value={navigatorVotingStartDate}
                                    onChange={(e) => setNavigatorVotingDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className={styles.recruitmentItem}>
                            <p className={styles.recruitmentLabel}>Voting duration</p>
                            <div className={styles.votingTimeContainer}>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type="number" 
                                        className={styles.hoursInput} 
                                        value={navigatorVotingHours}
                                        onChange={(e) => setNavigatorVotingHours(parseInt(e.target.value) || 1)}
                                        min="1" 
                                        max="168"
                                    />
                                    <span className={styles.inputSuffix}>hours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Agents Section */}
            <div style={{marginTop:'28px'}}>
                <h4 className={styles.elsetitle}>Invite a spot agent</h4>
                <p style={{color:'rgb(192, 192, 192)'}}>Specify possible spot agents for which viewers will vote.</p>

                {/* Agent Method Selector */}
                <div style={{display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap'}}>
                    {[
                        { value: 'fixed', label: 'Fixed' },
                        { value: 'voting_candidates', label: 'Voting (my candidates)' },
                        { value: 'open_voting', label: 'Open voting' },
                    ].map(opt => (
                        <div
                            key={opt.value}
                            role="button"
                            onClick={() => setAgentMethod(opt.value)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '20px',
                                background: agentMethod === opt.value ? '#FF3B57' : 'rgba(255,255,255,0.08)',
                                color: agentMethod === opt.value ? '#fff' : '#BFBFBF',
                                cursor: 'pointer',
                                fontSize: '13px',
                                border: `1px solid ${agentMethod === opt.value ? '#FF3B57' : 'rgba(255,255,255,0.15)'}`,
                                userSelect: 'none',
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>

                {agentMethod !== 'open_voting' && (
                    <div className={styles.teamsGrid}> 
                        {(agentMethod === 'fixed' ? agents.slice(0, 1) : agents).map((agentItem) => (
                            <div className={styles.paragraph} key={agentItem.id}>
                                <div className={styles.teamwrap}>
                                    <div className={styles.guildImgContainer} style={{border:'none'}}>
                                        <div className={styles.emptyPlaceholder}>
                                            <img src={agentItem.img || teamicon} alt={agentItem.name} style={{width:'100%', maxWidth:'100%', height:'auto', objectFit:'contain'}}/>
                                        </div>
                                    </div>
                                    <h4 className={styles.elsetitle}>{agentItem.name}</h4>
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <div className={styles.pointsWrapper}>
                                            <img src={points} alt="points" />
                                            <p style={{color:'white'}}>{agentItem.points}</p>
                                        </div>
                                        <img 
                                            src={trash} 
                                            alt="delete" 
                                            onClick={() => removeMember('agent', agentItem.id)}
                                            style={{cursor: 'pointer'}}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    
                        {(agentMethod !== 'fixed' || agents.length === 0) && (
                            <div className={styles.paragraph}>
                                <div 
                                    className={styles.guildImgContainer} 
                                    onClick={() => navigate('/add-member/agent')} 
                                    style={{height:'260px', padding:'10px 0px', cursor: 'pointer'}}
                                >
                                    <div className={styles.emptyPlaceholder}>
                                        <img src={agent} alt="Add icon" style={{width:'fit-content'}}/>
                                        <p style={{color:'#BFBFBF'}}>
                                            {agentMethod === 'fixed' ? 'Pick an agent' : 'Add candidate'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {agentMethod === 'open_voting' && (
                    <div className={styles.recruitmentDetails}>
                        <p style={{color:'#aaa', fontSize:'13px', marginBottom:'12px'}}>
                            Any user can apply for the spot agent role. The winner is determined by viewer voting.
                        </p>
                        <div className={styles.recruitmentItem}>
                            <p className={styles.recruitmentLabel}>Voting start date</p>
                            <div className={styles.datetimeContainer}>
                                <input 
                                    type="time" 
                                    className={styles.timeInput} 
                                    value={agentVotingStartTime}
                                    onChange={(e) => setAgentVotingTime(e.target.value)}
                                />
                                <input 
                                    type="date" 
                                    className={styles.dateInput} 
                                    value={agentVotingStartDate}
                                    onChange={(e) => setAgentVotingDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className={styles.recruitmentItem}>
                            <p className={styles.recruitmentLabel}>Voting duration</p>
                            <div className={styles.votingTimeContainer}>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type="number" 
                                        className={styles.hoursInput} 
                                        value={agentVotingHours}
                                        onChange={(e) => setAgentVotingHours(parseInt(e.target.value) || 1)}
                                        min="1" 
                                        max="168"
                                    />
                                    <span className={styles.inputSuffix}>hours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tasks Section */}
            <div style={{ marginTop: '28px' }}>
                <h4 className={styles.elsetitle}>Tasks</h4>
                <p style={{ color: 'rgb(192, 192, 192)' }}>Add tasks the team needs to complete at specific locations.</p>

                {(tasks || []).map((task, idx) => (
                    <div
                        key={task.id}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                        }}
                    >
                        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openEditTask(task)}>
                            <p style={{ color: '#fff', margin: 0, fontWeight: 600 }}>
                                {idx + 1}. {task.description}
                            </p>
                            {task.address && (
                                <p style={{ color: '#BFBFBF', margin: '4px 0 0', fontSize: '13px' }}>{task.address}</p>
                            )}
                            {task.lat != null && task.lng != null && (
                                <p style={{ color: '#888', margin: '2px 0 0', fontSize: '12px' }}>
                                    📍 {task.lat.toFixed(5)}, {task.lng.toFixed(5)}
                                </p>
                            )}
                        </div>
                        <img
                            src={trash}
                            alt="delete task"
                            onClick={() => removeTask(task.id)}
                            style={{ cursor: 'pointer', width: '20px', flexShrink: 0 }}
                        />
                    </div>
                ))}

                <div
                    role="button"
                    onClick={openAddTask}
                    style={{
                        border: '1px dashed rgba(255,255,255,0.25)',
                        borderRadius: '12px',
                        padding: '14px',
                        textAlign: 'center',
                        color: '#BFBFBF',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginTop: '4px',
                    }}
                >
                    + Add task
                </div>
            </div>

            {/* Delete Button */}
            {isEditingExistingTeam && (
                <div className={styles.item} style={{ marginTop: '20px' }}>
                    <div className={styles.active}>
                        <button 
                            onClick={handleDelete}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                width: '100%'
                            }}
                        >
                            Delete Team
                        </button>
                    </div> 
                </div>
            )}

            {/* Save Button */}
            <div className={styles.item}>
                <div className={styles.active}>
                    <button 
                        className={styles.savebutton} 
                        onClick={handleSave}
                    >
                        Save Team
                    </button>
                </div> 
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#1a1a1a',
                        padding: '24px',
                        borderRadius: '12px',
                        maxWidth: '400px',
                        width: '90%',
                        border: '1px solid #333'
                    }}>
                        <h3 style={{ color: '#fff', marginBottom: '16px' }}>Confirm Delete</h3>
                        <p style={{ color: '#ccc', marginBottom: '24px' }}>
                            Are you sure you want to delete team "{teamName}"? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={cancelDelete}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'transparent',
                                    color: '#fff',
                                    border: '1px solid #666',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Task Form Modal */}
            {showTaskForm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    zIndex: 1100,
                    boxSizing: 'border-box',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    <div style={{
                        backgroundColor: '#1a1a1a',
                        borderRadius: '16px',
                        padding: '20px 16px',
                        border: '1px solid #333',
                        maxWidth: '480px',
                        width: '100%',
                        margin: '0 auto',
                        boxSizing: 'border-box',
                    }}>
                        <h3 style={{ color: '#fff', marginBottom: '16px' }}>
                            {taskFormData.id ? 'Edit task' : 'New task'}
                        </h3>

                        {/* Description */}
                        <p style={{ color: '#BFBFBF', marginBottom: '6px', fontSize: '13px' }}>Description *</p>
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="What needs to be done?"
                            value={taskFormData.description}
                            onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
                            style={{ marginBottom: '14px', boxSizing: 'border-box', width: '100%' }}
                        />

                        {/* Address */}
                        <p style={{ color: '#BFBFBF', marginBottom: '6px', fontSize: '13px' }}>Address (optional)</p>
                        <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Street address or landmark"
                            value={taskFormData.address}
                            onChange={(e) => setTaskFormData(prev => ({ ...prev, address: e.target.value }))}
                            style={{ marginBottom: '14px', boxSizing: 'border-box', width: '100%' }}
                        />

                        {/* Map */}
                        <p style={{ color: '#BFBFBF', marginBottom: '8px', fontSize: '13px' }}>
                            Pick location on map (tap to pin)
                        </p>
                        <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', width: '100%' }}>
                            <MapContainer
                                center={taskFormData.lat != null ? [taskFormData.lat, taskFormData.lng] : [55.751244, 37.618423]}
                                zoom={taskFormData.lat != null ? 14 : 4}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <MapClickHandler onPick={handleTaskMapPick} />
                                {taskFormData.lat != null && (
                                    <Marker position={[taskFormData.lat, taskFormData.lng]} />
                                )}
                            </MapContainer>
                        </div>

                        {/* Current coords */}
                        {taskFormData.lat != null ? (
                            <p style={{ color: '#888', fontSize: '12px', marginBottom: '10px', wordBreak: 'break-all' }}>
                                📍 {taskFormData.lat.toFixed(6)}, {taskFormData.lng.toFixed(6)}
                            </p>
                        ) : (
                            <p style={{ color: '#666', fontSize: '12px', marginBottom: '10px' }}>No location selected</p>
                        )}

                        {/* Use my location button */}
                        <div
                            role="button"
                            onClick={handleUseMyLocation}
                            style={{
                                padding: '10px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.07)',
                                color: gettingLocation ? '#888' : '#BFBFBF',
                                cursor: gettingLocation ? 'default' : 'pointer',
                                textAlign: 'center',
                                fontSize: '13px',
                                marginBottom: '16px',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxSizing: 'border-box',
                            }}
                        >
                            {gettingLocation ? 'Getting location…' : '📡 Use my current location'}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowTaskForm(false)}
                                style={{
                                    flex: 1, padding: '11px',
                                    background: 'transparent', color: '#fff',
                                    border: '1px solid #555', borderRadius: '8px', cursor: 'pointer',
                                    minWidth: 0,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTask}
                                style={{
                                    flex: 1, padding: '11px',
                                    background: '#FF3B57', color: '#fff',
                                    border: 'none', borderRadius: '8px',
                                    cursor: 'pointer', fontWeight: 600,
                                    minWidth: 0,
                                }}
                            >
                                Save task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamDetail;