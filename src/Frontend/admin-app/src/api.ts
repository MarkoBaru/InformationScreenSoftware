const API = '/api/admin'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, {
    credentials: 'include',
    headers,
    ...options,
  })
  if (res.status === 401) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    window.location.href = '/login'
    throw new Error('Nicht autorisiert')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Types
export interface ScreenList {
  id: number; name: string; slug: string;
  defaultContentType: string; idleTimeoutSeconds: number;
  isActive: boolean; tileCount: number;
}

export interface Screen {
  id: number; name: string; slug: string;
  defaultContentType: string; defaultContentData: string | null;
  idleTimeoutSeconds: number; slideshowIntervalSeconds: number; isActive: boolean;
  tiles: Tile[];
}

export interface Tile {
  id: number; title: string; description: string | null;
  imageUrl: string | null; linkUrl: string | null; linkTarget: string;
  contentType: string; articleBody: string | null;
  sortOrder: number; isActive: boolean;
  activeFrom: string | null; activeTo: string | null;
  newsFrom: string | null; newsTo: string | null;
  parentTileId: number | null;
  categoryId: number | null; categoryName: string | null;
}

export interface TileList extends Tile {
  assignedScreens: string[];
}

export interface Category {
  id: number; name: string; iconUrl: string | null; tileCount: number; sortOrder: number;
}

export interface MediaAsset {
  id: number; fileName: string; url: string;
  mimeType: string; fileSizeBytes: number; uploadedAt: string;
}

// Screen API
export const screensApi = {
  list: () => request<ScreenList[]>(`${API}/screens`),
  get: (id: number) => request<Screen>(`${API}/screens/${id}`),
  create: (data: { name: string; slug: string; defaultContentType: string; defaultContentData?: string; idleTimeoutSeconds: number; slideshowIntervalSeconds?: number }) =>
    request<Screen>(`${API}/screens`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; slug: string; defaultContentType: string; defaultContentData?: string; idleTimeoutSeconds: number; slideshowIntervalSeconds?: number; isActive: boolean }) =>
    request<Screen>(`${API}/screens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`${API}/screens/${id}`, { method: 'DELETE' }),
  updateTiles: (id: number, tiles: { tileId: number; sortOrderOverride?: number }[]) =>
    request<void>(`${API}/screens/${id}/tiles`, { method: 'PUT', body: JSON.stringify({ tiles }) }),
}

// Tile API
export const tilesApi = {
  list: () => request<TileList[]>(`${API}/tiles`),
  get: (id: number) => request<TileList>(`${API}/tiles/${id}`),
  create: (data: { title: string; description?: string; imageUrl?: string; linkUrl?: string; linkTarget: string; contentType: string; articleBody?: string; sortOrder: number; activeFrom?: string; activeTo?: string; newsFrom?: string; newsTo?: string; parentTileId?: number; categoryId?: number; screenIds?: number[] }) =>
    request<TileList>(`${API}/tiles`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { title: string; description?: string; imageUrl?: string; linkUrl?: string; linkTarget: string; contentType: string; articleBody?: string; sortOrder: number; isActive: boolean; activeFrom?: string; activeTo?: string; newsFrom?: string; newsTo?: string; parentTileId?: number; categoryId?: number; screenIds?: number[] }) =>
    request<TileList>(`${API}/tiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`${API}/tiles/${id}`, { method: 'DELETE' }),
}

// Category API
export const categoriesApi = {
  list: () => request<Category[]>(`${API}/categories`),
  create: (data: { name: string; iconUrl?: string }) =>
    request<Category>(`${API}/categories`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; iconUrl?: string }) =>
    request<Category>(`${API}/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`${API}/categories/${id}`, { method: 'DELETE' }),
  reorder: (categoryIds: number[]) =>
    request<void>(`${API}/categories/reorder`, { method: 'PUT', body: JSON.stringify({ categoryIds }) }),
}

// Media API
export const mediaApi = {
  list: () => request<MediaAsset[]>(`${API}/media`),
  upload: async (file: File): Promise<MediaAsset> => {
    const form = new FormData()
    form.append('file', file)
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API}/media/upload`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: form,
    })
    if (res.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
      throw new Error('Nicht autorisiert')
    }
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  delete: (id: number) => request<void>(`${API}/media/${id}`, { method: 'DELETE' }),
}

// Auth API
export interface User {
  id: number; username: string; displayName: string;
  role: 'User' | 'Admin'; isActive: boolean; createdAt: string;
}

export interface LoginResponse {
  token: string; user: User;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.message || 'Login fehlgeschlagen')
    }
    return res.json()
  },
  me: () => request<User>('/api/auth/me'),
}

// Users API (Admin only)
export const usersApi = {
  list: () => request<User[]>(`${API}/users`),
  get: (id: number) => request<User>(`${API}/users/${id}`),
  create: (data: { username: string; password: string; displayName: string; role: string }) =>
    request<User>(`${API}/users`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { displayName: string; role: string; isActive: boolean; password?: string }) =>
    request<User>(`${API}/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`${API}/users/${id}`, { method: 'DELETE' }),
}

// Settings API
export const settingsApi = {
  get: () => request<Record<string, string>>('/api/settings'),
  update: (settings: Record<string, string>) =>
    request<Record<string, string>>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
}

// Announcement types
export interface Announcement {
  id: number; title: string; message: string; isActive: boolean;
  activeFrom: string | null; activeTo: string | null;
  excludedScreenIds: number[];
  createdAt: string;
}

// Announcement API
export const announcementsApi = {
  list: () => request<Announcement[]>(`${API}/announcements`),
  get: (id: number) => request<Announcement>(`${API}/announcements/${id}`),
  create: (data: { title: string; message: string; activeFrom?: string; activeTo?: string; excludedScreenIds?: number[] }) =>
    request<Announcement>(`${API}/announcements`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { title: string; message: string; isActive: boolean; activeFrom?: string; activeTo?: string; excludedScreenIds?: number[] }) =>
    request<Announcement>(`${API}/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`${API}/announcements/${id}`, { method: 'DELETE' }),
}
