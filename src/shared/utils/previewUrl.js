const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');

export function buildPreviewUrl(previewFileName) {
  if (!previewFileName) return null;

  const raw = String(previewFileName).trim();
  if (!raw) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace('/api/uploads/', '/uploads/');
  }

  if (raw.startsWith('/api/uploads/')) {
    return `${API_BASE_URL}${raw.replace(/^\/api/, '')}`;
  }

  if (raw.startsWith('/uploads/')) {
    return `${API_BASE_URL}${raw}`;
  }

  if (raw.startsWith('uploads/')) {
    return `${API_BASE_URL}/${raw}`;
  }

  if (raw.startsWith('acts/')) {
    return `${API_BASE_URL}/uploads/${raw}`;
  }

  return `${API_BASE_URL}/uploads/acts/${raw.replace(/^\/+/, '')}`;
}
