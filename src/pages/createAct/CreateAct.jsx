// CreateAct.jsx (исправленный)
import { useCallback, useEffect, useRef, useState } from "react";
import arrowLeft from '../../images/arrow-left.png';
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../shared/api/api";
import { useActsStore } from "../../shared/stores/actsStore";
import { useAuthStore } from "../../shared/stores/authStore";
import { useSequelStore } from "../../shared/stores/sequelStore";
import useTeamStore from "../../shared/stores/teamStore";
import { ActFormat, ActType, SelectionMethods } from "../../shared/types/act";
import styles from "./CreateAct.module.css";
import StreamHost from "./components/StreamHost";
import { useCreateAct } from "./hooks/useCreateAct";
import { useCreateSequel } from "./hooks/useCreateSequel";
import team from '../../images/team.png';
import add from '../../images/add.png';
import teamicon from '../../images/icon1.png';
import points from '../../images/points.png';
import { actApi } from "../../shared/api/act";
import { chatApi } from "../../shared/api/chat";
import { profileApi } from "../../shared/api/profile";

export default function CreateAct() {
  const navigate = useNavigate();
  const location = useLocation();
  const photoInputRef = useRef(null);
  const [userId, setUserId] = useState();
  const [act_id, setActId] = useState();
  
  // Основные состояния формы
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Состояния для акта
  const [title, setTitle] = useState("");
  const [actType, setActType] = useState(ActType.SINGLE);
  const [formatType, setFormatType] = useState(ActFormat.SINGLE);
  const [settingsType, setSettingsType] = useState("option1");
  const [heroMethod, setHeroMethod] = useState(SelectionMethods.VOTING);
  const [navigatorMethod, setNavigatorMethod] = useState(SelectionMethods.VOTING);
  const [spotAgentMethod, setSpotAgentMethod] = useState(SelectionMethods.VOTING);
  const [spotAgentCount, setSpotAgentCount] = useState(0);
  const [biddingTime, setBiddingTime] = useState(5);
  const [isAnimating, setIsAnimating] = useState(false);
  const [createdAct, setCreatedAct] = useState(null);
  const [showStream, setShowStream] = useState(false);

  // Модальные окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sequelCoverPreview, setSequelCoverPreview] = useState(null);
  const [sequelTitle, setSequelTitle] = useState("");
  const [sequelEpisodes, setSequelEpisodes] = useState("");
  const [sequelPhoto, setSequelPhoto] = useState(null);

  // Теги, расписание, сезоны
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [mySequels, setMySequels] = useState([]);
  const [pickingSeasonSequel, setPickingSeasonSequel] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState('');
  const [deletingChapterId, setDeletingChapterId] = useState(null);

  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Сторы
  const {
    user,
    isAuthenticated,
    location: authLocation,
    routeDestination,
    routeCoordinates,
    routePoints,
    setRouteDestination,
    setRouteCoordinates,
    addRoutePoint,
    clearRoute,
  } = useAuthStore();

  const {
    createActFormState,
    setCreateActTasks,
    addCreateActTask,
    updateCreateActTask,
    deleteCreateActTask,
    clearCreateActForm,
  } = useActsStore();

  const {
    selectedSequelId,
    selectedIntroId,
    selectedOutroId,
    selectedMusicIds,
    setSelectedSequel,
    clearSelectedSequel,
    clearSelectedIntro,
    clearSelectedOutro,
    clearSelectedMusic,
  } = useSequelStore();

  // Team Store
  const teamStore = useTeamStore();
  const teams = teamStore.teams;

  const { createAct } = useCreateAct();
  const {
    createSequel,
    resetState: resetSequelState,
  } = useCreateSequel();

  const tasks = createActFormState.tasks;

  // Функция для подсчета points команды
  const calculateTeamPoints = (team) => {
    let total = 0;
    
    if (team.heroes && team.heroes.length > 0) {
      team.heroes.forEach(hero => {
        total += Number(hero.points) || 0;
      });
    }
    
    if (team.navigators && team.navigators.length > 0) {
      team.navigators.forEach(navigator => {
        total += Number(navigator.points) || 0;
      });
    }
    
    if (team.agents && team.agents.length > 0) {
      team.agents.forEach(agent => {
        total += Number(agent.points) || 0;
      });
    }
    
    return total;
  };

  // Обработка фото
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size should be less than 10MB');
        return;
      }

      setPhotoFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  // Сохранение и восстановление состояния формы
  const saveFormState = () => {
    const formState = {
      name,
      description,
      photoPreview,
      title,
      actType,
      formatType,
      settingsType,
      heroMethod,
      navigatorMethod,
      spotAgentMethod,
      spotAgentCount,
      biddingTime,
      selectedChapterId,
      selectedSequelId: selectedSequelId || null,
      timestamp: Date.now(),
    };
    localStorage.setItem("createActFormState", JSON.stringify(formState));
  };

  const restoreFormState = useCallback(() => {
    try {
      const savedState = localStorage.getItem("createActFormState");
      if (savedState) {
        const formState = JSON.parse(savedState);
        if (Date.now() - formState.timestamp < 30 * 60 * 1000) {
          setName(formState.name || "");
          setDescription(formState.description || "");
          if (formState.photoPreview) {
            setPhotoPreview(formState.photoPreview);
            fetch(formState.photoPreview)
              .then(r => r.blob())
              .then(blob => {
                const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
                setPhotoFile(file);
              })
              .catch(() => {});
          }
          setTitle(formState.title || "");
          setActType(formState.actType || ActType.SINGLE);
          setFormatType(formState.formatType || ActFormat.SINGLE);
          setSettingsType(formState.settingsType || "option1");
          setHeroMethod(formState.heroMethod || SelectionMethods.VOTING);
          setNavigatorMethod(formState.navigatorMethod || SelectionMethods.VOTING);
          setSpotAgentMethod(formState.spotAgentMethod || SelectionMethods.VOTING);
          setSpotAgentCount(formState.spotAgentCount || 0);
          setBiddingTime(formState.biddingTime || 5);
        }
      }
    } catch (error) {
      console.error("Error restoring form state:", error);
    }
  }, []);

  useEffect(() => {
    restoreFormState();
  }, [restoreFormState]);

  // Загрузка моих сиквелов (сериалов) + восстановление выбранного сезона
  useEffect(() => {
    api.get("/sequel/my-sequels").then(r => {
      const data = r.data || [];
      setMySequels(data);
      // восстановить выбранный сезон после загрузки списка
      try {
        const saved = localStorage.getItem("createActFormState");
        if (saved) {
          const fs = JSON.parse(saved);
          if (fs.selectedChapterId && Date.now() - fs.timestamp < 30 * 60 * 1000) {
            const seq = data.find(s => s.id === fs.selectedSequelId);
            if (seq && seq.chapters?.find(c => c.id === fs.selectedChapterId)) {
              setSelectedChapterId(fs.selectedChapterId);
              setSelectedSequel(seq);
            }
          }
        }
      } catch {}
    }).catch(() => {});
  }, [setSelectedSequel]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveFormState();
    }, 500);
    return () => clearTimeout(timeoutId);
  });

  const handleCreateAct = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (!photoFile) {
      toast.error("Please select a photo");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Original teams data:", teams);
      
      // Создаем акт с командами (трансформация происходит в actApi)
      const result = await actApi.createAct(name, description, photoFile, teams, {
        sequelId: selectedSequelId || undefined,
        tags: tags.length > 0 ? tags : undefined,
        scheduledAt: scheduledAt || undefined,
        chapterId: selectedChapterId || undefined,
      });
      
      if (result) {
        const newActId = result.actId || result.id || result.data?.id;
        console.log("Act created with ID:", newActId);
        
        if (newActId) {
          const profileData = await profileApi.getProfile();
          await chatApi.createChatGroup(name, [profileData.id], photoFile, newActId);
        }

        localStorage.removeItem("createActFormState");
        
        clearSelectedSequel();
        clearSelectedIntro();
        clearSelectedOutro();
        clearSelectedMusic();
        setTags([]);
        setTagInput("");
        setScheduledAt("");
        setSelectedChapterId(null);

        toast.success("Act created successfully!");
        navigate('/acts');
      }
    } catch (error) {
      console.error("Full error:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to create act");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Удалите функцию transformTeamsForApi из этого файла!

  // Сохранение задач
  const saveLocalTasksToServer = async (actId) => {
    const localTasks = tasks.filter((task) => task.local);
    if (localTasks.length === 0) return;

    try {
      await Promise.all(
        localTasks.map(async (task) => {
          await api.post(`/act/${actId}/tasks`, { title: task.title });
        })
      );
    } catch (error) {
      console.error("Error saving tasks:", error);
    }
  };

  // Управление временем
  const handleTimeChange = (direction) => {
    if (isAnimating) return;
    let newTime;
    if (direction === "increase") {
      newTime = Math.min(20, biddingTime + 5);
    } else {
      newTime = Math.max(5, biddingTime - 5);
    }
    if (newTime === biddingTime) return;
    setIsAnimating(true);
    setBiddingTime(newTime);
    setTimeout(() => setIsAnimating(false), 400);
  };

  // Модальное окно для создания сиквела
  const handleCreateSequel = async (e) => {
    e.preventDefault();
    if (!sequelTitle.trim()) {
      toast.error("Please enter a sequel title");
      return;
    }
    if (!sequelEpisodes.trim() || isNaN(parseInt(sequelEpisodes))) {
      toast.error("Please enter a valid episode number");
      return;
    }
    if (!sequelPhoto) {
      toast.error("Please upload a sequel cover");
      return;
    }

    const sequelData = {
      title: sequelTitle.trim(),
      episodes: parseInt(sequelEpisodes),
      photo: sequelPhoto,
    };

    const result = await createSequel(sequelData);
    if (result?.id) {
      try {
        // Auto-create first season so user immediately sees it in Season list
        await api.post(`/sequel/${result.id}/chapters`, { title: "Season 1" });
      } catch {
        // non-blocking; sequel is still created
      }

      toast.success("Sequel created successfully!");

      api.get("/sequel/my-sequels").then((r) => {
        const updatedSequels = r.data || [];
        setMySequels(updatedSequels);

        const createdSequel = updatedSequels.find((s) => s.id === result.id);
        if (createdSequel) {
          setSelectedSequel(createdSequel);
          const firstChapter = (createdSequel.chapters || [])[0] || null;
          if (firstChapter?.id) {
            setSelectedChapterId(firstChapter.id);
          }
        }
      }).catch(() => {});

      closeModal();
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setSequelTitle("");
    setSequelEpisodes("");
    setSequelPhoto(null);
    setSequelCoverPreview(null);
    resetSequelState();
  };

  const handleStopStream = () => {
    setShowStream(false);
    setCreatedAct(null);
    clearRoute();
    clearCreateActForm();
    navigate("/acts");
  };

  if (showStream && createdAct) {
    return (
      <StreamHost
        actId={createdAct.id}
        actTitle={createdAct.title}
        onStopStream={handleStopStream}
        startLocation={authLocation}
        destinationLocation={routeDestination}
        routeCoordinates={routeCoordinates}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.backButton} onClick={() => window.history.back()}>
          <img src={arrowLeft} alt="Back" className={styles.backIcon} />
        </div>
        <h1>New act</h1>
        <div></div>
      </div>

      {/* Basic Information */}
      <div className={styles.paragraph}>
        <h3 className={styles.elsetitle}>Basic information</h3>
        <input 
          type="text" 
          className={styles.inputField} 
          placeholder="Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
        <textarea 
          className={styles.textareaField} 
          placeholder="Description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          rows={4}
        />
      </div>

      {/* Photo Upload */}
      <h4 className={styles.elsetitle}>Act Galery</h4>
      {photoPreview ? (
        <div className={styles.paragraph}>
          <div className={styles.guildImgContainer}>
            <img src={photoPreview} alt="Preview" className={styles.guildimg} />
          </div>
          <button 
            className={styles.button} 
            onClick={handleRemovePhoto}
            disabled={isSubmitting}
          >
            Delete
          </button>
        </div>
      ) : (
        <div className={styles.paragraph}>
          <div 
            className={styles.guildImgContainer} 
            onClick={() => photoInputRef.current?.click()}
            style={{ maxHeight: '70px', cursor: 'pointer' }}
          >
            <div className={styles.emptyPlaceholder} style={{display:'flex', gap:'4px'}}>
              <p>Click to upload photo</p>
              <img src={add} alt="Add icon" />
            </div>
          </div>
          <input 
            type="file" 
            hidden 
            ref={photoInputRef} 
            onChange={handlePhotoChange} 
            accept="image/*"
          />
        </div>
      )}

      {/* Teams */}
      <div>
        <h4 className={styles.elsetitle}>Teams</h4>
        <p style={{color:'rgb(192, 192, 192)'}}>
          Create team and add users
        </p>
        <div className={styles.teamsGrid}> 
          {/* Отображаем все сохраненные команды */}
          {teams && teams.length > 0 ? (
            teams.map((team) => {
              const teamTotalPoints = calculateTeamPoints(team);
              const teamHeroAvatar = team.heroes && team.heroes.length > 0 ? team.heroes[0].img : teamicon;
              
              return (
                <div className={styles.paragraph} key={team.id}>
                  <div 
                    className={styles.teamwrap} 
                    onClick={() => {
                      teamStore.loadTeamForEditing(team.id);
                      navigate('/team');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.guildImgContainer} style={{border:'none'}}>
                      <div className={styles.emptyPlaceholder}>
                        <img 
                          src={teamHeroAvatar} 
                          alt={team.name || "Team avatar"}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = teamicon;
                          }}
                          style={{
                            width: '150px',
                            height: '150px',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                    </div>

                    <p style={{
                      marginTop: '8px',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}>
                      {team.name}
                    </p>
                    
                    <div className={styles.pointsWrapper}>
                      <img src={points} alt="points" />
                      <p style={{color:'white'}}>{teamTotalPoints}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : null}
          
          {/* Кнопка добавления новой команды */}
          <div className={styles.paragraph}>
            <div 
              className={styles.guildImgContainer} 
              onClick={() => {
                teamStore.createNewTeam();
                navigate('/team');
              }} 
              style={{height:'260px', padding:'10px 0px', cursor: 'pointer'}}
            >
              <div className={styles.emptyPlaceholder}>
                <img src={team} alt="Add icon" />
                <p>Add new team</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className={styles.paragraph}>
        <h4 className={styles.elsetitle}>Tags</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {tags.map((tag, i) => (
            <div key={i} style={{ background: '#252525', padding: '4px 10px', borderRadius: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: 'white', fontSize: '14px' }}>{tag}</span>
              <span onClick={() => setTags(prev => prev.filter((_, idx) => idx !== i))} style={{ color: '#888', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>✕</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className={styles.inputField}
            placeholder="Add tag and press Enter"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && tagInput.trim()) {
                e.preventDefault();
                if (!tags.includes(tagInput.trim())) setTags(prev => [...prev, tagInput.trim()]);
                setTagInput("");
              }
            }}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* Season / Series drill-down */}
      <div className={styles.paragraph}>
        <h4 className={styles.elsetitle}>Season</h4>

        {/* STEP 1 — flat list of all seasons */}
        {!selectedChapterId && (() => {
          const allChapters = mySequels.flatMap(s =>
            (s.chapters || []).map((ch, idx) => ({ ...ch, sequelTitle: s.title, sequelId: s.id, seasonIndex: idx }))
          );

          const doCreateSeason = async (seqId) => {
            const seq = mySequels.find(s => s.id === seqId);
            const nextNum = (seq?.chapters?.length || 0) + 1;
            try {
              await api.post(`/sequel/${seqId}/chapters`, { title: `Season ${nextNum}` });
              const upd = await api.get('/sequel/my-sequels');
              setMySequels(upd.data || []);
              setPickingSeasonSequel(false);
              const updSeq = (upd.data || []).find(s => s.id === seqId);
              if (updSeq) {
                setSelectedSequel(updSeq);
                const newChap = updSeq.chapters?.[updSeq.chapters.length - 1];
                if (newChap) setSelectedChapterId(newChap.id);
              }
            } catch { toast.error('Failed to create season'); }
          };

          const handleAddSeason = () => {
            if (mySequels.length === 0) { openModal(); return; }
            if (mySequels.length === 1) { doCreateSeason(mySequels[0].id); return; }
            setPickingSeasonSequel(v => !v);
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ color: '#666', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                Optional. Pick a season to add this act as an episode.
              </p>

              {allChapters.length === 0 && (
                <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>No seasons yet — add one below.</p>
              )}

              {allChapters.map(ch => (
                <div key={ch.id} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                  {editingChapterId === ch.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px' }}>
                      <input
                        type="text"
                        value={editingChapterTitle}
                        onChange={e => setEditingChapterTitle(e.target.value)}
                        autoFocus
                        onKeyDown={async e => {
                          if (e.key === 'Escape') { setEditingChapterId(null); return; }
                          if (e.key === 'Enter' && editingChapterTitle.trim()) {
                            try {
                              await api.patch(`/sequel/chapters/${ch.id}`, { title: editingChapterTitle.trim() });
                              const upd = await api.get('/sequel/my-sequels');
                              setMySequels(upd.data || []);
                              setEditingChapterId(null);
                            } catch { toast.error('Failed to rename season'); }
                          }
                        }}
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '14px', fontFamily: 'Oxanium, sans-serif', minWidth: 0 }}
                      />
                      <div role="button" tabIndex={0}
                        onClick={async () => {
                          if (!editingChapterTitle.trim()) return;
                          try {
                            await api.patch(`/sequel/chapters/${ch.id}`, { title: editingChapterTitle.trim() });
                            const upd = await api.get('/sequel/my-sequels');
                            setMySequels(upd.data || []);
                            setEditingChapterId(null);
                          } catch { toast.error('Failed to rename season'); }
                        }}
                        style={{ background: '#009DFF', borderRadius: '8px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Oxanium, sans-serif', flexShrink: 0, width: 'fit-content' }}
                      >Save</div>
                      <div role="button" tabIndex={0} onClick={() => setEditingChapterId(null)}
                        style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px', color: '#888', cursor: 'pointer', fontSize: '13px', fontFamily: 'Oxanium, sans-serif', flexShrink: 0, width: 'fit-content' }}
                      >Cancel</div>
                    </div>
                  ) : deletingChapterId === ch.id ? (
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ color: 'white', fontSize: '13px', fontFamily: 'Oxanium, sans-serif' }}>
                        Delete <strong>{ch.title}</strong>?
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div role="button" tabIndex={0}
                          onClick={async () => {
                            try {
                              await api.delete(`/sequel/chapters/${ch.id}`);
                              const upd = await api.get('/sequel/my-sequels');
                              setMySequels(upd.data || []);
                              setDeletingChapterId(null);
                              if (selectedChapterId === ch.id) { setSelectedChapterId(null); setSelectedSequel(null); }
                            } catch { toast.error('Failed to delete season'); }
                          }}
                          style={{ background: '#c0392b', borderRadius: '8px', padding: '8px 16px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Oxanium, sans-serif', width: 'fit-content' }}
                        >Delete</div>
                        <div role="button" tabIndex={0} onClick={() => setDeletingChapterId(null)}
                          style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 16px', color: '#888', cursor: 'pointer', fontSize: '13px', fontFamily: 'Oxanium, sans-serif', width: 'fit-content' }}
                        >Cancel</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div role="button" tabIndex={0}
                        onClick={() => {
                          setSelectedChapterId(ch.id);
                          const seq = mySequels.find(s => s.id === ch.sequelId);
                          if (seq) setSelectedSequel(seq);
                        }}
                        style={{ flex: 1, padding: '14px 16px', cursor: 'pointer', minWidth: 0 }}
                      >
                        <div style={{ color: 'white', fontSize: '15px', fontWeight: 600, fontFamily: 'Oxanium, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Season {ch.seasonIndex + 1}
                        </div>
                        <div style={{ color: '#444', fontSize: '12px', marginTop: '2px' }}>
                          {ch.acts?.length || 0} episodes
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', paddingRight: '10px', flexShrink: 0 }}>
                        <div role="button" tabIndex={0}
                          onClick={() => { setEditingChapterId(ch.id); setEditingChapterTitle(ch.title); setDeletingChapterId(null); }}
                          style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', color: '#aaa', fontSize: '14px', width: 'fit-content' }}
                        >✎</div>
                        <div role="button" tabIndex={0}
                          onClick={() => { setDeletingChapterId(ch.id); setEditingChapterId(null); }}
                          style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(200,50,50,0.12)', cursor: 'pointer', color: '#e57373', fontSize: '14px', width: 'fit-content' }}
                        >✕</div>
                        <span style={{ color: '#009DFF', fontSize: '20px', lineHeight: 1, display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>›</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* + Add season — instant, no dialogs */}
              <div role="button" tabIndex={0}
                onClick={handleAddSeason}
                style={{
                  padding: '14px 16px', borderRadius: '14px',
                  border: '1.5px dashed rgba(255,255,255,0.13)',
                  cursor: 'pointer', color: '#666', fontSize: '14px',
                  textAlign: 'center', fontFamily: 'Oxanium, sans-serif',
                }}
              >+ Add season</div>

              {/* Inline series picker — only shown when multiple series exist */}
              {pickingSeasonSequel && (
                <div style={{ borderRadius: '14px', border: '1px solid rgba(0,157,255,0.25)', background: 'rgba(0,157,255,0.04)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px 6px', color: '#009DFF', fontSize: '12px', fontFamily: 'Oxanium, sans-serif' }}>
                    Add to which series?
                  </div>
                  {mySequels.map(seq => (
                    <div key={seq.id} role="button" tabIndex={0}
                      onClick={() => doCreateSeason(seq.id)}
                      style={{
                        padding: '12px 14px', cursor: 'pointer',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ color: 'white', fontSize: '14px', fontFamily: 'Oxanium, sans-serif', fontWeight: 500 }}>{seq.title}</span>
                      <span style={{ color: '#009DFF', fontSize: '13px' }}>Season {(seq.chapters?.length || 0) + 1} →</span>
                    </div>
                  ))}
                  <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div role="button" tabIndex={0} onClick={() => { setPickingSeasonSequel(false); openModal(); }}
                      style={{ color: '#555', fontSize: '13px', cursor: 'pointer', fontFamily: 'Oxanium, sans-serif', width: 'fit-content' }}
                    >+ New series</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* STEP 2 — inside a season: episodes + series info + when to air */}
        {selectedChapterId && (() => {
          const sel = mySequels.find(s => s.id === selectedSequelId);
          const chapter = sel?.chapters?.find(c => c.id === selectedChapterId);
          const episodes = chapter?.acts || [];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Back + breadcrumb + rename */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  role="button" tabIndex={0}
                  onClick={() => { setSelectedChapterId(null); setSelectedSequel(null); setEditingChapterId(null); }}
                  onKeyDown={e => e.key === 'Enter' && (setSelectedChapterId(null), setSelectedSequel(null))}
                  style={{
                    display: 'inline-flex', alignItems: 'center', padding: '7px 12px',
                    borderRadius: '10px', background: 'rgba(0,157,255,0.1)',
                    color: '#009DFF', fontSize: '13px', cursor: 'pointer',
                    fontFamily: 'Oxanium, sans-serif', flexShrink: 0, width: 'fit-content',
                  }}
                >‹ Back</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingChapterId === selectedChapterId ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                      <input
                        type="text"
                        value={editingChapterTitle}
                        onChange={e => setEditingChapterTitle(e.target.value)}
                        autoFocus
                        onKeyDown={async e => {
                          if (e.key === 'Escape') { setEditingChapterId(null); return; }
                          if (e.key === 'Enter' && editingChapterTitle.trim()) {
                            try {
                              await api.patch(`/sequel/chapters/${selectedChapterId}`, { title: editingChapterTitle.trim() });
                              const upd = await api.get('/sequel/my-sequels');
                              setMySequels(upd.data || []);
                              setEditingChapterId(null);
                            } catch { toast.error('Failed to rename'); }
                          }
                        }}
                        style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '4px 8px', outline: 'none', color: 'white', fontSize: '14px', fontFamily: 'Oxanium, sans-serif', minWidth: 0 }}
                      />
                      <div role="button" tabIndex={0} onClick={async () => {
                        if (!editingChapterTitle.trim()) return;
                        try {
                          await api.patch(`/sequel/chapters/${selectedChapterId}`, { title: editingChapterTitle.trim() });
                          const upd = await api.get('/sequel/my-sequels');
                          setMySequels(upd.data || []);
                          setEditingChapterId(null);
                        } catch { toast.error('Failed to rename'); }
                      }} style={{ background: '#009DFF', borderRadius: '7px', padding: '4px 10px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Oxanium, sans-serif', flexShrink: 0, width: 'fit-content' }}>✓</div>
                      <div role="button" tabIndex={0} onClick={() => setEditingChapterId(null)} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '7px', padding: '4px 10px', color: '#888', cursor: 'pointer', fontSize: '12px', fontFamily: 'Oxanium, sans-serif', flexShrink: 0, width: 'fit-content' }}>✕</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ color: 'white', fontSize: '14px', fontWeight: 600, fontFamily: 'Oxanium, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chapter?.title}
                      </div>
                      <div
                        role="button" tabIndex={0}
                        title="Rename season"
                        onClick={() => { setEditingChapterId(selectedChapterId); setEditingChapterTitle(chapter?.title || ''); }}
                        style={{ padding: '3px 6px', borderRadius: '6px', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', color: '#888', fontSize: '12px', flexShrink: 0, width: 'fit-content' }}
                      >✎</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Existing episodes */}
              {episodes.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', overflow: 'hidden' }}>
                  {episodes.map((ep, i) => (
                    <div
                      key={ep.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', gap: '8px',
                        borderBottom: i < episodes.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{ color: '#444', fontSize: '11px', flexShrink: 0, fontFamily: 'Oxanium, sans-serif' }}>#{i + 1}</span>
                        <span style={{ color: '#bbb', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ep.title}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '10px', padding: '2px 7px', borderRadius: '6px', flexShrink: 0,
                        background: ep.status === 'ONLINE' ? 'rgba(0,230,118,0.12)' : ep.status === 'PLANNED' ? 'rgba(255,171,64,0.12)' : 'rgba(255,255,255,0.05)',
                        color: ep.status === 'ONLINE' ? '#00e676' : ep.status === 'PLANNED' ? '#ffab40' : '#555',
                        fontFamily: 'Oxanium, sans-serif',
                      }}>
                        {ep.status === 'ONLINE' ? 'LIVE' : ep.status === 'PLANNED' ? 'Scheduled' : 'Ended'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* New episode label */}
              <div style={{
                padding: '11px 14px', borderRadius: '12px',
                border: '1px solid rgba(0,157,255,0.25)',
                background: 'rgba(0,157,255,0.05)',
                color: '#009DFF', fontSize: '13px', fontFamily: 'Oxanium, sans-serif',
              }}>
                This act → episode #{episodes.length + 1} in <strong>{chapter?.title}</strong>
              </div>

              {/* When to air */}
              <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>When to air:</p>

              {/* Go live immediately */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setScheduledAt('')}
                onKeyDown={e => e.key === 'Enter' && setScheduledAt('')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '14px', cursor: 'pointer', gap: '10px',
                  border: !scheduledAt ? '2px solid #009DFF' : '1px solid rgba(255,255,255,0.08)',
                  background: !scheduledAt ? 'rgba(0,157,255,0.07)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <div>
                  <div style={{ color: 'white', fontSize: '14px', fontWeight: 600, fontFamily: 'Oxanium, sans-serif', marginBottom: '2px' }}>Go live immediately</div>
                  <div style={{ color: '#555', fontSize: '12px' }}>The navigator starts it — it goes live right away</div>
                </div>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  border: !scheduledAt ? '2px solid #009DFF' : '2px solid rgba(255,255,255,0.2)',
                  background: !scheduledAt ? '#009DFF' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {!scheduledAt && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }} />}
                </div>
              </div>

              {/* Schedule */}
              <div style={{
                borderRadius: '14px', overflow: 'hidden',
                border: scheduledAt ? '2px solid #ffab40' : '1px solid rgba(255,255,255,0.08)',
                background: scheduledAt ? 'rgba(255,171,64,0.05)' : 'rgba(255,255,255,0.03)',
              }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !scheduledAt && setScheduledAt(new Date(Date.now() + 3600_000).toISOString().slice(0, 16))}
                  onKeyDown={e => e.key === 'Enter' && !scheduledAt && setScheduledAt(new Date(Date.now() + 3600_000).toISOString().slice(0, 16))}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', gap: '10px' }}
                >
                  <div>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: 600, fontFamily: 'Oxanium, sans-serif', marginBottom: '2px' }}>Schedule for later</div>
                    <div style={{ color: '#555', fontSize: '12px' }}>Shown as "Planned" until the date arrives</div>
                  </div>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    border: scheduledAt ? '2px solid #ffab40' : '2px solid rgba(255,255,255,0.2)',
                    background: scheduledAt ? '#ffab40' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {!!scheduledAt && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }} />}
                  </div>
                </div>
                {scheduledAt && (
                  <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="datetime-local"
                      className={styles.inputField}
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setScheduledAt('')}
                      onKeyDown={e => e.key === 'Enter' && setScheduledAt('')}
                      style={{ color: '#555', fontSize: '12px', cursor: 'pointer', fontFamily: 'Oxanium, sans-serif', width: 'fit-content' }}
                    >Remove schedule</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Save Button */}
      <div className={styles.item}>
        <div className={styles.active}>
          <button 
            className={styles.savebutton} 
            onClick={handleCreateAct}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Act'}
          </button>
        </div> 
      </div>

      {/* Modal: Create new series */}
      {isModalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111', borderRadius: '20px 20px 0 0',
              padding: '24px 20px 40px', width: '100%', maxWidth: '480px',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}
          >
            <h3 style={{ color: 'white', margin: 0, fontFamily: 'Oxanium, sans-serif' }}>New series</h3>

            <input
              type="text"
              placeholder="Series title"
              className={styles.inputField}
              value={sequelTitle}
              onChange={e => setSequelTitle(e.target.value)}
            />
            <input
              type="number"
              placeholder="Number of episodes"
              className={styles.inputField}
              value={sequelEpisodes}
              onChange={e => setSequelEpisodes(e.target.value)}
              min={1}
            />

            {/* Cover photo */}
            <div
              onClick={() => document.getElementById('sequel-photo-input').click()}
              style={{
                border: '1px dashed #555', borderRadius: '12px', padding: '16px',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', minHeight: '80px', overflow: 'hidden',
              }}
            >
              {sequelCoverPreview
                ? <img src={sequelCoverPreview} alt="cover" style={{ maxHeight: '120px', borderRadius: '8px', objectFit: 'cover', width: '100%' }} />
                : <p style={{ color: '#888', margin: 0 }}>Click to upload cover (optional)</p>
              }
            </div>
            <input
              id="sequel-photo-input"
              type="file"
              hidden
              accept="image/*"
              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  setSequelPhoto(file);
                  setSequelCoverPreview(URL.createObjectURL(file));
                }
              }}
            />

            <button
              onClick={handleCreateSequel}
              style={{
                background: '#009DFF', border: 'none', borderRadius: '12px',
                padding: '14px', color: 'white', fontWeight: 600, fontSize: '16px',
                cursor: 'pointer', marginTop: '4px',
              }}
            >
              Create series
            </button>
            <button
              onClick={closeModal}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px', padding: '12px', color: '#888', fontSize: '14px', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
