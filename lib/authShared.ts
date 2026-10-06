export const INTERNAL_AUTH_DOMAIN = 'pos.km108.local';

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return /^[a-z0-9._-]{3,50}$/.test(normalizeUsername(username));
}

export function usernameToInternalEmail(username: string) {
  return `${normalizeUsername(username)}@${INTERNAL_AUTH_DOMAIN}`;
}
