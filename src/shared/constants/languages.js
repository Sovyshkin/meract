export const LANGUAGES = [
  { value: 'English', label: '🇺🇸 English' },
  { value: 'Spanish', label: '🇪🇸 Spanish' },
  { value: 'French', label: '🇫🇷 French' },
  { value: 'German', label: '🇩🇪 German' },
  { value: 'Portuguese', label: '🇵🇹 Portuguese' },
  { value: 'Italian', label: '🇮🇹 Italian' },
  { value: 'Russian', label: '🇷🇺 Russian' },
  { value: 'Chinese (Simplified)', label: '🇨🇳 Chinese (Simplified)' },
  { value: 'Japanese', label: '🇯🇵 Japanese' },
  { value: 'Korean', label: '🇰🇷 Korean' },
  { value: 'Arabic', label: '🇸🇦 Arabic' },
  { value: 'Hindi', label: '🇮🇳 Hindi' },
];

export const COMMUNICATION_LANGUAGES = LANGUAGES.map((lang) => lang.value);

const LEGACY_LANGUAGE_ALIASES = {
  Español: 'Spanish',
  Français: 'French',
  Deutsch: 'German',
  Português: 'Portuguese',
  Italiano: 'Italian',
  Русский: 'Russian',
  中文: 'Chinese (Simplified)',
  日本語: 'Japanese',
  한국어: 'Korean',
  العربية: 'Arabic',
  हिन्दी: 'Hindi',
  'Bahasa Indonesia': 'English',
  Türkçe: 'English',
  Polski: 'English',
  Nederlands: 'English',
};

export function normalizeLanguage(value) {
  if (!value) return value;
  return LEGACY_LANGUAGE_ALIASES[value] || value;
}

export function getLanguageLabel(value) {
  const normalized = normalizeLanguage(value);
  return LANGUAGES.find((lang) => lang.value === normalized)?.label ?? value;
}
