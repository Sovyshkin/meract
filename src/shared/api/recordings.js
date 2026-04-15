import api from "./api";

export async function getActRecordings(actId, heroUserId) {
  const response = await api.get(`/agora-recording/recordings/act/${actId}`, {
    params: heroUserId ? { heroUserId } : undefined,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function stopHeroStreamRequest(actId, heroUserId) {
  const response = await api.post(`/act/${actId}/hero-streams/${heroUserId}/stop`);
  return response.data;
}
