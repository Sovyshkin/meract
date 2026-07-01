// stores/teamStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'react-toastify';

// Helper function to format current datetime for datetime-local input
const getDefaultVotingDatetime = () => {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5);
  return { date, time };
};

const _defaultHeroDt = getDefaultVotingDatetime();
const _defaultNavDt = getDefaultVotingDatetime();
const _defaultAgentDt = getDefaultVotingDatetime();

const useTeamStore = create(
  persist(
    (set, get) => ({
      // Массив всех команд
      teams: [],
      
      // Текущая выбранная команда для редактирования
      currentTeamId: null,
      
      // Состояния для текущей команды (для обратной совместимости)
      heroes: [],
      navigators: [],
      agents: [],
      tasks: [],
      teamName: '',
      
      // Состояния для чекбоксов текущей команды
      isHeroRecruitmentOpen: false,
      isNavigatorRecruitmentOpen: false,
      
      // Метод подбора для каждой роли: 'fixed' | 'voting_candidates' | 'open_voting' | 'disabled'
      heroMethod: 'voting_candidates',
      navigatorMethod: 'voting_candidates',
      agentMethod: 'disabled',

      // Данные для полей ввода текущей команды
      heroVotingStartTime: _defaultHeroDt.time,
      heroVotingStartDate: _defaultHeroDt.date,
      heroVotingHours: 24,
      heroVotingMinutes: 0,
      navigatorVotingStartTime: _defaultNavDt.time,
      navigatorVotingStartDate: _defaultNavDt.date,
      navigatorVotingHours: 24,
      navigatorVotingMinutes: 0,
      agentVotingStartTime: _defaultAgentDt.time,
      agentVotingStartDate: _defaultAgentDt.date,
      agentVotingHours: 24,
      agentVotingMinutes: 0,

      // Получить все команды
      getTeams: () => get().teams,

      // Получить команду по ID
      getTeamById: (teamId) => {
        return get().teams.find(team => team.id === teamId);
      },

      // Проверка на дубликат имени
      isTeamNameDuplicate: (name, excludeTeamId = null) => {
        if (!name || name.trim() === '') return false;
        return get().teams.some(team => 
          team.name.toLowerCase() === name.toLowerCase() && 
          team.id !== excludeTeamId
        );
      },

      // Создать новую команду
      createNewTeam: () => {
        const newTeamId = Date.now().toString();
        const nowDatetime = getDefaultVotingDatetime();
        set({ 
          currentTeamId: newTeamId,
          heroes: [],
          navigators: [],
          agents: [],
          tasks: [],
          teamName: '',
          isHeroRecruitmentOpen: false,
          isNavigatorRecruitmentOpen: false,
          heroMethod: 'voting_candidates',
          navigatorMethod: 'voting_candidates',
          agentMethod: 'disabled',
          heroVotingStartTime: nowDatetime.time,
          heroVotingStartDate: nowDatetime.date,
          heroVotingHours: 24,
          heroVotingMinutes: 0,
          navigatorVotingStartTime: nowDatetime.time,
          navigatorVotingStartDate: nowDatetime.date,
          navigatorVotingHours: 24,
          navigatorVotingMinutes: 0,
          agentVotingStartTime: nowDatetime.time,
          agentVotingStartDate: nowDatetime.date,
          agentVotingHours: 24,
          agentVotingMinutes: 0,
        });
        return newTeamId;
      },

      // Загрузить команду для редактирования
      loadTeamForEditing: (teamId) => {
        const team = get().teams.find(t => t.id === teamId);
        if (team) {
          const defaultDt = getDefaultVotingDatetime();
          set({
            currentTeamId: team.id,
            heroes: team.heroes || [],
            navigators: team.navigators || [],
            agents: team.agents || [],
            tasks: team.tasks || [],
            teamName: team.name || '',
            isHeroRecruitmentOpen: team.isHeroRecruitmentOpen || false,
            isNavigatorRecruitmentOpen: team.isNavigatorRecruitmentOpen || false,
            heroMethod: team.heroMethod || 'voting_candidates',
            navigatorMethod: team.navigatorMethod || 'voting_candidates',
            agentMethod: team.agentMethod || 'disabled',
            heroVotingStartTime: team.heroVotingStartTime || defaultDt.time,
            heroVotingStartDate: team.heroVotingStartDate || defaultDt.date,
            heroVotingHours: team.heroVotingHours ?? 24,
            heroVotingMinutes: team.heroVotingMinutes ?? 0,
            navigatorVotingStartTime: team.navigatorVotingStartTime || defaultDt.time,
            navigatorVotingStartDate: team.navigatorVotingStartDate || defaultDt.date,
            navigatorVotingHours: team.navigatorVotingHours ?? 24,
            navigatorVotingMinutes: team.navigatorVotingMinutes ?? 0,
            agentVotingStartTime: team.agentVotingStartTime || defaultDt.time,
            agentVotingStartDate: team.agentVotingStartDate || defaultDt.date,
            agentVotingHours: team.agentVotingHours ?? 24,
            agentVotingMinutes: team.agentVotingMinutes ?? 0,
          });
        }
      },

      // Сохранить текущую команду
      saveCurrentTeam: () => {
        const state = get();
        
        // Проверяем, что имя команды не пустое
        if (!state.teamName || state.teamName.trim() === '') {
          toast.error('Team name is required');
          return null;
        }

        // Проверяем на дубликат имени
        if (state.isTeamNameDuplicate(state.teamName, state.currentTeamId)) {
          toast.error('A team with this name already exists');
          return null;
        }

        const teamData = {
          id: state.currentTeamId || Date.now().toString(),
          name: state.teamName,
          heroes: [...state.heroes],
          navigators: [...state.navigators],
          agents: [...state.agents],
          tasks: [...(state.tasks || [])],
          isHeroRecruitmentOpen: state.isHeroRecruitmentOpen,
          isNavigatorRecruitmentOpen: state.isNavigatorRecruitmentOpen,
          heroMethod: state.heroMethod || 'voting_candidates',
          navigatorMethod: state.navigatorMethod || 'voting_candidates',
          agentMethod: state.agentMethod || 'disabled',
          heroVotingStartTime: state.heroVotingStartTime,
          heroVotingStartDate: state.heroVotingStartDate,
          heroVotingHours: state.heroVotingHours,
          heroVotingMinutes: state.heroVotingMinutes,
          navigatorVotingStartTime: state.navigatorVotingStartTime,
          navigatorVotingStartDate: state.navigatorVotingStartDate,
          navigatorVotingHours: state.navigatorVotingHours,
          navigatorVotingMinutes: state.navigatorVotingMinutes,
          agentVotingStartTime: state.agentVotingStartTime,
          agentVotingStartDate: state.agentVotingStartDate,
          agentVotingHours: state.agentVotingHours,
          agentVotingMinutes: state.agentVotingMinutes,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          // Обновляем или добавляем команду
          const existingTeamIndex = state.teams.findIndex(t => t.id === teamData.id);
          let updatedTeams;
          
          if (existingTeamIndex >= 0) {
            // Обновляем существующую команду
            updatedTeams = [...state.teams];
            updatedTeams[existingTeamIndex] = teamData;
          } else {
            // Добавляем новую команду
            updatedTeams = [...state.teams, teamData];
          }

          return { teams: updatedTeams };
        });

        return teamData;
      },

      // Удалить команду
      deleteTeam: (teamId) => {
        set((state) => {
          // Если удаляем текущую команду, сбрасываем текущую
          if (state.currentTeamId === teamId) {
            state.currentTeamId = null;
          }
          return {
            teams: state.teams.filter(team => team.id !== teamId)
          };
        });
        toast.success('Team deleted successfully');
      },

      // Добавляем недостающую функцию setTeamData
      setTeamData: (data) => {
        const defDt = getDefaultVotingDatetime();
        set({
          teamName: data.name || '',
          heroes: data.heroes || [],
          navigators: data.navigators || [],
          agents: data.agents || [],
          tasks: data.tasks || [],
          isHeroRecruitmentOpen: data.isHeroRecruitmentOpen || false,
          isNavigatorRecruitmentOpen: data.isNavigatorRecruitmentOpen || false,
          heroMethod: data.heroMethod || 'voting_candidates',
          navigatorMethod: data.navigatorMethod || 'voting_candidates',
          agentMethod: data.agentMethod || 'disabled',
          heroVotingStartTime: data.heroVotingStartTime || defDt.time,
          heroVotingStartDate: data.heroVotingStartDate || defDt.date,
          heroVotingHours: data.heroVotingHours ?? 24,
          heroVotingMinutes: data.heroVotingMinutes ?? 0,
          navigatorVotingStartTime: data.navigatorVotingStartTime || defDt.time,
          navigatorVotingStartDate: data.navigatorVotingStartDate || defDt.date,
          navigatorVotingHours: data.navigatorVotingHours ?? 24,
          navigatorVotingMinutes: data.navigatorVotingMinutes ?? 0,
          agentVotingStartTime: data.agentVotingStartTime || defDt.time,
          agentVotingStartDate: data.agentVotingStartDate || defDt.date,
          agentVotingHours: data.agentVotingHours ?? 24,
          agentVotingMinutes: data.agentVotingMinutes ?? 0,
        });
      },

      // Actions для team
      setTeamName: (name) => set({ teamName: name }),

      // Actions для заданий
      addTask: (task) => set((state) => ({ tasks: [...(state.tasks || []), task] })),
      removeTask: (id) => set((state) => ({ tasks: (state.tasks || []).filter(t => t.id !== id) })),
      updateTask: (id, data) => set((state) => ({ tasks: (state.tasks || []).map(t => t.id === id ? { ...t, ...data } : t) })),
      
      // Actions для участников
      addHero: (hero) => set((state) => {
        const exists = state.heroes.some(h => h.id === hero.id);
        if (exists) return state;
        return { heroes: [...state.heroes, hero] };
      }),
      
      addNavigator: (navigator) => set((state) => {
        const exists = state.navigators.some(n => n.id === navigator.id);
        if (exists) return state;
        return { navigators: [...state.navigators, navigator] };
      }),
      
      addAgent: (agent) => set((state) => {
        const exists = state.agents.some(a => a.id === agent.id);
        if (exists) return state;
        return { agents: [...state.agents, agent] };
      }),
      
      removeMember: (type, id) => set((state) => {
        switch(type) {
          case 'hero': return { heroes: state.heroes.filter(m => m.id !== id) };
          case 'navigator': return { navigators: state.navigators.filter(m => m.id !== id) };
          case 'agent': return { agents: state.agents.filter(m => m.id !== id) };
          default: return state;
        }
      }),
      
      // Actions для чекбоксов
      setHeroRecruitment: (value) => set({ isHeroRecruitmentOpen: value }),
      setNavigatorRecruitment: (value) => set({ isNavigatorRecruitmentOpen: value }),

      // Actions для методов подбора ролей
      setHeroMethod: (method) => set({ heroMethod: method }),
      setNavigatorMethod: (method) => set({ navigatorMethod: method }),
      setAgentMethod: (method) => set({ agentMethod: method }),
      
      // Actions для полей ввода hero
      setHeroVotingTime: (time) => set({ heroVotingStartTime: time }),
      setHeroVotingDate: (date) => set({ heroVotingStartDate: date }),
      setHeroVotingHours: (hours) => set({ heroVotingHours: hours }),
      setHeroVotingMinutes: (minutes) => set({ heroVotingMinutes: minutes }),
      
      // Actions для полей ввода navigator
      setNavigatorVotingTime: (time) => set({ navigatorVotingStartTime: time }),
      setNavigatorVotingDate: (date) => set({ navigatorVotingStartDate: date }),
      setNavigatorVotingHours: (hours) => set({ navigatorVotingHours: hours }),
      setNavigatorVotingMinutes: (minutes) => set({ navigatorVotingMinutes: minutes }),

      // Actions для полей ввода agent
      setAgentVotingTime: (time) => set({ agentVotingStartTime: time }),
      setAgentVotingDate: (date) => set({ agentVotingStartDate: date }),
      setAgentVotingHours: (hours) => set({ agentVotingHours: hours }),
      setAgentVotingMinutes: (minutes) => set({ agentVotingMinutes: minutes }),
      
      // Очистка текущей команды и установка текущего времени
      resetCurrentTeam: () => {
        const nowDt = getDefaultVotingDatetime();
        set({
          currentTeamId: null,
          heroes: [],
          navigators: [],
          agents: [],
          tasks: [],
          teamName: '',
          isHeroRecruitmentOpen: false,
          isNavigatorRecruitmentOpen: false,
          heroMethod: 'voting_candidates',
          navigatorMethod: 'voting_candidates',
          agentMethod: 'disabled',
          heroVotingStartTime: nowDt.time,
          heroVotingStartDate: nowDt.date,
          heroVotingHours: 24,
          heroVotingMinutes: 0,
          navigatorVotingStartTime: nowDt.time,
          navigatorVotingStartDate: nowDt.date,
          navigatorVotingHours: 24,
          navigatorVotingMinutes: 0,
          agentVotingStartTime: nowDt.time,
          agentVotingStartDate: nowDt.date,
          agentVotingHours: 24,
          agentVotingMinutes: 0,
        });
      },

      // Принудительно установить текущее время для всех полей
      setCurrentTimeToAll: () => {
        const nowDt = getDefaultVotingDatetime();
        set({
          heroVotingStartTime: nowDt.time,
          heroVotingStartDate: nowDt.date,
          navigatorVotingStartTime: nowDt.time,
          navigatorVotingStartDate: nowDt.date,
          agentVotingStartTime: nowDt.time,
          agentVotingStartDate: nowDt.date,
        });
      },
    }),
    {
      name: 'team-storage',
      getStorage: () => localStorage,
    }
  )
);

export default useTeamStore;
