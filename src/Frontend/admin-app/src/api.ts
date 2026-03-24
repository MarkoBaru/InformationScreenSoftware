const API = '/api/admin'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
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
  idleTimeoutSeconds: number; isActive: boolean;
  tiles: Tile[];
}

export interface Tile {
  id: number; title: string; description: string | null;
  imageUrl: string | null; linkUrl: string | null; linkTarget: string;
  contentType: string; articleBody: string | null;
  sortOrder: number; isActive: boolean;
  categoryId: number | null; categoryName: string | null;
}

export interface TileList extends Tile {
  assignedScreens: string[];
}

export interface Category {
  id: number; name: string; iconUrl: string | null; tileCount: number;
}

export interface MediaAsset {
  id: number; fileName: string; url: string;
  mimeType: string; fileSizeBytes: number; uploadedAt: string;
}

// Screen API
export const screensApi = {
  list: () => request<ScreenList[]>(`${API}/screens`),
  get: (id: number) => request<Screen>(`${API}/screens/${id}`),
  create: (data: { name: string; slug: string; defaultContentType: string; defaultContentData?: string; idleTimeoutSeconds: number }) =>
    request<Screen>(`${API}/screens`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; slug: string; defaultContentType: string; defaultContentData?: string; idleTimeoutSeconds: number; isActive: boolean }) =>
    request<Screen>(`${API}/screens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`${API}/screens/${id}`, { method: 'DELETE' }),
  updateTiles: (id: number, tiles: { tileId: number; sortOrderOverride?: number }[]) =>
    request<void>(`${API}/screens/${id}/tiles`, { method: 'PUT', body: JSON.stringify({ tiles }) }),
}

// Tile API
export const tilesApi = {
  list: () => request<TileList[]>(`${API}/tiles`),
  get: (id: number) => request<TileList>(`${API}/tiles/${id}`),
  create: (data: { title: string; description?: string; imageUrl?: string; linkUrl?: string; linkTarget: string; contentType: string; articleBody?: string; sortOrder: number; categoryId?: number; screenIds?: number[] }) =>
    request<TileList>(`${API}/tiles`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { title: string; description?: string; imageUrl?: string; linkUrl?: string; linkTarget: string; contentType: string; articleBody?: string; sortOrder: number; isActive: boolean; categoryId?: number; screenIds?: number[] }) =>
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
}

// Media API
export const mediaApi = {
  list: () => request<MediaAsset[]>(`${API}/media`),
  upload: async (file: File): Promise<MediaAsset> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API}/media/upload`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  delete: (id: number) => request<void>(`${API}/media/${id}`, { method: 'DELETE' }),
}
