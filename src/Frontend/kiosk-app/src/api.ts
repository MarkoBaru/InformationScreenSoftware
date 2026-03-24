export interface ScreenData {
  id: number
  name: string
  slug: string
  defaultContentType: 'None' | 'Video' | 'Slideshow' | 'Static'
  defaultContentData: string | null
  idleTimeoutSeconds: number
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
  contentType: 'Link' | 'Video' | 'Pdf' | 'Article'
  articleBody: string | null
  sortOrder: number
  isActive: boolean
  categoryId: number | null
  categoryName: string | null
}

const API_BASE = '/api'

export async function fetchScreen(slug: string): Promise<ScreenData> {
  const res = await fetch(`${API_BASE}/screens/${encodeURIComponent(slug)}`, {
    credentials: 'include'
  })
  if (!res.ok) throw new Error(`Screen "${slug}" not found`)
  return res.json()
}
