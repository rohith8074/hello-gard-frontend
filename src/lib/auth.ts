export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operator';
  status: 'pending' | 'active' | 'suspended';
}

const TOKEN_KEY = 'hg_token';
const USER_KEY = 'hg_user';

export const saveAuth = (token: string, user: AuthUser) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const getStoredUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAdmin = (user: AuthUser | null): boolean => user?.role === 'admin';
export const isOperator = (user: AuthUser | null): boolean => user?.role === 'operator';
export const isPending = (user: AuthUser | null): boolean => user?.status === 'pending';
