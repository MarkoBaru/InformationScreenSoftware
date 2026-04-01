export interface ScreenData {
  id: number
  name: string
  slug: string
  defaultContentType: 'None' | 'Video' | 'Slideshow' | 'Static'
  defaultContentData: string | null
  idleTimeoutSeconds: number
  slideshowIntervalSeconds: number
  isActive: boolean
  tiles: TileData[]
}

export interface TileData {
  id: number
  title: string
  description: string | null
  imageUrl: string | null
  linkUrl: string | null
  linkTarget: 'Embedded' | 'NewTab' | 'SameWindow'
  contentType: 'Link' | 'Video' | 'Pdf' | 'Article' | 'Schichtplan' | 'Stream' | 'FullscreenImage' | 'Folder'
  articleBody: string | null
  sortOrder: number
  isActive: boolean
  activeFrom: string | null
  activeTo: string | null
  newsFrom: string | null
  newsTo: string | null
  parentTileId: number | null
  categoryId: number | null
  categoryName: string | null
}

const API_BASE = '/api'

export interface AnnouncementData {
  id: number
  title: string
  message: string
}

export async function fetchScreen(slug: string): Promise<ScreenData> {
  const res = await fetch(`${API_BASE}/screens/${encodeURIComponent(slug)}`, {
    credentials: 'include'
  })
  if (!res.ok) throw new Error(`Screen "${slug}" not found`)
  return res.json()
}

export async function fetchAnnouncements(screenId: number): Promise<AnnouncementData[]> {
  const res = await fetch(`${API_BASE}/announcements/screen/${screenId}`, {
    credentials: 'include'
  })
  if (!res.ok) return []
  return res.json()
}

export async function fetchNewsTiles(screenId: number): Promise<TileData[]> {
  const res = await fetch(`${API_BASE}/tiles/news/screen/${screenId}`, {
    credentials: 'include'
  })
  if (!res.ok) return []
  return res.json()
}
