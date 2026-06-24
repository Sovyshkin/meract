export function getEmailNickname(email) {
  if (typeof email !== 'string') return '';
  const localPart = email.split('@')[0]?.trim();
  return localPart || '';
}

export function isEmailLike(value) {
  return typeof value === 'string' && value.includes('@');
}

export function getDisplayName(user, fallback = 'User') {
  if (!user) return fallback;

  const candidates = [
    user.username,
    user.nickname,
    user.login,
    user.name,
    user.fullName,
  ];

  const visibleName = candidates.find((value) => value && !isEmailLike(value));
  if (visibleName) return visibleName;

  const emailNickname = getEmailNickname(user.email || user.login || user.username);
  return emailNickname || fallback;
}

export function normalizeUserDisplay(user) {
  if (!user) return user;

  const login = user.login && !isEmailLike(user.login)
    ? user.login
    : getEmailNickname(user.email || user.login);

  return {
    ...user,
    login: login || user.login,
    username: user.username || login || undefined,
  };
}
