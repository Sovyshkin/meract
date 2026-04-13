// shared/api/act.js
import api from "./api";

// Трансформируем команды для API
const transformTeamsForApi = (teams) => {
  if (!teams || !Array.isArray(teams)) return [];

  return teams.map(team => {
    const roles = [];

    // Обратная совместимость: если нет нового поля method — определяем по старым флагам
    const heroMethod = team.heroMethod || (team.isHeroRecruitmentOpen ? 'open_voting' : 'voting_candidates');
    const navigatorMethod = team.navigatorMethod || (team.isNavigatorRecruitmentOpen ? 'open_voting' : 'voting_candidates');
    const agentMethod = team.agentMethod || 'voting_candidates';

    // Герои
    if (heroMethod === 'open_voting') {
      roles.push({
        role: 'hero',
        openVoting: true,
        votingStartAt: `${team.heroVotingStartDate}T${team.heroVotingStartTime}:00`,
        votingDurationHours: Number(team.heroVotingHours) || 24,
      });
    } else if (heroMethod === 'fixed' && team.heroes?.length > 0) {
      roles.push({
        role: 'hero',
        openVoting: false,
        candidateUserIds: [team.heroes[0].id],
      });
    } else if (team.heroes?.length > 0) {
      roles.push({
        role: 'hero',
        openVoting: false,
        candidateUserIds: team.heroes.map(h => h.id),
      });
    }

    // Навигаторы
    if (navigatorMethod === 'open_voting') {
      roles.push({
        role: 'navigator',
        openVoting: true,
        votingStartAt: `${team.navigatorVotingStartDate}T${team.navigatorVotingStartTime}:00`,
        votingDurationHours: Number(team.navigatorVotingHours) || 24,
      });
    } else if (navigatorMethod === 'fixed' && team.navigators?.length > 0) {
      roles.push({
        role: 'navigator',
        openVoting: false,
        candidateUserIds: [team.navigators[0].id],
      });
    } else if (team.navigators?.length > 0) {
      roles.push({
        role: 'navigator',
        openVoting: false,
        candidateUserIds: team.navigators.map(n => n.id),
      });
    }

    // Спот-агенты
    if (agentMethod === 'open_voting') {
      roles.push({
        role: 'spot_agent',
        openVoting: true,
        votingStartAt: `${team.agentVotingStartDate}T${team.agentVotingStartTime}:00`,
        votingDurationHours: Number(team.agentVotingHours) || 24,
      });
    } else if (agentMethod === 'fixed' && team.agents?.length > 0) {
      roles.push({
        role: 'spot_agent',
        openVoting: false,
        candidateUserIds: [team.agents[0].id],
      });
    } else if (team.agents?.length > 0) {
      roles.push({
        role: 'spot_agent',
        openVoting: false,
        candidateUserIds: team.agents.map(a => a.id),
      });
    }

    return {
      name: team.name,
      roles,
      tasks: (team.tasks || []).map((task) => ({
        description: task.description,
        address: task.address || null,
        lat: task.lat ?? null,
        lng: task.lng ?? null,
      })),
    };
  });
};

export const actApi = {
  getAllActs: async () => {
    const response = await api.get("/act/get-acts");
    return response.data;
  },

  getAct: async (id) => {
    const response = await api.get(`/act/find-by-id/${id}`);
    return response.data;
  },

  // options: { sequelId?, tags?, scheduledAt?, chapterId? }
  createAct: async (name, desc, photoFile, teams = [], options = {}) => {
    const { sequelId, tags, scheduledAt, chapterId } = options;

    const formData = new FormData();
    formData.append("title", String(name || ""));
    formData.append("description", String(desc || ""));

    if (sequelId) formData.append("sequelId", String(sequelId));

    if (photoFile instanceof File) {
      formData.append("photo", photoFile);
    }

    const transformedTeams = transformTeamsForApi(teams);
    formData.append("teams", JSON.stringify(transformedTeams));

    const response = await api.post("/act/create-act", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const actId = response.data?.actId || response.data?.id;

    // После создания — PATCH для tags / chapterId / scheduledAt (JSON-body, не FormData)
    if (actId && (chapterId || scheduledAt || (tags && tags.length > 0))) {
      const patch = {};
      if (chapterId) patch.chapterId = Number(chapterId);
      if (scheduledAt) patch.scheduledAt = scheduledAt;
      if (tags && tags.length > 0) patch.tags = tags;
      await api.patch(`/act/${actId}`, patch);
    }

    return response.data;
  },

  getRole: async (id, type) => {
    if (!id || !type) return [];
    try {
      const response = await api.get(`/act/${id}/candidates/${type}`);
      return response.data;
    } catch {
      return [];
    }
  },

  startAct: async (id) => {
    const response = await api.post(`/act/start-act/${id}`);
    return response.data;
  },

  getHeroStreams: async (actId) => {
    const response = await api.get(`/act/${actId}/hero-streams`);
    return response.data;
  },

  startHeroStream: async (actId, heroUserId) => {
    const response = await api.post(`/act/${actId}/hero-streams/${heroUserId}/start`);
    return response.data;
  },

  stopHeroStream: async (actId, heroUserId) => {
    const response = await api.post(`/act/${actId}/hero-streams/${heroUserId}/stop`);
    return response.data;
  },

  getHeroStreamToken: async (actId, heroUserId, role, expiry = 3600) => {
    const response = await api.get(`/act/${actId}/hero-streams/${heroUserId}/token`, {
      params: { role, expiry },
    });
    return response.data;
  },

  voteTeamCandidate: async (actId, candidateId) => {
    const response = await api.post(`/act/${actId}/vote-team-candidate`, { candidateId });
    return response.data;
  },

  voteOpenCandidate: async (actId, candidateId) => {
    const response = await api.post(`/act/${actId}/vote-candidate`, { candidateId });
    return response.data;
  },

  applyForRole: async (actId, roleType) => {
    const response = await api.post(`/act/${actId}/apply-role`, { roleType });
    return response.data;
  },

  assignRole: async (actId, roleType, candidateId) => {
    const response = await api.post(`/act/${actId}/assign-role`, { roleType, candidateId });
    return response.data;
  },
};
